// Contas por mês usadas pelas páginas Análise, Categorias, Resumo e Calendário (mesmas regras da app atual).
import { anoMes, type Estado, gastos, inicioDoMes, type Movimento } from '../dados';
import { categoriaDespesa, categoriaReceita, simplificar } from '../movimentos/categorias';
import { CATALOGO_ICONES, CATEGORIAS_BASE, type NomeIcone } from '../ui/icones';

export const doMes = (movimentos: Movimento[], mes: Date) => movimentos.filter((m) => m.date.startsWith(anoMes(mes)));
export const receitas = (l: Movimento[]) => l.filter((m) => m.movementType === 'income').reduce((s, m) => s + m.amount, 0);
export const variacao = (atual: number, anterior: number) => (anterior ? ((atual - anterior) / anterior) * 100 : 0);
export const diasDoMes = (mes: Date) => new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
/** "12,3%" sem arredondar para inteiro (valor com sinal). */
export const percentagem = (v: number) => `${(+v || 0).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%`;
/** Título e descrição sem acentos e em minúsculas (regras de salário, poupança, …). */
export const textoDe = (m: Movimento) => simplificar(`${m.title} ${m.detail}`);
const semAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const eCombustivel = (m: Movimento) => m.movementType === 'expense' && /combust/i.test(`${semAcentos(m.title)} ${semAcentos(m.detail)}`);

export const CORES: Record<string, string> = {
  blue: 'var(--cosmic-blue)', green: 'var(--positive)', orange: 'oklch(72% .18 55)', pink: 'var(--negative)',
  violet: 'var(--primary)', red: 'oklch(62% .25 24)', yellow: 'oklch(78% .16 88)', cyan: 'oklch(73% .15 220)',
};

const ICONE_POR_ID: Record<string, NomeIcone> = Object.fromEntries(CATALOGO_ICONES.map((e) => [e.id, e.icone]));
const ICONE_RECEITA: Record<string, string> = { 'Salário': 'work', Investimentos: 'invest', Reembolsos: 'bills', 'Outras receitas': 'cash' };
const COR_RECEITA: Record<string, string> = { 'Salário': 'green', Investimentos: 'blue', Reembolsos: 'violet', 'Outras receitas': 'yellow' };
const ICONE_DESPESA: Record<string, string> = { 'Combustível': 'fuel', Outros: 'tags' };
const COR_DESPESA: Record<string, string> = { 'Combustível': 'orange', Outros: 'violet' };
const NIVEIS = [34, 23, 15, 8, 7, 5, 4];

export interface LinhaCategoria {
  name: string;
  auto: boolean;
  icone: NomeIcone;
  tone: string;
  type: string;
  amount: number;
  share: number;
  /** Largura da barra (classe `progress-N`). */
  bucket: number;
  trend: number;
}

/** Categorias de despesa ou de receita do mês, da maior para a menor. */
export function categoriasDoMes(estado: Estado, mes: Date, tipo: 'despesas' | 'receitas'): LinhaCategoria[] {
  const despesas = tipo === 'despesas';
  const atual = doMes(estado.transactions, mes), anterior = doMes(estado.transactions, inicioDoMes(mes, -1));
  const definidas = despesas ? estado.categories : estado.incomeCategories;
  const tipoMov = despesas ? 'expense' : 'income';
  const categoria = despesas ? categoriaDespesa : categoriaReceita;
  const soma = (l: Movimento[], nome: string) => {
    const daCategoria = l.filter((m) => m.movementType === tipoMov && categoria(m) === nome);
    return despesas ? gastos(daCategoria) : daCategoria.reduce((s, m) => s + m.amount, 0);
  };
  const total = despesas ? gastos(atual) : receitas(atual);
  const nomes = [...new Set([...definidas, ...[...atual, ...anterior].filter((m) => m.movementType === tipoMov).map(categoria)])];
  return nomes.map((nome) => {
    const base = CATEGORIAS_BASE.find((c) => c.name === nome);
    const amount = soma(atual, nome), antes = soma(anterior, nome);
    const share = total ? Math.round((amount / total) * 1000) / 10 : 0;
    const bucket = share ? NIVEIS.reduce((a, b) => (Math.abs(b - share) < Math.abs(a - share) ? b : a)) : 0;
    return {
      name: nome,
      auto: !definidas.includes(nome),
      icone: ICONE_POR_ID[estado.categoryIcons[nome] ?? ''] ?? base?.icone ?? ICONE_POR_ID[(despesas ? ICONE_DESPESA : ICONE_RECEITA)[nome] ?? ''] ?? ICONE_POR_ID.tags!,
      tone: base?.tone ?? (despesas ? COR_DESPESA : COR_RECEITA)[nome] ?? 'violet',
      type: base?.type ?? 'pontual',
      amount,
      share,
      bucket,
      trend: Math.round(variacao(amount, antes) * 10) / 10,
    };
  }).sort((a, b) => b.amount - a.amount);
}

const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

interface Legenda { nome: string; tone: string; x1: number; y1: number; x2: number; y: number; p: number; v: number; ly?: number }

/** Setas com o nome e a percentagem de cada fatia do gráfico circular (SVG igual ao da app atual). */
export function legendasDoGrafico(l: LinhaCategoria[], total: number): string {
  const cx = 170, cy = 125, R = 78, G = 22, TOPO = 12, BASE = 236;
  const ponto = (a: number, r: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
  const esquerda: Legenda[] = [], direita: Legenda[] = [];
  let a = 0;
  l.forEach((e) => {
    const a1 = a + (e.amount / total) * Math.PI * 2, meio = (a + a1) / 2;
    const [x1, y1] = ponto(meio, R + 2), [x2, y2] = ponto(meio, R + 10);
    (Math.sin(meio) >= 0 ? direita : esquerda).push({ nome: e.name, tone: e.tone, x1, y1, x2, y: y2, p: (e.amount / total) * 100, v: e.amount });
    a = a1;
  });
  const arrumar = (s: Legenda[]) => {
    s.sort((p, q) => p.y - q.y);
    const H = BASE - TOPO;
    if (s.length * 16 > H) s = [...s].sort((p, q) => q.v - p.v).slice(0, Math.floor(H / 16)).sort((p, q) => p.y - q.y);
    const g = Math.max(16, Math.min(G, H / Math.max(1, s.length)));
    s.forEach((o, i) => { o.ly = Math.max(o.y, i ? s[i - 1]!.ly! + g : TOPO); });
    for (let i = s.length - 1; i >= 0; i--) s[i]!.ly = Math.min(s[i]!.ly!, i === s.length - 1 ? BASE : s[i + 1]!.ly! - g);
    return s;
  };
  let svg = '<defs><marker id="ff-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L8 4L0 8z" style="fill:currentColor"/></marker></defs>';
  ([[direita, 1], [esquerda, -1]] as const).forEach(([s, d]) => arrumar(s).forEach((q) => {
    const ex = cx + d * (R + 18), tx = ex + d * 4, ancora = d > 0 ? 'start' : 'end';
    const nome = q.nome.length > 13 ? `${q.nome.slice(0, 12)}…` : q.nome;
    svg += `<polyline points="${ex},${q.ly} ${q.x2},${q.y} ${q.x1},${q.y1}" fill="none" stroke="currentColor" stroke-opacity=".75" stroke-width="1" marker-end="url(#ff-ah)"/>`
      + `<text x="${tx}" y="${q.ly! - 1}" text-anchor="${ancora}" font-size="9" style="fill:var(--foreground);opacity:.85">${escapar(nome)}</text>`
      + `<text x="${tx}" y="${q.ly! + 9}" text-anchor="${ancora}" font-size="9" font-weight="700" style="fill:${CORES[q.tone] || 'var(--primary)'}">${percentagem(Math.round(q.p * 10) / 10)}</text>`;
  }));
  return svg;
}

/** Contas do fecho do mês (secção "Fecho de mês" do Resumo). */
export function fechoDoMes(movimentos: Movimento[], mes: Date) {
  const doMesAtual = doMes(movimentos, mes);
  const entradas = doMesAtual.filter((m) => m.movementType === 'income');
  const salario = entradas.filter((m) => /salario|vencimento|ordenado/.test(textoDe(m))).reduce((s, m) => s + m.amount, 0);
  const outras = entradas.reduce((s, m) => s + m.amount, 0) - salario;
  const despesas = doMesAtual.filter((m) => m.movementType === 'expense');
  const revolut = (fim: string) => doMesAtual.filter((m) => m.revolut?.purpose === fim).reduce((s, m) => s + (m.transferValue || 0), 0);
  const soma = (l: Movimento[]) => l.reduce((s, m) => s + Math.abs(m.amount), 0);
  const poupanca = soma(despesas.filter((m) => /poupanca/.test(textoDe(m)))) + revolut('Poupança');
  const investimentos = soma(despesas.filter((m) => /investiment/.test(textoDe(m)))) + revolut('Investimento');
  const gasto = soma(despesas) - (poupanca - revolut('Poupança')) - (investimentos - revolut('Investimento'));
  return { salario, outras, despesas: gasto, combustivel: soma(despesas.filter(eCombustivel)), poupanca, investimentos, saldo: salario + outras - gasto };
}
