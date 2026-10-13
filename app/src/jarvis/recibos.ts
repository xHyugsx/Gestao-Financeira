// Leitura de recibos de vencimento e de ficheiros com salários (anexos do Jarvis) — mesmas regras da app atual.
// Diferença intencional: as pessoas vêm dos salários registados (ou do perfil) e as entidades patronais das
// regras pessoais da importação, em vez de nomes fixos no código.
import { type Conta, MESES, type Salarios } from '../dados';
import type { RegraPessoal } from '../importacao/classificacao';
import { semAcentos, valores, valorNoTexto } from './texto';

export type PendenteRecibo =
  | { type: 'slip'; payload: { per: string; year: string; month: number; net: number | null; tk: number | null; accId: string | null; key: string } }
  | { type: 'salaries'; payload: { year: string; month: number; valores: Record<string, number> } };

export interface ContextoRecibo {
  pessoas: string[];
  regras: RegraPessoal[];
  contas: Conta[];
  salarios: Salarios;
  agora: Date;
  eur: (v: number) => string;
}

export interface Leitura { texto: string; pendente?: PendenteRecibo }

const regex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function mesDoTexto(txt: string, agora: Date) {
  const nl = semAcentos(txt), mi = MESES.findIndex((m) => nl.includes(semAcentos(m))), ym = txt.match(/20\d{2}/);
  return { year: ym ? ym[0] : String(agora.getFullYear()), month: mi >= 0 ? mi : agora.getMonth() };
}

function mesDoRecibo(all: string, agora: Date) {
  const mn = MESES.map(semAcentos);
  const m1 = all.match(new RegExp(`\\b(${mn.join('|')})\\s+(?:de\\s+)?(20\\d{2})`));
  if (m1) return { month: mn.indexOf(m1[1]!), year: m1[2]! };
  const m2 = all.match(/\b(20\d{2})[/.-](0[1-9]|1[0-2])\b/);
  if (m2) return { month: +m2[2]! - 1, year: m2[1]! };
  const m3 = all.match(/\b\d{2}[/.-](0[1-9]|1[0-2])[/.-](20\d{2})\b/);
  if (m3) return { month: +m3[1]! - 1, year: m3[2]! };
  const m4 = all.match(/\b(0[1-9]|1[0-2])[/.-](20\d{2})\b/);
  if (m4) return { month: +m4[1]! - 1, year: m4[2]! };
  const mi = mn.findIndex((x) => new RegExp(`\\b${x}\\b`).test(all));
  return { month: mi >= 0 ? mi : agora.getMonth(), year: String(agora.getFullYear()) };
}

const listaOu = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} ou ${l[l.length - 1]}` : l[0] ?? '');

/** Recibo de vencimento (tem "líquido"); `null` se o texto não parecer um recibo. */
export function lerRecibo(txt: string, c: ContextoRecibo): Leitura | null {
  const nl = String(txt).split(/\r?\n/).map((l) => semAcentos(l).replace(/\s+/g, ' ').trim()).filter(Boolean), all = nl.join('\n');
  if (!/liquido/.test(all)) return null;
  const posicoes = c.pessoas.map((p) => [p, all.search(new RegExp(`\\b${regex(semAcentos(p))}\\b`))] as const).filter(([, i]) => i >= 0);
  const entidade = c.regras.find((r) => r.acao === 'salario' && r.pessoa && r.contem.trim() && all.includes(semAcentos(r.contem).replace(/\s+/g, ' ').trim()))?.pessoa;
  const per = posicoes.length > 1
    ? (entidade && posicoes.some(([p]) => p === entidade) ? entidade : [...posicoes].sort((a, b) => a[1] - b[1])[0]![0])
    : posicoes.length ? posicoes[0]![0] : entidade ?? null;
  if (!per) return { texto: `Recebi um recibo, mas não consegui identificar se é ${c.pessoas.length ? `de ${listaOu(c.pessoas)}` : 'de quem'}.` };
  const rotulo = (res: RegExp[]) => {
    for (const re of res) {
      for (let i = 0; i < nl.length; i++) {
        const m = nl[i]!.match(re);
        if (!m) continue;
        const a = valores(nl[i]!.slice(m.index! + m[0].length));
        if (a.length) return a[a.length - 1]!;
        for (let k = 1; k <= 2 && i + k < nl.length; k++) { const b = valores(nl[i + k]!); if (b.length) return b[0]!; }
      }
    }
    return null;
  };
  const net = rotulo([/valor liquido a receber/, /liquido\s*\(eur\)/, /(?:total|valor) liquido|liquido a (?:receber|pagar)/, /\bliquido\b/]);
  const tk = (() => {
    for (const l of nl) {
      const m = l.match(/ticket\s*refei\w*/);
      if (!m) continue;
      const eu = [...l.slice(m.index! + m[0].length).matchAll(/(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d+\.\d{2})\s*€/g)];
      if (eu.length) return valores(eu[eu.length - 1]![1]!)[0] ?? null;
    }
    return null;
  })();
  const { month: mo, year: y } = mesDoRecibo(all, c.agora), A = c.eur;
  const hd = `📄 Recibo de vencimento · ${per} · ${MESES[mo]} ${y}`;
  if (net == null) return { texto: `${hd}\nNão encontrei o valor líquido neste recibo.` };
  const acc = c.contas.find((a) => semAcentos(a.name).includes('edenred'));
  const key = `${per}-${y}-${String(mo + 1).padStart(2, '0')}`, tkDone = !!acc?.tickets?.includes(key);
  const cur = c.salarios[y]?.[per]?.[mo] || 0, same = Math.abs(cur - net) < 0.005;
  const out = [hd, `• Salário líquido: ${A(net)}${same ? ' (já registado — mantém-se)' : ` → salários de ${MESES[mo]} (${per})${cur ? ` · substitui ${A(cur)}` : ''}`}`];
  if (tk != null) {
    out.push(!acc
      ? `• Ticket Refeição: ${A(tk)} — não encontrei a conta «Edenred» (cria-a em Definições › Contas bancárias), por isso não será adicionado.`
      : tkDone ? `• Ticket Refeição de ${MESES[mo]} já foi adicionado à ${acc.name} — não volto a somar.` : `• Ticket Refeição: ${A(tk)} → conta ${acc.name}`);
  }
  const doTk = tk != null && !!acc && !tkDone;
  if (same && !doTk) return { texto: `${out.join('\n')}\nNada a alterar.` };
  return {
    texto: `${out.join('\n')}\nConfirmas o registo?`,
    pendente: { type: 'slip', payload: { per, year: y, month: mo, net: same ? null : net, tk: doTk ? tk : null, accId: doTk ? acc!.id : null, key } },
  };
}

/** Ficheiro de texto com uma linha de salário por pessoa ("Nome — Salário: 1850€"). */
export function lerSalarios(txt: string, c: ContextoRecibo): Leitura {
  const ls = txt.split(/\r?\n/), kw = /salari|ordenad|venciment|remunera/, found: Record<string, number> = {};
  const procurar = (exigeChave: boolean) => {
    for (const p of c.pessoas) {
      const k = semAcentos(p);
      for (const ln of ls) {
        const nl = semAcentos(ln);
        if (nl.includes(k) && (!exigeChave || kw.test(nl))) {
          const a = valorNoTexto(ln);
          if (a != null) { found[p] = a; break; }
        }
      }
    }
  };
  procurar(true);
  if (!Object.keys(found).length && kw.test(semAcentos(txt))) procurar(false);
  if (!Object.keys(found).length) {
    return { texto: `Não encontrei valores de salário reconhecíveis neste ficheiro. Tenta um .txt/.csv com uma linha por pessoa, por exemplo «${c.pessoas[0] ?? 'Nome'} — Salário: 1850€».` };
  }
  const my = mesDoTexto(txt, c.agora);
  const lista = c.pessoas.filter((p) => found[p] != null).map((p) => `${p} — ${c.eur(found[p]!)}`).join(' · ');
  return {
    texto: `Encontrei no ficheiro: ${lista} (${MESES[my.month]} ${my.year}). Confirmas que queres adicionar?`,
    pendente: { type: 'salaries', payload: { year: my.year, month: my.month, valores: found } },
  };
}

export const lerDocumento = (txt: string, c: ContextoRecibo): Leitura => lerRecibo(txt, c) ?? lerSalarios(txt, c);

interface ItemPdf { s: string; x: number; y: number; w: number }
interface PdfJs {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (o: { data: ArrayBuffer }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str: string; transform: number[]; width: number }[] }> }> }> };
}

/** Texto de um PDF, linha a linha (pdf.js local em vendor/). */
export async function textoDoPdf(f: File): Promise<string> {
  const base = new URL('vendor/pdfjs/', document.baseURI).href;
  const mod = (await import(/* @vite-ignore */ `${base}pdf.min.mjs`)) as PdfJs;
  mod.GlobalWorkerOptions.workerSrc = `${base}pdf.worker.min.mjs`;
  const doc = await mod.getDocument({ data: await f.arrayBuffer() }).promise, linhas: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    const its: ItemPdf[] = tc.items.filter((it) => it.str && it.str.trim()).map((it) => ({ s: it.str, x: it.transform[4]!, y: it.transform[5]!, w: it.width || 0 }));
    const rows: { y: number; items: ItemPdf[] }[] = [];
    its.sort((a, b) => b.y - a.y || a.x - b.x);
    for (const it of its) { const r = rows.find((q) => Math.abs(q.y - it.y) <= 3); if (r) r.items.push(it); else rows.push({ y: it.y, items: [it] }); }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      let s = '', pe: number | null = null;
      for (const it of r.items.sort((a, b) => a.x - b.x)) { s += (pe != null && it.x - pe > 1 ? ' ' : '') + it.s; pe = it.x + it.w; }
      linhas.push(s.replace(/\s+/g, ' ').trim());
    }
  }
  return linhas.join('\n');
}
