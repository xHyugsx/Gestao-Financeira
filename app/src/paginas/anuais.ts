// Despesas anuais (Resumo › Despesas anuais): lista de planeamento à parte dos movimentos (`annualExpenses`).
// Só contam as dos próximos 12 meses; quando o mês chega ficam «por pagar» e, ao registar o pagamento (ou renovar),
// passam para o ano seguinte. Entram na previsão dos gastos dos meses futuros enquanto não forem pagas.
// Valor variável (`variable: true`, v2.38.0): todos os anos aparece «Valor a definir», com a estimativa do último pagamento.
import { anoMes, dia, type Movimento } from '../dados';
import { simplificar } from '../movimentos/categorias';
import { porConfirmar } from '../movimentos/recorrentes';
import { categoriaSugerida } from '../movimentos/sugestoes';
import { diaEMes, tipoVisual } from '../movimentos/regras';

/** Despesa anual prevista (formato guardado em `annualExpenses`); `value` é a estimativa nas de valor variável (pode ser 0). */
export interface DespesaAnual { id: number; name: string; value: number; month: number; year: number; variable?: boolean }

export type EstadoAnual = 'prevista' | 'por pagar' | 'em atraso';

const mesDe = (e: DespesaAnual) => `${e.year}-${String(e.month).padStart(2, '0')}`;
const somarMesesAM = (am: string, n: number) => anoMes(new Date(Number(am.slice(0, 4)), Number(am.slice(5, 7)) - 1 + n, 1));

/** Só as entradas com nome, valor (ou valor variável), mês e ano válidos (os dados vêm do telemóvel). */
export function despesasAnuais(lista: unknown[]): DespesaAnual[] {
  return (lista as DespesaAnual[]).filter((e) => e && typeof e.name === 'string' && (Number(e.value) > 0 || (e.variable === true && Number(e.value) >= 0))
    && e.month >= 1 && e.month <= 12 && e.year > 0);
}

const chaveTitulo = (t: string) => simplificar(t).replace(/\s+/g, ' ').trim();

/**
 * Valor a usar nas contas: o guardado; nas de valor variável, o do último pagamento com o mesmo título (se houver), para
 * a estimativa acompanhar o que se pagou de facto.
 */
export function valorAnual(e: DespesaAnual, movimentos: Movimento[] = []): number {
  if (!e.variable) return e.value;
  const k = chaveTitulo(e.name);
  const ultimo = movimentos.filter((m) => m.movementType === 'expense' && !m.skipped && !porConfirmar(m) && !!m.amount && chaveTitulo(m.title) === k
    && !(m.recurring && (m.recurringEvery ?? 0) > 0 && (m.recurringEvery ?? 0) < 12))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  return ultimo ? Math.abs(ultimo.amount) : Math.max(0, Number(e.value) || 0);
}

/** Este mês: por pagar; meses anteriores: em atraso; depois: prevista. */
export function estadoAnual(e: DespesaAnual, hoje: Date): EstadoAnual {
  const m = mesDe(e), atual = anoMes(hoje);
  return m === atual ? 'por pagar' : m < atual ? 'em atraso' : 'prevista';
}

/** Total das despesas dos próximos 12 meses (este mês incluído); as em atraso e as mais distantes não contam. */
export function totalProximos12(lista: DespesaAnual[], hoje: Date, movimentos: Movimento[] = []): number {
  const de = anoMes(hoje), ate = somarMesesAM(de, 11);
  return lista.filter((e) => mesDe(e) >= de && mesDe(e) <= ate).reduce((s, e) => s + valorAnual(e, movimentos), 0);
}

/** A mesma despesa no ano seguinte (ou no primeiro ano em que ainda não passou). */
export function renovar(e: DespesaAnual, hoje: Date): DespesaAnual {
  let year = e.year + 1;
  while (`${year}-${String(e.month).padStart(2, '0')}` < anoMes(hoje)) year++;
  return { ...e, year };
}

/**
 * Despesas anuais pagas «por fora» (registadas pelo «+» ou importadas): uma despesa com o mesmo título entre o mês
 * anterior ao previsto e hoje conta como pagamento e passa a despesa para o ano seguinte. Devolve a lista nova, ou `null`.
 * Para não confundir com uma despesa mensal com o mesmo nome: não conta um recorrente com periodicidade inferior a um
 * ano, nem um valor fora de metade a dobro do previsto (nas de valor variável, qualquer valor serve).
 */
export function renovarPagas(lista: unknown[], movimentos: Movimento[], hoje: Date): unknown[] | null {
  const hojeDia = dia(hoje);
  let mudou = false;
  const nova = lista.map((x) => {
    const [e] = despesasAnuais([x]);
    if (!e) return x;
    const desde = `${anoMes(new Date(e.year, e.month - 2, 1))}-01`, k = chaveTitulo(e.name);
    if (desde > hojeDia) return x;
    const paga = movimentos.some((m) => m.movementType === 'expense' && !m.skipped && !porConfirmar(m) && !!m.date && m.date >= desde && m.date <= hojeDia
      && chaveTitulo(m.title) === k && !(m.recurring && (m.recurringEvery ?? 0) > 0 && (m.recurringEvery ?? 0) < 12)
      && (e.variable ? !!m.amount : Math.abs(m.amount) >= e.value / 2 && Math.abs(m.amount) <= e.value * 2));
    if (!paga) return x;
    mudou = true;
    return renovar(e, hoje);
  });
  return mudou ? nova : null;
}

/** Movimento do pagamento (hoje, com a categoria usada da última vez para o mesmo título), para abrir e acertar. */
export function movimentoDoPagamento(e: DespesaAnual, movimentos: Movimento[], hoje: Date, id: number): Movimento {
  const data = dia(hoje), categoria = categoriaSugerida(movimentos, e.name, 'expense') || 'Outros';
  return {
    id, title: e.name.trim(), detail: `${diaEMes(data)} · ${categoria}`, amount: -valorAnual(e, movimentos), kind: tipoVisual('expense', categoria),
    movementType: 'expense', date: data, affectsBalance: true,
  };
}

/**
 * Despesas anuais por pagar entre este mês e `ate` ("AAAA-MM-DD"), como movimentos previstos para a previsão dos gastos
 * dos meses futuros. As em atraso ficam de fora (podem já ter sido pagas sem registo); as variáveis sem estimativa também.
 */
export function anuaisPrevistas(lista: DespesaAnual[], hoje: Date, ate: string, movimentos: Movimento[] = []): Movimento[] {
  const de = anoMes(hoje), limite = ate.slice(0, 7);
  return lista.filter((e) => mesDe(e) >= de && mesDe(e) <= limite && valorAnual(e, movimentos) > 0).map((e) => {
    const data = `${mesDe(e)}-01`;
    return { id: `anual-${e.id}`, title: e.name.trim(), detail: `${diaEMes(data)} · Despesas anuais`, amount: -valorAnual(e, movimentos), date: data, movementType: 'expense' };
  });
}
