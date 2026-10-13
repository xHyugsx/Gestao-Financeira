// Juntar os movimentos de outro telemóvel (a partir do backup dele): só entram os que ainda não existem aqui.
// Os movimentos juntados não mexem nos saldos deste telemóvel (`affectsBalance:false`) e ficam marcados com
// `mergeBatch`, para se poder desfazer a última junção. Os recorrentes continuam a série só no telemóvel de origem.
import { dataPorOmissao, type Estado, eObjeto, type Movimento } from '../dados';
import { categoriaDespesa, categoriaReceita, simplificar } from './categorias';

const assinatura = (m: Movimento) => `${m.date}|${Math.round(m.amount * 100)}|${simplificar(m.title).replace(/\s+/g, ' ').trim()}`;

export interface Juncao {
  novos: Movimento[];
  /** Movimentos do outro telemóvel que já existem aqui (mesmo id, mesma linha do extrato ou mesma data, valor e título). */
  repetidos: number;
}

export function prepararJuncao(locais: Movimento[], outros: unknown[]): Juncao {
  const ids = new Set(locais.map((m) => String(m.id)));
  const linhas = new Set(locais.map((m) => m.importKey).filter(Boolean));
  const livres = new Map<string, number>();
  for (const m of locais) livres.set(assinatura(m), (livres.get(assinatura(m)) || 0) + 1);
  const usar = (a: string) => { const n = livres.get(a) || 0; if (n) livres.set(a, n - 1); return n > 0; };
  const novos: Movimento[] = [];
  let repetidos = 0;
  for (const o of outros) {
    if (!eObjeto(o) || typeof o.amount !== 'number' || typeof o.title !== 'string') continue;
    const m = { ...o, date: (o.date as string) || dataPorOmissao(o.detail) } as Movimento;
    const a = assinatura(m);
    if (ids.has(String(m.id)) || (m.importKey && linhas.has(m.importKey))) { usar(a); repetidos++; continue; }
    if (usar(a)) { repetidos++; continue; }
    novos.push(m);
  }
  return { novos, repetidos };
}

export function aplicarJuncao(s: Estado, novos: Movimento[], lote: string): Estado {
  const marcados = novos.map((m) => ({ ...m, affectsBalance: false, mergeBatch: lote, ...(m.recurringEvery ? { recurringDone: true } : {}) }));
  const juntar = (lista: string[], tipo: 'expense' | 'income') => {
    const r = [...lista];
    for (const m of marcados) {
      if (m.movementType !== tipo) continue;
      const c = tipo === 'income' ? categoriaReceita(m) : categoriaDespesa(m);
      if (c && !r.includes(c) && r.length < 100) r.push(c);
    }
    return r;
  };
  return { ...s, transactions: [...marcados, ...s.transactions], categories: juntar(s.categories, 'expense'), incomeCategories: juntar(s.incomeCategories, 'income') };
}

export const novoLote = (agora = new Date()) => `juntar-${agora.toISOString()}`;

/** Lote da junção mais recente; vazio se não houver. */
export function ultimaJuncao(l: Movimento[]): string {
  return l.reduce((r, m) => (typeof m.mergeBatch === 'string' && m.mergeBatch > r ? m.mergeBatch : r), '');
}

export const semJuncao = (l: Movimento[], lote: string) => l.filter((m) => m.mergeBatch !== lote);
