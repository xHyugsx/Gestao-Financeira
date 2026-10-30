import { MESES } from '../dados';

/**
 * Perguntas de seguimento conforme a última pergunta (botões por cima da caixa; enviam logo, como as sugestões de perguntas).
 * As ações («adiciona…», «apaga…») não têm seguimento.
 */
export function seguimentos(pergunta: string, hoje: Date): string[] {
  const n = pergunta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/^(adiciona|regista|apaga|elimina|muda|altera|marca|confirmar|cancelar|so este mes|parar a serie)/.test(n.trim())) return [];
  const passado = /passad|anterior/.test(n), seguinte = MESES[(hoje.getMonth() + 1) % 12];
  if (/combust/.test(n)) return passado ? ['Combustível este mês'] : ['Combustível no mês passado', 'Média mensal de combustível'];
  if (/veterin/.test(n)) return passado ? ['Veterinário este mês'] : ['Veterinário no mês passado', 'Média mensal de veterinário'];
  if (/maior categoria/.test(n)) return passado ? ['Maior categoria'] : ['Maior categoria no mês passado', 'Quanto gastei este mês?'];
  if (/conta|saldo/.test(n)) return passado ? ['Gastos por conta este mês'] : ['Gastos por conta no mês passado', `Previsão dos gastos em ${seguinte}`];
  if (/previs/.test(n)) return ['Gastos por conta', 'Quanto gastei este mês?'];
  if (/rendimento/.test(n)) return passado ? ['Rendimento do mês'] : ['Rendimento do mês passado'];
  if (/receita/.test(n)) return passado ? ['Receitas do mês'] : ['Receitas do mês passado', 'Média mensal de receitas'];
  if (/gast|despes/.test(n)) return passado ? ['Quanto gastei este mês?', 'Maior categoria no mês passado'] : ['Quanto gastei no mês passado?', 'Gastei mais do que no mês passado?', 'Maior categoria'];
  return [];
}
