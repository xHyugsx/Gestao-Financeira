// Movimentos recorrentes com periodicidade: a app cria sozinha a cópia seguinte quando chega a data.
// Campos novos (só na app nova): `recurringEvery` (meses) e `recurringDone` (a cópia seguinte já foi criada).
// Valor variável (`recurring: "sem"`): cada cópia nasce sem valor (não mexe no saldo) até se confirmar o valor do mês.
import { anoMes, dia, diaDeVencimento, type Movimento } from '../dados';
import { simplificar } from './categorias';
import { diaEMes } from './regras';

export const PERIODICIDADES = [
  { meses: 1, rotulo: 'Mensal' }, { meses: 2, rotulo: 'Bimestral' }, { meses: 3, rotulo: 'Trimestral' }, { meses: 12, rotulo: 'Anual' },
] as const;

/** Opção de periodicidade «dia do salário» (valor guardado em `recurringDay`). */
export const DIA_DO_SALARIO = { valor: 'salario', rotulo: 'Mensal · dia do salário' } as const;

/** Mesma data `meses` depois (dia limitado ao último dia do mês: 31 jan + 1 mês = 28/29 fev). */
export function somarMeses(data: string, meses: number): string {
  const [a, m, d] = data.split('-').map(Number) as [number, number, number];
  const alvo = new Date(a, m - 1 + meses, 1);
  alvo.setDate(Math.min(d, new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()));
  return dia(alvo);
}

/** Descrição com a data nova e o resto igual ("12 setembro · Habitação" → "12 outubro · Habitação"). */
function detalheCom(detail: string, data: string): string {
  const i = detail.indexOf(' · ');
  return i < 0 ? detail : `${diaEMes(data)}${detail.slice(i)}`;
}

/** Data da cópia seguinte: `meses` depois, no mesmo dia, ou no dia do salário desse mês (`recurringDay: "salario"`). */
export function dataSeguinte(m: Movimento, data: string, meses: number): string {
  if (m.recurringDay !== DIA_DO_SALARIO.valor) return somarMeses(data, meses);
  const alvo = new Date(Number(data.slice(0, 4)), Number(data.slice(5, 7)) - 1 + meses, 1);
  return `${anoMes(alvo)}-${String(diaDeVencimento(alvo) ?? 1).padStart(2, '0')}`;
}

const repete = (m: Movimento) => !!m.recurring && typeof m.recurringEvery === 'number' && m.recurringEvery > 0 && !m.recurringDone;

/**
 * Movimento da mesma série já registado no mês de `data` (à mão ou agendado) e que conta no saldo: dispensa a cópia
 * automática, que ficaria a dobrar.
 */
function jaRegistado(lista: Movimento[], m: Movimento, data: string): Movimento | undefined {
  const k = serieDe(m), mes = data.slice(0, 7);
  return lista.find((x) => x.id !== m.id && !x.recurringDone && x.affectsBalance !== false && x.movementType === m.movementType
    && !!x.date && x.date.startsWith(mes) && serieDe(x) === k);
}

/**
 * Cria as cópias em falta até `hoje` (inclusive). Devolve a lista nova, ou `null` se não houver nada a mudar.
 * Cada cópia continua a série; a anterior fica marcada como feita, por isso apagar ou desmarcar a última pára a série.
 * Se nesse mês já houver um movimento da mesma série (registado à mão ou agendado), não cria a cópia: esse movimento
 * passa a ser o que cria a seguinte.
 */
export function gerarRecorrentes(movimentos: Movimento[], hoje: Date, novoId: () => number | string = (() => { let n = Date.now(); return () => n++; })()): Movimento[] | null {
  const limite = dia(hoje);
  let lista = movimentos, criados = 0;
  for (let procurar = true; procurar;) {
    procurar = false;
    for (const m of lista) {
      if (!repete(m) || !m.date) continue;
      const data = dataSeguinte(m, m.date, m.recurringEvery as number);
      if (data > limite) continue;
      const existente = jaRegistado(lista, m, data);
      if (existente) {
        lista = lista.map((x) => (x === m ? { ...x, recurringDone: true }
          : x === existente ? { ...x, recurring: x.recurring || m.recurring, recurringEvery: x.recurringEvery || m.recurringEvery } : x));
        criados++;
        procurar = true;
        break;
      }
      const copia: Movimento = { ...m, id: novoId(), date: data, detail: detalheCom(m.detail, data) };
      delete copia.recurringDone; delete copia.skipped; delete copia.importKey; delete copia.importBatch; delete copia.mergeBatch;
      if (m.recurring === 'sem') { copia.amount = 0; if (m.revolut) copia.transferValue = 0; }
      lista = [copia, ...lista.map((x) => (x === m ? { ...x, recurringDone: true } : x))];
      criados++;
      procurar = true;
      break;
    }
  }
  return criados ? lista : null;
}

/** É o movimento que cria a cópia seguinte da série (apagá-lo pára a série). */
export const criaCopias = repete;

/**
 * «Só este mês»: a cópia fica marcada como saltada em vez de apagada. Continua a ser ela a criar a cópia seguinte,
 * mas desaparece das listas, dos totais e dos saldos.
 */
export const saltarEsteMes = (lista: Movimento[], m: Movimento) => lista.map((x) => (x.id === m.id ? { ...x, skipped: true } : x));

/** Repor um mês saltado: a cópia volta a contar nas listas, nos totais e no saldo. */
export const reporMes = (lista: Movimento[], m: Movimento) => lista.map((x) => {
  if (x.id !== m.id) return x;
  const { skipped: _saltado, ...resto } = x;
  return resto;
});

/** Os dados sem as cópias saltadas (o que as páginas mostram e contam); devolve o mesmo objeto se não houver nenhuma. */
export function semSaltados<T extends { transactions: Movimento[] }>(e: T): T {
  return e.transactions.some((m) => m.skipped) ? { ...e, transactions: e.transactions.filter((m) => !m.skipped) } : e;
}

/** Valor de um recorrente (nas transferências para a Revolut, o valor transferido). */
export const valorRecorrente = (m: Movimento) => (m.revolut ? m.transferValue || 0 : Math.abs(m.amount));

/** Recorrente de valor variável à espera do valor do mês. */
export const porConfirmar = (m: Movimento) => m.recurring === 'sem' && !m.amount && !m.transferValue;

/** Série de um recorrente: o mesmo título (simplificado), separando despesas e transferências para a Revolut. */
export const serieDe = (m: Movimento) => `${m.revolut ? 'r' : 'e'}|${simplificar(m.title).replace(/\s+/g, ' ').trim()}`;

/** Valores já definidos dos outros movimentos da série de `m` até à data dele, do mais antigo para o mais recente. */
export function valoresDaSerie(movimentos: Movimento[], m: Movimento): number[] {
  const k = serieDe(m);
  return movimentos
    .filter((x) => x.id !== m.id && x.recurring && !x.skipped && (x.movementType || '') === (m.movementType || '') && valorRecorrente(x) > 0
      && (x.date || '') <= (m.date || '9999') && serieDe(x) === k)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map(valorRecorrente);
}

/**
 * Mudar o tipo de valor (fixo/variável) ou a periodicidade num movimento de uma série aplica-se também ao movimento que
 * cria as cópias seguintes (o mais recente da série); sem isso, mudar num movimento antigo não teria efeito.
 * Desmarcar «Recorrente» num movimento antigo só o tira da série (para parar a série, usa-se o mais recente).
 */
export function recorrenciaNaSerie(lista: Movimento[], antes: Movimento | undefined, depois: Movimento): Movimento[] {
  if (!antes || !depois.recurring) return lista;
  const variavel = (m: Movimento) => m.recurring === 'sem';
  const mudaTipo = variavel(antes) !== variavel(depois);
  const mudaCada = (antes.recurringEvery || 0) !== (depois.recurringEvery || 0) || (antes.recurringDay || '') !== (depois.recurringDay || '');
  if (!mudaTipo && !mudaCada) return lista;
  const k = serieDe(antes);
  return lista.map((x) => (x.id === depois.id || !repete(x) || serieDe(x) !== k ? x
    : { ...x, ...(mudaTipo ? { recurring: depois.recurring } : {}), ...(mudaCada ? { recurringEvery: depois.recurringEvery, recurringDay: depois.recurringDay } : {}) }));
}

/**
 * Cópias que a app ainda vai criar depois de hoje e até `ate` ("AAAA-MM-DD", inclusive), para a previsão do saldo
 * dos meses futuros. Seguem a mesma cadeia de datas das cópias reais; nos de valor variável usam a estimativa.
 */
export function recorrentesPrevistos(movimentos: Movimento[], hoje: Date, ate: string): Movimento[] {
  const desde = dia(hoje), previstos: Movimento[] = [];
  for (const g of movimentos) {
    if (!repete(g) || !g.date) continue;
    const valor = g.recurring === 'sem' ? estimativa([...valoresDaSerie(movimentos, g), g.skipped ? 0 : valorRecorrente(g)]) : valorRecorrente(g);
    if (!valor) continue;
    for (let d = dataSeguinte(g, g.date, g.recurringEvery!); d <= ate; d = dataSeguinte(g, d, g.recurringEvery!)) {
      // Já registado (à mão ou agendado) nesse mês: conta pelo movimento, não pela previsão
      if (d <= desde || jaRegistado(movimentos, g, d)) continue;
      const efeito = g.revolut ? { transferValue: valor } : g.movementType === 'transfer' ? {} : { amount: g.movementType === 'income' ? valor : -valor };
      previstos.push({ ...g, ...efeito, id: `previsto-${g.id}-${d}`, date: d, detail: detalheCom(g.detail, d), recurringDone: true });
    }
  }
  return previstos;
}

/**
 * Cópia de uma série já existente no mês de um movimento novo (com efeito no saldo): registá-lo à mão deixava-o a
 * dobrar, ou a cópia por confirmar ficava esquecida.
 */
export function copiaNoMes(lista: Movimento[], novo: Movimento): Movimento | undefined {
  const mes = novo.date?.slice(0, 7), k = serieDe(novo);
  if (!mes) return undefined;
  return lista.find((x) => x.id !== novo.id && x.recurring && !x.skipped && x.affectsBalance !== false && x.movementType === novo.movementType
    && !!x.date && x.date.startsWith(mes) && serieDe(x) === k);
}

/** O que se escreveu no movimento novo passa para a cópia que já existia (que continua na série). */
export function preencherCopia(copia: Movimento, novo: Movimento): Movimento {
  return {
    ...copia, amount: novo.amount, ...(novo.revolut ? { transferValue: novo.transferValue } : {}), date: novo.date, detail: novo.detail, kind: novo.kind,
    account: novo.account, person: novo.person, note: novo.note ?? copia.note, affectsBalance: novo.affectsBalance,
  };
}

/**
 * Receita do salário (periodicidade «dia do salário») com valor novo ou alterado: o valor a pôr na tabela de Salários
 * desse mês, para o «Rendimento mensal» acompanhar. A pessoa vem do nome no título (com uma só pessoa, é essa).
 */
export function salarioDaReceita(antes: Movimento | undefined, depois: Movimento, pessoas: string[]): { ano: string; pessoa: string; mes: number; valor: number } | null {
  if (depois.movementType !== 'income' || depois.recurringDay !== DIA_DO_SALARIO.valor || !(depois.amount > 0) || !depois.date) return null;
  if (antes && antes.amount === depois.amount && antes.date === depois.date) return null;
  const t = simplificar(depois.title), pessoa = pessoas.find((p) => p && t.includes(simplificar(p))) ?? (pessoas.length === 1 ? pessoas[0] : undefined);
  return pessoa ? { ano: depois.date.slice(0, 4), pessoa, mes: Number(depois.date.slice(5, 7)) - 1, valor: depois.amount } : null;
}

/** Estimativa de um valor variável: média dos últimos 3 valores (0 se ainda não houver nenhum). */
export function estimativa(valores: number[]): number {
  const u = valores.filter((v) => v > 0).slice(-3);
  return u.length ? Math.round((u.reduce((s, v) => s + v, 0) / u.length) * 100) / 100 : 0;
}
