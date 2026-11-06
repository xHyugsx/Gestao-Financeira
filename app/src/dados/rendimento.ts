// Rendimento do mês X = salários do mês X−1 (regra de negócio da app). Quem recebe no início do mês escolhe
// «No próprio mês» em Perfil e família (`profile.salaryMonth`, v2.57.0): rendimento do mês X = salários do mês X.
import { anoMes, diaDeVencimento, inicioDoMes } from './datas';
import type { Dados, Movimento } from './esquema';

const SALARIO = /salario|vencimento|ordenado/;

function textoSemAcentos(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Receita de salário (título ou categoria com salário/vencimento/ordenado). */
export const eReceitaDeSalario = (m: Pick<Movimento, 'movementType' | 'title' | 'detail'>): boolean =>
  m.movementType === 'income' && SALARIO.test(textoSemAcentos(`${m.title} ${m.detail}`));

/** Ainda não há salários (nem na tabela nem nos movimentos, além de `exceto`) e não se escolheu quando se recebe: é altura de perguntar. */
export function perguntarQuandoSalario(dados: Pick<Dados, 'salaries' | 'transactions' | 'profile'>, exceto: Movimento['id']): boolean {
  return !dados.profile.salaryMonth && !haSalarios(dados, exceto);
}

/** Já houve algum salário (na tabela ou nas receitas)? Sem nenhum, a Principal mostra o cartão do rendimento pequeno (v2.60.0). */
export function haSalarios(dados: Pick<Dados, 'salaries' | 'transactions'>, exceto?: Movimento['id']): boolean {
  const naTabela = Object.values(dados.salaries).some((pessoas) => Object.values(pessoas ?? {}).some((v) => Array.isArray(v) && v.some((x) => x > 0)));
  return naTabela || dados.transactions.some((m) => m.id !== exceto && eReceitaDeSalario(m) && m.amount > 0);
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
    .filter((m) => m.date.startsWith(mes) && eReceitaDeSalario(m))
    .reduce((s, m) => s + m.amount, 0);
}

type DadosRendimento = Pick<Dados, 'salaries' | 'transactions'> & { profile?: Pick<Dados['profile'], 'salaryMonth'> };

/** Meses entre o salário e o mês em que conta como rendimento (1 = mês seguinte, 0 = próprio mês). */
export const atrasoDoSalario = (dados: DadosRendimento): number => (dados.profile?.salaryMonth === 'proprio' ? 0 : 1);

/** Mês dos salários que fazem o rendimento de `mes`. */
export const mesDosSalarios = (dados: DadosRendimento, mes: Date): Date => inicioDoMes(mes, -atrasoDoSalario(dados));

export interface Rendimento {
  valor: number;
  /** Rendimento do mês anterior. */
  anterior: number;
  /** Variação percentual; `null` quando o mês anterior é zero. */
  variacao: number | null;
}

/** Rendimento do mês selecionado (qualquer dia desse mês). */
export function rendimentoDoMes(dados: DadosRendimento, mes: Date): Rendimento {
  const a = atrasoDoSalario(dados);
  const valor = salariosDoMes(dados, inicioDoMes(mes, -a));
  const anterior = salariosDoMes(dados, inicioDoMes(mes, -a - 1));
  return { valor, anterior, variacao: anterior ? ((valor - anterior) / anterior) * 100 : null };
}

/**
 * Mês do rendimento que a Principal mostra (v2.37.0): o mês escolhido, exceto no mês atual a partir do dia do ordenado
 * (3.º dia útil a contar do fim do mês), em que já mostra o do mês seguinte — se os salários deste mês já estiverem registados.
 */
export function mesDoRendimento(dados: DadosRendimento, mes: Date, hoje: Date): Date {
  if (anoMes(mes) !== anoMes(hoje) || !atrasoDoSalario(dados)) return mes;
  const vencimento = diaDeVencimento(mes);
  if (vencimento == null || hoje.getDate() < vencimento || !salariosDoMes(dados, mes)) return mes;
  return inicioDoMes(mes, 1);
}
