// Contas por mês usadas pelas páginas Análise, Categorias, Resumo e Calendário (mesmas regras da app atual).
import { anoMes, dia, type Estado, gastos, inicioDoMes, type Movimento } from '../dados';
import { categoriaDespesa, categoriaReceita, simplificar } from '../movimentos/categorias';
import { coresCategorias, TONS } from '../movimentos/cores';
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
  // cores novas (só na app nova, para categorias criadas pelo utilizador)
  teal: 'oklch(70% .12 185)', lime: 'oklch(82% .19 128)', amber: 'oklch(80% .16 70)', rose: 'oklch(70% .19 5)',
  indigo: 'oklch(58% .2 275)', sky: 'oklch(78% .12 235)', fuchsia: 'oklch(67% .26 322)', emerald: 'oklch(70% .16 158)',
  // fatias pequenas juntas no gráfico circular
  outras: 'var(--muted-foreground)',
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
  const cores = coresCategorias(estado);
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
      tone: cores[nome] ?? base?.tone ?? (despesas ? COR_DESPESA : COR_RECEITA)[nome] ?? 'violet',
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

/**
 * Sem cores repetidas no mesmo gráfico: pela ordem alfabética, a primeira categoria de cada tom fica com ele e as
 * seguintes passam para o primeiro tom ainda livre (se não houver, mantêm o seu). Recebe todas as categorias do tipo,
 * mesmo as sem valor no mês, para as cores não mudarem de mês para mês.
 */
export function coresDistintas<T extends { name: string; tone: string }>(l: T[]): T[] {
  const usados = new Set(l.map((e) => e.tone)), vistos = new Set<string>(), troca = new Map<string, string>();
  [...l].sort((a, b) => a.name.localeCompare(b.name, 'pt-PT')).forEach((e) => {
    if (!vistos.has(e.tone)) { vistos.add(e.tone); return; }
    const livre = TONS.find((t) => !usados.has(t));
    if (!livre) return;
    usados.add(livre);
    troca.set(e.name, livre);
  });
  return troca.size ? l.map((e) => (troca.has(e.name) ? { ...e, tone: troca.get(e.name)! } : e)) : l;
}

/** Fatias com seta: as de 5% ou mais; as mais pequenas (duas ou mais, no fim da lista ordenada) juntam-se em «Outras». */
export function fatiasComSeta(l: LinhaCategoria[], total: number): LinhaCategoria[] {
  const pequenas = l.filter((e) => e.amount < total * 0.05);
  if (pequenas.length < 2) return l;
  const amount = pequenas.reduce((s, e) => s + e.amount, 0);
  return [...l.filter((e) => e.amount >= total * 0.05), { ...pequenas[0]!, name: 'Outras', tone: 'outras', amount, share: Math.round((amount / total) * 1000) / 10 }];
}

/** Caminho SVG de uma fatia do anel num quadrado 100×100 (`de`/`ate` em voltas, 0 = topo, no sentido dos ponteiros). */
export function caminhoDaFatia(de: number, ate: number, R = 50, r = 34): string {
  if (ate - de >= 0.9999) return caminhoDaFatia(de, de + 0.5, R, r) + caminhoDaFatia(de + 0.5, de + 1, R, r);
  const p = (v: number, raio: number) => `${+(50 + raio * Math.sin(v * 2 * Math.PI)).toFixed(3)} ${+(50 - raio * Math.cos(v * 2 * Math.PI)).toFixed(3)}`;
  const grande = ate - de > 0.5 ? 1 : 0;
  return `M${p(de, R)}A${R} ${R} 0 ${grande} 1 ${p(ate, R)}L${p(ate, r)}A${r} ${r} 0 ${grande} 0 ${p(de, r)}Z`;
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

export interface GastoConta { id: string; name: string; amount: number; share: number; anterior: number; tone: string }

const TONS_CONTAS = ['violet', 'cyan', 'amber', 'emerald', 'fuchsia', 'sky', 'rose', 'lime'];

/**
 * Despesas do mês por conta (as sem conta são da Principal; transferências não contam). Movimentos de contas que já não
 * existem neste telemóvel (ex.: juntados de outro) ficam em «Outras contas». Só as contas com gastos neste mês ou no anterior.
 */
export function gastosPorConta(estado: Pick<Estado, 'transactions' | 'accounts'>, mes: Date): GastoConta[] {
  const ids = new Set(estado.accounts.map((c) => c.id));
  const contaDe = (m: Movimento) => (!m.account ? 'principal' : ids.has(m.account) ? m.account : '?');
  const somar = (d: Date) => doMes(estado.transactions, d).filter((m) => m.movementType === 'expense')
    .reduce((r, m) => r.set(contaDe(m), (r.get(contaDe(m)) || 0) + Math.abs(m.amount)), new Map<string, number>());
  const agora = somar(mes), antes = somar(inicioDoMes(mes, -1));
  const total = [...agora.values()].reduce((s, v) => s + v, 0);
  return [...estado.accounts.map((c, i) => ({ id: c.id, name: c.name, tone: TONS_CONTAS[i % TONS_CONTAS.length]! })),
    { id: '?', name: 'Outras contas', tone: 'blue' }]
    .map((c) => ({ ...c, amount: agora.get(c.id) || 0, anterior: antes.get(c.id) || 0, share: total ? ((agora.get(c.id) || 0) / total) * 100 : 0 }))
    .filter((c) => c.amount > 0 || c.anterior > 0)
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Mapa de calor do calendário: gasto de cada dia do mês (despesas sem poupança nem investimentos) e nível 0–4 pela
 * posição entre os dias com gastos (assim uma renda não deixa os outros dias todos no nível mais baixo).
 * `semGastos`: dias já passados (até hoje) sem nenhuma despesa. `previsto`: despesas agendadas (dias depois de hoje),
 * que ficam fora dos níveis e do dia mais caro (ainda não aconteceram).
 */
export function calorDoMes(movimentos: Movimento[], mes: Date, hoje = new Date()) {
  const dias = diasDoMes(mes), gasto = Array<number>(dias + 1).fill(0), previsto = Array<number>(dias + 1).fill(0), hojeDia = dia(hoje);
  for (const m of doMes(movimentos, mes)) {
    if (m.movementType === 'expense' && !/poupanca|investiment/.test(textoDe(m))) (m.date > hojeDia ? previsto : gasto)[Number(m.date.slice(8, 10))]! += Math.abs(m.amount);
  }
  const maximo = Math.max(0, ...gasto);
  const ordenados = gasto.filter((v) => v > 0).sort((a, b) => a - b);
  const nivel = gasto.map((v) => (v > 0 ? Math.max(1, Math.ceil(((ordenados.lastIndexOf(v) + 1) / ordenados.length) * 4)) : 0));
  const ultimo = anoMes(mes) < anoMes(hoje) ? dias : anoMes(mes) > anoMes(hoje) ? 0 : hoje.getDate();
  const semGastos = Array.from({ length: ultimo }, (_, i) => i + 1).filter((d) => !gasto[d]);
  const maisCaro = maximo > 0 ? gasto.indexOf(maximo) : null;
  return { gasto, nivel, semGastos, maisCaro, previsto };
}

/**
 * Despesas do mês por pessoa («Quem fez»). As sem pessoa ficam em «Sem pessoa». Só aparece se houver despesas com
 * pessoa neste mês ou no anterior; senão devolve uma lista vazia.
 */
export function gastosPorPessoa(estado: Pick<Estado, 'transactions'>, mes: Date, pessoas: string[]): GastoConta[] {
  const somar = (d: Date) => doMes(estado.transactions, d).filter((m) => m.movementType === 'expense')
    .reduce((r, m) => { const k = typeof m.person === 'string' && m.person ? m.person : ''; return r.set(k, (r.get(k) || 0) + Math.abs(m.amount)); }, new Map<string, number>());
  const agora = somar(mes), antes = somar(inicioDoMes(mes, -1));
  if (![...agora.keys(), ...antes.keys()].some(Boolean)) return [];
  const total = [...agora.values()].reduce((s, v) => s + v, 0);
  const nomes = [...new Set([...pessoas, ...agora.keys(), ...antes.keys()].filter(Boolean))];
  return [...nomes.map((n, i) => ({ id: n, name: n, tone: TONS_CONTAS[i % TONS_CONTAS.length]! })), { id: '', name: 'Sem pessoa', tone: 'blue' }]
    .map((c) => ({ ...c, amount: agora.get(c.id) || 0, anterior: antes.get(c.id) || 0, share: total ? ((agora.get(c.id) || 0) / total) * 100 : 0 }))
    .filter((c) => c.amount > 0 || c.anterior > 0)
    .sort((a, b) => b.amount - a.amount);
}
