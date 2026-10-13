// Sugestões no «Novo movimento» a partir do histórico: títulos já usados e a categoria usada da última vez.
import type { Movimento } from '../dados';
import { categoriaDespesa, categoriaReceita, simplificar } from './categorias';

const chave = (t: unknown) => simplificar(t).replace(/\s+/g, ' ').trim();
const recentes = (l: Movimento[], tipo: 'expense' | 'income') =>
  l.filter((m) => m.movementType === tipo && m.title).sort((a, b) => b.date.localeCompare(a.date) || (+b.id || 0) - (+a.id || 0));

/** Títulos já usados neste tipo de movimento, do mais recente para o mais antigo, sem repetidos. */
export function titulosAnteriores(l: Movimento[], tipo: 'expense' | 'income', max = 60): string[] {
  const vistos = new Set<string>(), r: string[] = [];
  for (const m of recentes(l, tipo)) {
    const k = chave(m.title);
    if (!k || vistos.has(k)) continue;
    vistos.add(k); r.push(m.title.trim());
    if (r.length >= max) break;
  }
  return r;
}

/** Categoria do movimento mais recente com o mesmo título (sem acentos nem maiúsculas); `null` se não houver. */
export function categoriaSugerida(l: Movimento[], titulo: string, tipo: 'expense' | 'income'): string | null {
  const k = chave(titulo);
  if (!k) return null;
  const m = recentes(l, tipo).find((x) => chave(x.title) === k);
  return m ? (tipo === 'income' ? categoriaReceita(m) : categoriaDespesa(m)) : null;
}
