// Frase do dia (cartão do Jarvis na página Principal): uma observação sobre os gastos do mês atual.
// Poupança e investimentos não contam como gasto (mesmas regras do «Fecho de mês»).
import { dia, type Estado, inicioDoMes, MESES, type Movimento } from '../dados';
import { categoriaDespesa } from '../movimentos/categorias';
import { porConfirmar } from '../movimentos/recorrentes';
import { diasDoMes, doMes, fechoDoMes, textoDe } from './calculos';
import { recorrentesDoMes } from './subscricoes';

const soma = (l: Movimento[]) => l.reduce((s, m) => s + Math.abs(m.amount), 0);
/** Despesas sem poupança nem investimentos. */
const consumo = (l: Movimento[]) => l.filter((m) => m.movementType === 'expense' && !/poupanca|investiment/.test(textoDe(m)));
const euros = (v: number) => `${Math.round(v).toLocaleString('pt-PT')}\u00a0€`;

/**
 * Frase do dia: uma observação sobre os gastos, escolhida pelo dia do ano entre as que se aplicam.
 * Só olha para o mês atual; devolve `null` se não houver nada a dizer.
 * Enquanto houver recorrentes de valor variável por confirmar (este mês ou no anterior), a frase lembra-os.
 */
export function fraseDoDia(estado: Pick<Estado, 'transactions'>, hoje = new Date()): string | null {
  const l = estado.transactions, d = hoje.getDate();
  const desdeMesAnterior = dia(inicioDoMes(hoje, -1));
  const pendentes = [...new Set(l.filter((m) => porConfirmar(m) && m.date >= desdeMesAnterior && m.date <= dia(hoje)).map((m) => m.title.trim()))];
  if (pendentes.length) {
    const nomes = pendentes.length > 1 ? `${pendentes.slice(0, -1).join(', ')} e ${pendentes.at(-1)}` : pendentes[0];
    return `Falta confirmar o valor de ${nomes}: toca no movimento e escreve o valor deste mês.`;
  }
  const gastoAte = (mes: Date, ate: number) => soma(consumo(doMes(l, mes)).filter((m) => Number(m.date.slice(8, 10)) <= ate));
  const frases: string[] = [];

  const anterior = inicioDoMes(hoje, -1);
  const agora = gastoAte(hoje, d), antes = gastoAte(anterior, Math.min(d, diasDoMes(anterior)));
  if (agora && antes) {
    const dif = agora - antes;
    if (Math.abs(dif) >= 10) {
      frases.push(`Até hoje gastaste ${euros(Math.abs(dif))} ${dif < 0 ? 'menos' : 'mais'} do que em ${MESES[anterior.getMonth()]} no mesmo dia${dif < 0 ? ' 👏' : '.'}`);
    }
  }

  // Últimos 7 dias contra os 7 anteriores, por categoria (só categorias com gastos nas duas semanas: a renda paga uma vez não conta)
  const desde = (n: number) => dia(new Date(hoje.getFullYear(), hoje.getMonth(), d - n));
  const semana = consumo(l).filter((m) => m.date > desde(7) && m.date <= dia(hoje));
  const passada = consumo(l).filter((m) => m.date > desde(14) && m.date <= desde(7));
  const porCategoria = (x: Movimento[]) => x.reduce((r, m) => r.set(categoriaDespesa(m), (r.get(categoriaDespesa(m)) || 0) + Math.abs(m.amount)), new Map<string, number>());
  const a = porCategoria(semana), b = porCategoria(passada);
  let melhor: [string, number] | null = null;
  for (const [c, v] of b) {
    const agoraC = a.get(c) || 0;
    if (v >= 20 && agoraC > 0 && agoraC < v && (!melhor || (v - agoraC) / v > melhor[1])) melhor = [c, (v - agoraC) / v];
  }
  if (melhor && melhor[1] >= .15) frases.push(`Esta semana gastaste menos ${Math.round(melhor[1] * 100)}% em ${melhor[0]} do que na anterior.`);

  const doMesAtual = consumo(doMes(l, hoje)).filter((m) => m.date <= dia(hoje));
  const maior = doMesAtual.reduce<Movimento | null>((r, m) => (!r || Math.abs(m.amount) > Math.abs(r.amount) ? m : r), null);
  if (maior && doMesAtual.length >= 3) frases.push(`A maior despesa do mês até agora: ${maior.title.trim()} (${euros(Math.abs(maior.amount))}).`);

  const poupado = fechoDoMes(l, hoje);
  if (poupado.poupanca + poupado.investimentos > 0) frases.push(`Este mês já puseste ${euros(poupado.poupanca + poupado.investimentos)} de parte 💪`);

  const rec = recorrentesDoMes(l, hoje, hoje), porPagar = rec.lista.filter((r) => r.estado !== 'pago');
  if (porPagar.length) {
    frases.push(`${porPagar.length === 1 ? 'Falta pagar 1 recorrente' : `Faltam pagar ${porPagar.length} recorrentes`} este mês${rec.falta ? ` (≈ ${euros(rec.falta)})` : ''}.`);
  }

  let semGastos = 0;
  const comGastos = new Set(consumo(l).map((m) => m.date));
  while (semGastos < d - 1 && !comGastos.has(desde(semGastos + 1))) semGastos++;
  if (semGastos >= 2 && !comGastos.has(dia(hoje))) frases.push(`${semGastos} dias seguidos sem despesas. Continua assim!`);

  if (!frases.length) return null;
  const diaDoAno = Math.floor((+new Date(hoje.getFullYear(), hoje.getMonth(), d) - +new Date(hoje.getFullYear(), 0, 1)) / 864e5);
  return frases[diaDoAno % frases.length]!;
}
