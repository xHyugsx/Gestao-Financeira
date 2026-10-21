// Movimentos recorrentes com periodicidade: a app cria sozinha a cópia seguinte quando chega a data.
// Campos novos (só na app nova): `recurringEvery` (meses) e `recurringDone` (a cópia seguinte já foi criada).
// Valor variável (`recurring: "sem"`): cada cópia nasce sem valor (não mexe no saldo) até se confirmar o valor do mês.
import { dia, type Movimento } from '../dados';
import { simplificar } from './categorias';
import { diaEMes } from './regras';

export const PERIODICIDADES = [
  { meses: 1, rotulo: 'Mensal' }, { meses: 2, rotulo: 'Bimestral' }, { meses: 3, rotulo: 'Trimestral' }, { meses: 12, rotulo: 'Anual' },
] as const;

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

const repete = (m: Movimento) => !!m.recurring && typeof m.recurringEvery === 'number' && m.recurringEvery > 0 && !m.recurringDone;

/**
 * Cria as cópias em falta até `hoje` (inclusive). Devolve a lista nova, ou `null` se não houver nada a criar.
 * Cada cópia continua a série; a anterior fica marcada como feita, por isso apagar ou desmarcar a última pára a série.
 */
export function gerarRecorrentes(movimentos: Movimento[], hoje: Date, novoId: () => number | string = (() => { let n = Date.now(); return () => n++; })()): Movimento[] | null {
  const limite = dia(hoje);
  let lista = movimentos, criados = 0;
  for (let procurar = true; procurar;) {
    procurar = false;
    for (const m of lista) {
      if (!repete(m) || !m.date) continue;
      const data = somarMeses(m.date, m.recurringEvery as number);
      if (data > limite) continue;
      const copia: Movimento = { ...m, id: novoId(), date: data, detail: detalheCom(m.detail, data) };
      delete copia.recurringDone; delete copia.importKey; delete copia.importBatch; delete copia.mergeBatch;
      if (m.recurring === 'sem') { copia.amount = 0; if (m.revolut) copia.transferValue = 0; }
      lista = [copia, ...lista.map((x) => (x === m ? { ...x, recurringDone: true } : x))];
      criados++;
      procurar = true;
      break;
    }
  }
  return criados ? lista : null;
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
    .filter((x) => x.id !== m.id && x.recurring && (x.movementType === 'expense' || x.revolut) && valorRecorrente(x) > 0
      && (x.date || '') <= (m.date || '9999') && serieDe(x) === k)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map(valorRecorrente);
}

/**
 * Mudar o tipo de valor (fixo/variável) num movimento de uma série aplica-se também ao movimento que cria as cópias
 * seguintes (o mais recente da série); sem isso, mudar num movimento antigo não teria efeito.
 */
export function tipoNaSerie(lista: Movimento[], antes: Movimento | undefined, depois: Movimento): Movimento[] {
  const variavel = (m: Movimento) => m.recurring === 'sem';
  if (!antes || !depois.recurring || variavel(antes) === variavel(depois)) return lista;
  const k = serieDe(antes);
  return lista.map((x) => (x.id !== depois.id && repete(x) && serieDe(x) === k ? { ...x, recurring: depois.recurring } : x));
}

/**
 * Cópias que a app ainda vai criar depois de hoje e até `ate` ("AAAA-MM-DD", inclusive), para a previsão do saldo
 * dos meses futuros. Seguem a mesma cadeia de datas das cópias reais; nos de valor variável usam a estimativa.
 */
export function recorrentesPrevistos(movimentos: Movimento[], hoje: Date, ate: string): Movimento[] {
  const desde = dia(hoje), previstos: Movimento[] = [];
  for (const g of movimentos) {
    if (!repete(g) || !g.date) continue;
    const valor = g.recurring === 'sem' ? estimativa([...valoresDaSerie(movimentos, g), valorRecorrente(g)]) : valorRecorrente(g);
    if (!valor) continue;
    for (let d = somarMeses(g.date, g.recurringEvery!); d <= ate; d = somarMeses(d, g.recurringEvery!)) {
      if (d <= desde) continue;
      const efeito = g.revolut ? { transferValue: valor } : g.movementType === 'transfer' ? {} : { amount: g.movementType === 'income' ? valor : -valor };
      previstos.push({ ...g, ...efeito, id: `previsto-${g.id}-${d}`, date: d, detail: detalheCom(g.detail, d), recurringDone: true });
    }
  }
  return previstos;
}

/** Estimativa de um valor variável: média dos últimos 3 valores (0 se ainda não houver nenhum). */
export function estimativa(valores: number[]): number {
  const u = valores.filter((v) => v > 0).slice(-3);
  return u.length ? Math.round((u.reduce((s, v) => s + v, 0) / u.length) * 100) / 100 : 0;
}
