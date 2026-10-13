import { chave, PREFIXO_REAL } from './chaves';
import { dataPorOmissao } from './datas';
import {
  APARENCIA_POR_OMISSAO, CAMPOS, type Aparencia, type Conta, type Estado, type Movimento, type Perfil,
  type Salarios, estadoInicial,
} from './esquema';

export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

export interface OpcoesGravar {
  prefixo?: string;
  aoGravar?: () => void;
  aoFalhar?: (erro: unknown) => void;
}

/** Interpreta o texto guardado; qualquer coisa inválida conta como "sem dados". */
export function lerJSON(texto: string | null): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(texto || '{}');
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Converte os dados guardados no estado da app, com as mesmas regras da 1.9.x ao arrancar:
 * cada campo só substitui o valor por omissão se for válido.
 */
export function normalizar(e: Record<string, unknown>): Estado {
  const s = estadoInicial();
  const tx = e.transactions;
  if (Array.isArray(tx) && tx.length) {
    s.transactions = tx.map((m: Movimento) => ({ ...m, date: m.date || dataPorOmissao(m.detail) }));
  }
  if (e.petPhotos) s.petPhotos = e.petPhotos as Record<string, string>;
  if (typeof e.notifications === 'boolean') s.notifications = e.notifications;
  if (typeof e.hideValues === 'boolean') s.hideValues = e.hideValues;
  if (Array.isArray(e.annualExpenses)) s.annualExpenses = e.annualExpenses;
  if (e.salaries && typeof e.salaries === 'object') s.salaries = e.salaries as Salarios;
  if (e.profile) s.profile = e.profile as Perfil;
  if (Array.isArray(e.categories) && e.categories.length) s.categories = e.categories as string[];
  if (Array.isArray(e.incomeCategories) && e.incomeCategories.length) {
    s.incomeCategories = e.incomeCategories.filter((c): c is string => typeof c === 'string');
  }
  if (e.categoryIcons && typeof e.categoryIcons === 'object') s.categoryIcons = e.categoryIcons as Record<string, string>;
  if (Array.isArray(e.accounts) && e.accounts.length >= 2) {
    s.accounts = (e.accounts as Conta[]).map((c) => (c.id === 'revolut' && c.name === 'Revolut' ? { ...c, name: 'Revolut Conjunta' } : c));
  }
  if (e.appearance) s.appearance = { ...APARENCIA_POR_OMISSAO, ...(e.appearance as Partial<Aparencia>) };
  if (e.pinHash) s.pinHash = e.pinHash as string;
  for (const [k, v] of Object.entries(e)) if (!(CAMPOS as readonly string[]).includes(k)) s.extras[k] = v;
  return s;
}

export function lerDados(armazenamento: Armazenamento, prefixo = PREFIXO_REAL): Estado {
  let texto: string | null = null;
  try {
    texto = armazenamento.getItem(chave('dados', prefixo));
  } catch {
    // armazenamento indisponível: arranca vazia, como a 1.9.x
  }
  return normalizar(lerJSON(texto));
}

/** Objeto gravado em `financas-familiar:v3`: mesmos campos e ordem da 1.9.x, mais os campos extra. */
export function paraGravar(s: Estado): Record<string, unknown> {
  return {
    transactions: s.transactions,
    petPhotos: s.petPhotos,
    notifications: s.notifications,
    hideValues: s.hideValues,
    annualExpenses: s.annualExpenses,
    salaries: s.salaries,
    profile: s.profile,
    categories: s.categories,
    incomeCategories: s.incomeCategories,
    categoryIcons: s.categoryIcons,
    accounts: s.accounts,
    appearance: s.appearance,
    ...(s.pinHash ? { pinHash: s.pinHash } : {}),
    ...s.extras,
  };
}

/** Grava o estado; devolve `false` (e chama `aoFalhar`) se não houver espaço ou o armazenamento falhar. */
export function gravarDados(armazenamento: Armazenamento, s: Estado, o: OpcoesGravar = {}): boolean {
  try {
    armazenamento.setItem(chave('dados', o.prefixo), JSON.stringify(paraGravar(s)));
    o.aoGravar?.();
    return true;
  } catch (erro) {
    o.aoFalhar?.(erro);
    return false;
  }
}
