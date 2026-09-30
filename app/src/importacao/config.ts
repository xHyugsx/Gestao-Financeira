// Regras pessoais da importação (salários, transferências a confirmar, movimentos a ignorar, investimentos).
// Ficam nos dados guardados no telemóvel (campo `importConfig`), não no código — o repositório é público.
import type { Estado } from '../dados';
import type { RegraPessoal } from './classificacao';

export const ACOES: [RegraPessoal['acao'], string][] = [
  ['salario', 'Salário de…'], ['transferir', 'Transferência a confirmar'], ['ignorar', 'Ignorar'], ['investimento', 'Investimento recorrente'],
];

const eRegra = (r: unknown): r is RegraPessoal => !!r && typeof r === 'object' && typeof (r as RegraPessoal).contem === 'string'
  && ACOES.some(([a]) => a === (r as RegraPessoal).acao);

export function regrasPessoais(e: Pick<Estado, 'extras'>): RegraPessoal[] {
  const c = e.extras.importConfig as { rules?: unknown } | undefined;
  return Array.isArray(c?.rules) ? c.rules.filter(eRegra) : [];
}

export function comRegras(e: Estado, rules: RegraPessoal[]): Estado {
  const limpas = rules.map((r) => ({ contem: r.contem.trim(), acao: r.acao, ...(r.acao === 'salario' && r.pessoa?.trim() ? { pessoa: r.pessoa.trim() } : {}) }))
    .filter((r) => r.contem);
  return { ...e, extras: { ...e.extras, importConfig: { rules: limpas } } };
}
