// Categoria, ícone e cor de cada movimento — mesmas regras da app atual.
import { anoMes, inicioDoMes, type Dados, type Movimento } from '../dados';
import { CATALOGO_ICONES, CATEGORIAS_BASE, type NomeIcone } from '../ui/icones';

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
export function aspetosCategorias(dados: Pick<Dados, 'transactions' | 'categories' | 'incomeCategories' | 'categoryIcons'>, mes: Date) {
  const recentes = [...doMes(dados.transactions, mes), ...doMes(dados.transactions, inicioDoMes(mes, -1))];
  const aspeto = (nome: string, iconeExtra: Record<string, string>, corExtra: Record<string, string>): Aspeto => {
    const base = CATEGORIAS_BASE.find((c) => c.name === nome);
    return {
      icone: ICONE_POR_ID[dados.categoryIcons[nome] ?? ''] ?? base?.icone ?? ICONE_POR_ID[iconeExtra[nome] ?? ''] ?? ICONE_POR_ID.tags!,
      tone: base?.tone ?? corExtra[nome] ?? 'violet',
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
