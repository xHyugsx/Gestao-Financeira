// Ano em revista (Resumo): os números do ano para os ecrãs ao estilo «stories». Gasto = despesas sem poupança nem
// investimentos (poupar não é gastar); no ano atual conta só até hoje.
import { dia, type Estado, MESES, type Movimento } from '../dados';
import { categoriaDespesa, simplificar } from '../movimentos/categorias';
import { fechoDoMes, textoDe } from './calculos';

const eGasto = (m: Movimento) => m.movementType === 'expense' && !/poupanca|investiment/.test(textoDe(m));

export interface AnoEmRevista {
  ano: number;
  /** Último mês com dados contados (0–11). */
  ateMes: number;
  gasto: number;
  recebido: number;
  poupado: number;
  /** Variação do gasto face ao mesmo período do ano anterior (%); `null` sem dados do ano anterior. */
  variacao: number | null;
  porMes: number[];
  mesMaisCaro: { mes: string; valor: number } | null;
  mesMaisPoupado: { mes: string; valor: number } | null;
  categorias: { nome: string; valor: number; parte: number }[];
  /** Onde se gastou mais (pelo título) e o sítio a que se foi mais vezes. */
  maisGasto: { titulo: string; valor: number } | null;
  maisVezes: { titulo: string; vezes: number } | null;
  diasSemGastos: number;
  maiorSequencia: number;
  movimentos: number;
}

export function anoEmRevista(estado: Pick<Estado, 'transactions'>, ano: number, hoje = new Date()): AnoEmRevista {
  const limite = ano < hoje.getFullYear() ? `${ano}-12-31` : dia(hoje);
  const ateMes = ano < hoje.getFullYear() ? 11 : hoje.getMonth();
  const doAno = (a: number, ate: string) => estado.transactions.filter((m) => m.date.startsWith(`${a}-`) && m.date <= ate);
  const l = doAno(ano, limite), gastos = l.filter(eGasto);
  const soma = (x: Movimento[]) => x.reduce((s, m) => s + Math.abs(m.amount), 0);
  const gasto = soma(gastos);
  const recebido = l.filter((m) => m.movementType === 'income').reduce((s, m) => s + m.amount, 0);
  const poupado = Array.from({ length: ateMes + 1 }, (_, i) => fechoDoMes(l, new Date(ano, i, 1))).reduce((s, f) => s + f.poupanca + f.investimentos, 0);
  const antes = soma(doAno(ano - 1, `${ano - 1}${limite.slice(4)}`).filter(eGasto));

  const porMes = Array.from({ length: 12 }, (_, i) => soma(gastos.filter((m) => Number(m.date.slice(5, 7)) === i + 1)));
  const contados = porMes.slice(0, ateMes + 1).map((valor, i) => ({ mes: MESES[i]!, valor, i })).filter((x) => x.valor > 0);
  const ordenados = [...contados].sort((a, b) => b.valor - a.valor);
  // O mês em curso ainda vai a meio: não conta para o «mês mais leve»
  const completos = ordenados.filter((x) => ano < hoje.getFullYear() || x.i < hoje.getMonth());

  const porCategoria = new Map<string, number>();
  for (const m of gastos) porCategoria.set(categoriaDespesa(m), (porCategoria.get(categoriaDespesa(m)) || 0) + Math.abs(m.amount));
  const categorias = [...porCategoria].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nome, valor]) => ({ nome, valor, parte: gasto ? (valor / gasto) * 100 : 0 }));

  const porTitulo = new Map<string, { titulo: string; valor: number; vezes: number }>();
  for (const m of gastos) {
    const k = simplificar(m.title).replace(/\s+/g, ' ').trim();
    const t = porTitulo.get(k) ?? { titulo: m.title.trim(), valor: 0, vezes: 0 };
    t.valor += Math.abs(m.amount); t.vezes++;
    porTitulo.set(k, t);
  }
  const titulos = [...porTitulo.values()];
  const maisGasto = titulos.sort((a, b) => b.valor - a.valor)[0] ?? null;
  const frequente = [...titulos].sort((a, b) => b.vezes - a.vezes)[0];

  // Dias sem despesas só a partir do primeiro movimento registado (antes disso a app ainda não era usada)
  const comGastos = new Set(gastos.map((m) => m.date));
  const primeiro = estado.transactions.reduce((p, m) => (m.date && m.date < p ? m.date : p), limite);
  const [pa, pm, pd] = (primeiro > `${ano}-01-01` ? primeiro : `${ano}-01-01`).split('-').map(Number) as [number, number, number];
  let diasSemGastos = 0, maiorSequencia = 0, sequencia = 0;
  for (let d = new Date(pa, pm - 1, pd); dia(d) <= limite; d.setDate(d.getDate() + 1)) {
    if (comGastos.has(dia(d))) { sequencia = 0; continue; }
    diasSemGastos++; sequencia++; maiorSequencia = Math.max(maiorSequencia, sequencia);
  }

  return {
    ano, ateMes, gasto, recebido, poupado,
    variacao: antes > 0 ? ((gasto - antes) / antes) * 100 : null,
    porMes,
    mesMaisCaro: ordenados[0] ? { mes: ordenados[0].mes, valor: ordenados[0].valor } : null,
    mesMaisPoupado: completos.length > 1 ? { mes: completos[completos.length - 1]!.mes, valor: completos[completos.length - 1]!.valor } : null,
    categorias,
    maisGasto: maisGasto ? { titulo: maisGasto.titulo, valor: maisGasto.valor } : null,
    maisVezes: frequente && frequente.vezes > 1 ? { titulo: frequente.titulo, vezes: frequente.vezes } : null,
    diasSemGastos, maiorSequencia, movimentos: l.length,
  };
}
