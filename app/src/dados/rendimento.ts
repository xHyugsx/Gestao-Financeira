// Rendimento do mês X = salários do mês X−1 (regra de negócio da app).
import { anoMes, diaDeVencimento, inicioDoMes } from './datas';
import type { Dados } from './esquema';

const SALARIO = /salario|vencimento|ordenado/;

function textoSemAcentos(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Salários recebidos no mês de `data`: soma da tabela de salários; se der zero, soma as receitas
 * desse mês cujo título ou categoria indicam salário/vencimento/ordenado.
 */
export function salariosDoMes(dados: Pick<Dados, 'salaries' | 'transactions'>, data: Date): number {
  const ano = dados.salaries[String(data.getFullYear())];
  const tabela = ano
    ? Object.values(ano).reduce((s, meses) => s + ((Array.isArray(meses) && meses[data.getMonth()]) || 0), 0)
    : 0;
  if (tabela) return tabela;
  const mes = anoMes(data);
  return dados.transactions
    .filter((m) => m.date.startsWith(mes) && m.movementType === 'income' && SALARIO.test(textoSemAcentos(`${m.title} ${m.detail}`)))
    .reduce((s, m) => s + m.amount, 0);
}

export interface Rendimento {
  valor: number;
  /** Rendimento do mês anterior (salários de X−2). */
  anterior: number;
  /** Variação percentual; `null` quando o mês anterior é zero. */
  variacao: number | null;
}

/** Rendimento do mês selecionado (qualquer dia desse mês). */
export function rendimentoDoMes(dados: Pick<Dados, 'salaries' | 'transactions'>, mes: Date): Rendimento {
  const valor = salariosDoMes(dados, inicioDoMes(mes, -1));
  const anterior = salariosDoMes(dados, inicioDoMes(mes, -2));
  return { valor, anterior, variacao: anterior ? ((valor - anterior) / anterior) * 100 : null };
}

/**
 * Mês do rendimento que a Principal mostra (v2.37.0): o mês escolhido, exceto no mês atual a partir do dia do ordenado
 * (3.º dia útil a contar do fim do mês), em que já mostra o do mês seguinte — se os salários deste mês já estiverem registados.
 */
export function mesDoRendimento(dados: Pick<Dados, 'salaries' | 'transactions'>, mes: Date, hoje: Date): Date {
  if (anoMes(mes) !== anoMes(hoje)) return mes;
  const vencimento = diaDeVencimento(mes);
  if (vencimento == null || hoje.getDate() < vencimento || !salariosDoMes(dados, mes)) return mes;
  return inicioDoMes(mes, 1);
}
