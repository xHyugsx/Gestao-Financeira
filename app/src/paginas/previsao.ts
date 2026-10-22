// Previsão do saldo no fim de um mês futuro (Resumo e Jarvis): os movimentos que já existem mais os recorrentes que a
// app ainda vai criar e as despesas anuais por pagar até ao fim desse mês. Nada disto é gravado.
import { anoMes, type Movimento } from '../dados';
import { recorrentesPrevistos } from '../movimentos/recorrentes';
import { anuaisPrevistas, despesasAnuais } from './anuais';

export function previsaoDoMes(todos: Movimento[], anuais: unknown[], hoje: Date, mes: Date) {
  const futuro = anoMes(mes) > anoMes(hoje), limite = `${anoMes(mes)}-31`;
  const recorrentes = futuro ? recorrentesPrevistos(todos, hoje, limite) : [];
  const anuaisFuturas = futuro ? anuaisPrevistas(despesasAnuais(anuais), hoje, limite) : [];
  const existentes = todos.filter((m) => !m.skipped);
  return { recorrentes, anuais: anuaisFuturas, movimentos: recorrentes.length || anuaisFuturas.length ? [...existentes, ...recorrentes, ...anuaisFuturas] : existentes };
}
