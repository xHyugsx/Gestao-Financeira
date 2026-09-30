// Categoria, ícone e cor de cada movimento — mesmas regras da app atual.
import { anoMes, inicioDoMes, type Dados, type Movimento } from '../dados';
import { CATALOGO_ICONES, CATEGORIAS_BASE, type NomeIcone } from '../ui/icones';
import { coresCategorias } from './cores';

const ICONE_POR_ID: Record<string, NomeIcone> = Object.fromEntries(CATALOGO_ICONES.map((e) => [e.id, e.icone]));
const ICONE_RECEITA: Record<string, string> = { 'Salário': 'work', Investimentos: 'invest', Reembolsos: 'bills', 'Outras receitas': 'cash' };
const COR_RECEITA: Record<string, string> = { 'Salário': 'green', Investimentos: 'blue', Reembolsos: 'violet', 'Outras receitas': 'yellow' };
const ICONE_DESPESA: Record<string, string> = { 'Combustível': 'fuel', Outros: 'tags' };
const COR_DESPESA: Record<string, string> = { 'Combustível': 'orange', Outros: 'violet' };

/** Texto sem acentos e em minúsculas (pesquisas e comparações). */
export function simplificar(t: unknown): string {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Categoria escrita no fim do `detail` ("12 setembro · Alimentação"). */
export function categoriaDoDetalhe(m: Movimento): string {
  return (m.detail.split('·').pop() || '').trim();
}

export function categoriaDespesa(m: Movimento): string {
  return m.pet ? 'Animais' : categoriaDoDetalhe(m) || 'Outros';
}

export function categoriaReceita(m: Movimento): string {
  return categoriaDoDetalhe(m) || 'Outras receitas';
}

export interface Aspeto {
  icone: NomeIcone;
  tone: string;
}

export type AspetosCategorias = Map<string, Aspeto>;

function doMes(movimentos: Movimento[], mes: Date): Movimento[] {
  const am = anoMes(mes);
  return movimentos.filter((m) => m.date.startsWith(am));
}

/**
 * Ícone e cor das categorias conhecidas no mês selecionado: as categorias definidas mais as que aparecem
 * nos movimentos desse mês e do anterior (a app atual só conhece estas ao desenhar a lista).
 */
export function aspetosCategorias(dados: Pick<Dados, 'transactions' | 'categories' | 'incomeCategories' | 'categoryIcons'> & { extras?: Record<string, unknown> }, mes: Date) {
  const cores = coresCategorias({ extras: dados.extras ?? {} });
  const recentes = [...doMes(dados.transactions, mes), ...doMes(dados.transactions, inicioDoMes(mes, -1))];
  const aspeto = (nome: string, iconeExtra: Record<string, string>, corExtra: Record<string, string>): Aspeto => {
    const base = CATEGORIAS_BASE.find((c) => c.name === nome);
    return {
      icone: ICONE_POR_ID[dados.categoryIcons[nome] ?? ''] ?? base?.icone ?? ICONE_POR_ID[iconeExtra[nome] ?? ''] ?? ICONE_POR_ID.tags!,
      tone: cores[nome] ?? base?.tone ?? corExtra[nome] ?? 'violet',
    };
  };
  const despesas: AspetosCategorias = new Map(
    [...new Set([...dados.categories, ...recentes.filter((m) => m.movementType === 'expense').map(categoriaDespesa)])]
      .map((n) => [n, aspeto(n, ICONE_DESPESA, COR_DESPESA)]),
  );
  const receitas: AspetosCategorias = new Map(
    [...new Set([...dados.incomeCategories, ...recentes.filter((m) => m.movementType === 'income').map(categoriaReceita)])]
      .map((n) => [n, aspeto(n, ICONE_RECEITA, COR_RECEITA)]),
  );
  return { despesas, receitas };
}

/** Ícone por "tipo" usado quando o movimento não tem categoria conhecida. */
export function iconePorTipo(kind: unknown): NomeIcone {
  switch (kind) {
    case 'car': return 'car';
    case 'home': return 'shield-check';
    case 'shop': return 'shopping-cart';
    case 'health': return 'heart-pulse';
    case 'leisure': return 'gamepad-2';
    case 'transfer': return 'arrow-right-left';
    default: return 'wallet-cards';
  }
}

export function aspetoDoMovimento(m: Movimento, a: ReturnType<typeof aspetosCategorias>): Aspeto | null {
  if (m.revolut || (m.movementType !== 'expense' && m.movementType !== 'income')) return null;
  return (m.movementType === 'income' ? a.receitas.get(categoriaReceita(m)) : a.despesas.get(categoriaDespesa(m))) ?? null;
}

/** Erro no nome de uma categoria nova ou renomeada (`null` se estiver bem). */
export function erroNomeCategoria(dados: Pick<Dados, 'categories' | 'incomeCategories'>, nome: string, antigo?: string): string | null {
  if (!nome) return 'Escreva o nome da categoria.';
  if (nome.length > 40) return 'Use no máximo 40 caracteres.';
  const igual = (a: string, b: string) => a.toLocaleLowerCase('pt-PT') === b.toLocaleLowerCase('pt-PT');
  if ([...dados.categories, ...dados.incomeCategories].some((c) => c !== antigo && igual(String(c), nome))) return 'Essa categoria já existe.';
  return null;
}

/** Muda o nome de uma categoria nas listas, nos movimentos existentes, no ícone e na cor. */
export function renomearCategoria<T extends Pick<Dados, 'transactions' | 'categories' | 'incomeCategories' | 'categoryIcons'> & { extras: Record<string, unknown> }>(
  dados: T, antigo: string, novo: string,
): T {
  const trocar = (l: string[]) => l.map((c) => (c === antigo ? novo : c));
  const moverChave = (o: Record<string, string>) => {
    if (!(antigo in o)) return o;
    const n = { ...o, [novo]: o[antigo]! };
    delete n[antigo];
    return n;
  };
  const cores = dados.extras.categoryColors as Record<string, string> | undefined;
  return {
    ...dados,
    categories: trocar(dados.categories),
    incomeCategories: trocar(dados.incomeCategories),
    categoryIcons: moverChave(dados.categoryIcons),
    extras: cores ? { ...dados.extras, categoryColors: moverChave(cores) } : dados.extras,
    transactions: dados.transactions.map((m) => {
      const partes = m.detail.split('·');
      return partes.length < 2 || partes.at(-1)?.trim() !== antigo ? m : { ...m, detail: `${partes.slice(0, -1).join('·').trim()} · ${novo}` };
    }),
  };
}
