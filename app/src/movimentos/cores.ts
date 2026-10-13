// Cores das categorias: as da app atual e mais 8. Cada categoria nova recebe, ao acaso, uma cor que nenhuma
// outra está a usar (quando se esgotam, a menos usada). Guardadas em `categoryColors` (campo novo, só na app nova).
import type { Estado } from '../dados';
import { CATEGORIAS_BASE } from '../ui/icones';

export const TONS = ['blue', 'green', 'orange', 'pink', 'violet', 'red', 'yellow', 'cyan', 'teal', 'lime', 'amber', 'rose', 'indigo', 'sky', 'fuchsia', 'emerald'] as const;

export function coresCategorias(estado: Pick<Estado, 'extras'>): Record<string, string> {
  const c = estado.extras.categoryColors;
  return c && typeof c === 'object' && !Array.isArray(c) ? (c as Record<string, string>) : {};
}

/** Cor atual de cada categoria definida (a guardada, a da categoria base ou violeta). */
function emUso(estado: Pick<Estado, 'extras' | 'categories' | 'incomeCategories'>): string[] {
  const guardadas = coresCategorias(estado);
  return [...estado.categories, ...estado.incomeCategories].map((n) => guardadas[n] ?? CATEGORIAS_BASE.find((b) => b.name === n)?.tone ?? 'violet');
}

export function corNova(estado: Pick<Estado, 'extras' | 'categories' | 'incomeCategories'>, aleatorio: () => number = Math.random): string {
  const usos = new Map<string, number>(TONS.map((t) => [t, 0]));
  for (const t of emUso(estado)) if (usos.has(t)) usos.set(t, usos.get(t)! + 1);
  const minimo = Math.min(...usos.values());
  const livres = TONS.filter((t) => usos.get(t) === minimo);
  return livres[Math.floor(aleatorio() * livres.length)] ?? 'violet';
}

/** Ordem alfabética portuguesa (ignora maiúsculas e acentos). */
export const alfabetica = (l: readonly string[]) => [...l].sort((a, b) => String(a).localeCompare(String(b), 'pt-PT', { sensitivity: 'base' }));
