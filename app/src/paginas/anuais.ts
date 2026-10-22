// Despesas anuais (Resumo › Despesas anuais): lista de planeamento à parte dos movimentos (`annualExpenses`).
// Só contam as dos próximos 12 meses; quando o mês chega ficam «por pagar» e, ao registar o pagamento (ou renovar),
// passam para o ano seguinte. Entram na previsão do saldo dos meses futuros enquanto não forem pagas.
import { anoMes, dia, type Movimento } from '../dados';
import { categoriaSugerida } from '../movimentos/sugestoes';
import { diaEMes, tipoVisual } from '../movimentos/regras';

/** Despesa anual prevista (formato guardado em `annualExpenses`). */
export interface DespesaAnual { id: number; name: string; value: number; month: number; year: number }

export type EstadoAnual = 'prevista' | 'por pagar' | 'em atraso';

const mesDe = (e: DespesaAnual) => `${e.year}-${String(e.month).padStart(2, '0')}`;
const somarMesesAM = (am: string, n: number) => anoMes(new Date(Number(am.slice(0, 4)), Number(am.slice(5, 7)) - 1 + n, 1));

/** Só as entradas com nome, valor, mês e ano válidos (os dados vêm do telemóvel). */
export function despesasAnuais(lista: unknown[]): DespesaAnual[] {
  return (lista as DespesaAnual[]).filter((e) => e && typeof e.name === 'string' && Number(e.value) > 0 && e.month >= 1 && e.month <= 12 && e.year > 0);
}

/** Este mês: por pagar; meses anteriores: em atraso; depois: prevista. */
export function estadoAnual(e: DespesaAnual, hoje: Date): EstadoAnual {
  const m = mesDe(e), atual = anoMes(hoje);
  return m === atual ? 'por pagar' : m < atual ? 'em atraso' : 'prevista';
}

/** Total das despesas dos próximos 12 meses (este mês incluído); as em atraso e as mais distantes não contam. */
export function totalProximos12(lista: DespesaAnual[], hoje: Date): number {
  const de = anoMes(hoje), ate = somarMesesAM(de, 11);
  return lista.filter((e) => mesDe(e) >= de && mesDe(e) <= ate).reduce((s, e) => s + e.value, 0);
}

/** A mesma despesa no ano seguinte (ou no primeiro ano em que ainda não passou). */
export function renovar(e: DespesaAnual, hoje: Date): DespesaAnual {
  let year = e.year + 1;
  while (`${year}-${String(e.month).padStart(2, '0')}` < anoMes(hoje)) year++;
  return { ...e, year };
}

/** Movimento do pagamento (hoje, com a categoria usada da última vez para o mesmo título), para abrir e acertar. */
export function movimentoDoPagamento(e: DespesaAnual, movimentos: Movimento[], hoje: Date, id: number): Movimento {
  const data = dia(hoje), categoria = categoriaSugerida(movimentos, e.name, 'expense') || 'Outros';
  return {
    id, title: e.name.trim(), detail: `${diaEMes(data)} · ${categoria}`, amount: -Math.abs(e.value), kind: tipoVisual('expense', categoria),
    movementType: 'expense', date: data, affectsBalance: true,
  };
}

/**
 * Despesas anuais por pagar entre este mês e `ate` ("AAAA-MM-DD"), como movimentos previstos para a previsão do saldo
 * dos meses futuros. As em atraso ficam de fora (podem já ter sido pagas sem registo).
 */
export function anuaisPrevistas(lista: DespesaAnual[], hoje: Date, ate: string): Movimento[] {
  const de = anoMes(hoje), limite = ate.slice(0, 7);
  return lista.filter((e) => mesDe(e) >= de && mesDe(e) <= limite).map((e) => {
    const data = `${mesDe(e)}-01`;
    return { id: `anual-${e.id}`, title: e.name.trim(), detail: `${diaEMes(data)} · Despesas anuais`, amount: -Math.abs(e.value), date: data, movementType: 'expense' };
  });
}
