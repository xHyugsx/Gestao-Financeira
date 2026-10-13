// Classificação das linhas de um extrato: regras gerais (lojas → categorias) no código; regras pessoais
// (salários por pessoa, transferências a confirmar, movimentos a ignorar, investimentos) guardadas no telemóvel.
import type { Movimento, Salarios } from '../dados';
import { type Extrato, normalizar } from './leitura';

export type Tipo = 'exp' | 'inc' | 'sal' | 'tr' | 'ask' | 'ign';

/** Regra pessoal (Definições › Importação). `contem` é procurado na descrição do extrato. */
export interface RegraPessoal {
  contem: string;
  acao: 'salario' | 'transferir' | 'ignorar' | 'investimento';
  pessoa?: string;
}

/** Escolhas memorizadas ("Lembrar as minhas escolhas"), por descrição normalizada — chave `import-rules`. */
export type Memorizadas = Record<string, { k?: Tipo; c?: string; ch?: string }>;

// Regras gerais, sem dados pessoais (as pessoais saíram do código — plano secção 7)
const GERAIS: [RegExp, Tipo, string[]?][] = [
  [/CAR WAL CRT DEB REVOL/, 'tr'],
  [/AUCHAN ENERGY|GALP|REPSOL|\bBP\b|PRIO|CEPSA|PA A8/, 'exp', ['Combustível', 'Transportes']],
  [/^A\d{1,2}$|VIA VERDE|PORTAG|UBER|BOLT|RYANAIR|\bTAP\b/, 'exp', ['Transportes']],
  [/MERCADONA|CONTINENTE|AUCHAN|ALDI|LIDL|PINGO DOCE|LECLERC|INTERMARCHE|MINIPRECO|C\.DEB MERCADO|EUPFEIJ/, 'exp', ['Alimentação']],
  [/\bREST\b|RESTAURANTE|MCDONALDS|^BK\d|BURGER|PIZZA|SUSHI|CAFE|\bBAR\b|COCKTAIL|PADARIA|PASTELARIA|GELATARIA|CHURRASQ|TAPAS|JET 7|STARBUC|MY BREA|MARISQUEIRA|SEASIDE|CORETO|MOINHO|BULE DE CHA|SPASSO|FITONIA|BAGGA|ROMANTIC|LE JARDIN/, 'exp', ['Restauração', 'Restaurantes', 'Lazer', 'Alimentação']],
  [/ONVET|VETERI/, 'exp', ['Veterinário', 'Animais']],
  [/SEGUROS|FIDELIDADE|ASISA|ZURICH|GENERALI|DOMESTIC AND GENERAL/, 'exp', ['Seguros']],
  [/COBRANCA PRESTACAO|CONDOMINIO/, 'exp', ['Habitação']],
  [/CETELEM|BNP/, 'exp', ['Créditos', 'Prestações']],
  [/MANUT CONTA|COMISS|IMPOSTO/, 'exp', ['Comissões']],
  [/PRIMARK|PULL BEAR|TEZENIS|LEFTIES|NYX|MY SHOPPING|MUNDO|LOJA|CHEN|FLEUROP|NOTE|PAPELARIA|CENTROXOGO|PIXEL|THEFLOW|FOZTROPIC|VILANOVA|C CLASSIC|PAYPAYUE/, 'exp', ['Compras', 'Vestuário', 'Lazer']],
  [/CINEMAS|NINTENDO|GINASIO|ADVENTURE/, 'exp', ['Lazer']],
  [/^ATM/, 'exp', ['Outros']],
];

/** Título legível a partir da descrição do banco. */
export function limparTitulo(d: string): string {
  if (/^TRF MBWAY/i.test(d)) return `MB Way ${d.trim().split(/\s+/).pop()}`;
  const s = d.trim().replace(/^(COMPRAS? C\.DEB|COMPRA|TRF|TFI|CR VCHER CRT DB)\s+/i, '');
  return s.split(/\s+/).map((w) => (/^[A-Z]\d+$/.test(w) || (w.length <= 2 && w === w.toUpperCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(' ');
}

function escolher(opcoes: string[], cats: string[]): string {
  return opcoes.find((o) => cats.includes(o)) ?? (opcoes.includes('Investimentos') ? 'Investimentos' : 'Outros');
}

export interface Item {
  i: number; d: string; raw: string; t: string; a: number; k: Tipo; c: string | null; p: string | null;
  rec: boolean; tag: string; key: string; N: string; on: boolean; ch?: string; edited?: boolean;
}

export interface Contexto { tx: Movimento[]; cats: string[]; inc: string[]; sal: Salarios }

export function classificar(ext: Extrato, ctx: Contexto, pessoais: RegraPessoal[], memorizadas: Memorizadas) {
  const hist: Record<string, string> = {}, vistos: Record<string, number> = {}, cats = [...ctx.cats], items: Item[] = [];
  if (!cats.includes('Outros')) cats.push('Outros');
  for (const t of ctx.tx) {
    if (t.movementType !== 'expense' && t.movementType !== 'income') continue;
    const k = normalizar(t.title);
    if (!hist[k]) hist[k] = String(t.detail || '').split(' · ').pop()!;
  }
  const chaves = new Set(ctx.tx.map((t) => t.importKey).filter(Boolean));
  const regras = pessoais.filter((r) => r.contem.trim()).map((r) => ({ ...r, N: normalizar(r.contem) }));
  ext.lines.forEach((l, i) => {
    const N = normalizar(l.raw), id = l.date + N + l.amount, sq = (vistos[id] = (vistos[id] || 0) + 1);
    const key = `${l.date}|${N}|${l.amount.toFixed(2)}|${sq}`;
    if (chaves.has(key)) return;
    const o: Item = { i, d: l.date, raw: l.raw, t: limparTitulo(l.raw), a: l.amount, k: 'exp', c: null, p: null, rec: false, tag: '', key, N, on: false };
    let tipo: Tipo | null = null;
    const pessoal = regras.find((r) => N.includes(r.N));
    if (pessoal) {
      if (pessoal.acao === 'ignorar') tipo = 'ign';
      else if (pessoal.acao === 'transferir') tipo = 'ask';
      else if (pessoal.acao === 'salario') { tipo = 'sal'; o.p = pessoal.pessoa?.trim() || 'Salário'; }
      else { tipo = 'exp'; o.c = escolher(['Investimentos'], cats); o.rec = true; }
    } else {
      const g = GERAIS.find(([re]) => re.test(N));
      if (g) { tipo = g[1]; if (tipo === 'exp') o.c = escolher(g[2]!, cats); }
    }
    const u = memorizadas[N];
    if (u) { if (u.k) tipo = u.k; if (u.c) o.c = u.c; if (u.ch) o.ch = u.ch; }
    if (tipo === 'exp' && l.amount > 0) tipo = null;
    o.k = tipo ?? (l.amount > 0 ? 'inc' : 'exp');
    if (o.k === 'exp' && (!o.c || o.c === 'Outros') && hist[normalizar(o.t)]) o.c = hist[normalizar(o.t)]!;
    if (o.k === 'exp' && !o.c) o.c = 'Outros';
    if (o.k === 'inc' && !o.c) o.c = /^TFI|GENERALI|VCHER|INSTITUTO/.test(N) ? 'Reembolsos' : 'Outras receitas';
    if (o.k === 'inc' && !ctx.inc.includes(o.c!)) o.c = 'Outras receitas';
    o.on = o.k === 'exp' || o.k === 'inc' || o.k === 'sal' || (o.k === 'ask' && !!o.ch && o.ch !== 'Ignorar');
    if (o.k === 'sal') {
      const ano = o.d.slice(0, 4), mes = +o.d.slice(5, 7) - 1;
      if ((ctx.sal[ano]?.[o.p!]?.[mes] ?? 0) > 0) { o.on = false; o.tag = 'Já registado'; }
    }
    // possível duplicado: um movimento registado à mão (ou criado por um recorrente) com o mesmo valor ±2 dias
    if ((o.k === 'exp' || o.k === 'inc') && ctx.tx.some((t) => !t.importKey && Math.abs(Math.abs(t.amount) - Math.abs(o.a)) < 0.005
      && (t.amount < 0) === (o.a < 0) && Math.abs(new Date(t.date).getTime() - new Date(o.d).getTime()) <= 2 * 864e5)) {
      o.on = false; o.tag = 'Possível duplicado';
    }
    items.push(o);
  });
  return { items, cats, skipped: ext.lines.length - items.length };
}
