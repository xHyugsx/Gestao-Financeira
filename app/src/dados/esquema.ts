// Formato dos dados guardados em `financas-familiar:v3` (secção 3 do CLAUDE.md).
// Todos os tipos aceitam campos extra: dados que o código não conhece nunca são apagados.

export type TipoMovimento = 'expense' | 'income' | 'transfer';

export interface Movimento {
  id: number | string;
  title: string;
  /** "dia mês · Categoria" */
  detail: string;
  /** Negativo = despesa. */
  amount: number;
  /** AAAA-MM-DD */
  date: string;
  movementType?: TipoMovimento;
  account?: string;
  /** `true`, ou "sem" para recorrentes ainda sem valor definido. */
  recurring?: boolean | string;
  note?: string;
  pet?: string;
  /** `false` nos movimentos importados de extratos: não mexem no saldo. */
  affectsBalance?: boolean;
  importKey?: string;
  importBatch?: string;
  kind?: string;
  transferValue?: number;
  /** Transferência para uma conta Revolut. */
  revolut?: { holder?: string; [extra: string]: unknown };
  [extra: string]: unknown;
}

export interface Conta {
  id: string;
  name: string;
  balance?: number;
  /** Limite do aviso de saldo baixo. */
  lowAt?: number | null;
  /** AAAA-MM em que a conta foi criada. */
  createdAt?: string;
  /** Acertos ao saldo por mês (AAAA-MM → valor), ex.: tickets de refeição. */
  adj?: Record<string, number>;
  tickets?: string[];
  [extra: string]: unknown;
}

export interface Aparencia {
  accent: string;
  backgroundIntensity: number;
  fontScale: number;
  haptics: boolean;
  autoHide: string;
  [extra: string]: unknown;
}

export interface Perfil {
  profileName: string;
  email: string;
  phone: string;
  members: string[];
  [extra: string]: unknown;
}

/** Ano → pessoa → 12 valores mensais. */
export type Salarios = Record<string, Record<string, number[]>>;

export interface Dados {
  transactions: Movimento[];
  petPhotos: Record<string, string>;
  notifications: boolean;
  hideValues: boolean;
  annualExpenses: unknown[];
  salaries: Salarios;
  profile: Perfil;
  categories: string[];
  incomeCategories: string[];
  categoryIcons: Record<string, string>;
  accounts: Conta[];
  appearance: Aparencia;
  /** SHA-256 hexadecimal de "financas-familiar:" + PIN; vazio = sem PIN. */
  pinHash: string;
}

/** Dados + campos de topo desconhecidos, que são preservados ao gravar. */
export interface Estado extends Dados {
  extras: Record<string, unknown>;
}

export const CAMPOS: readonly (keyof Dados)[] = [
  'transactions', 'petPhotos', 'notifications', 'hideValues', 'annualExpenses', 'salaries', 'profile',
  'categories', 'incomeCategories', 'categoryIcons', 'accounts', 'appearance', 'pinHash',
];

export const CATEGORIAS_POR_OMISSAO = ['Habitação', 'Alimentação', 'Transportes', 'Animais', 'Lazer', 'Saúde', 'Educação', 'Seguros'];
export const CATEGORIAS_RECEITA_POR_OMISSAO = ['Salário', 'Investimentos', 'Reembolsos', 'Outras receitas'];
export const CONTAS_POR_OMISSAO: Conta[] = [
  { id: 'principal', name: 'Principal', balance: 0 },
  { id: 'revolut', name: 'Revolut Conjunta', balance: 0 },
];
export const APARENCIA_POR_OMISSAO: Aparencia = { accent: 'violet', backgroundIntensity: 75, fontScale: 100, haptics: true, autoHide: 'now' };
/**
 * Perfil de uma instalação nova. A 1.9.x traz nomes da família fixos no código; aqui fica vazio para não
 * os repetir no repositório público. Só afeta telemóveis sem dados (quem já usa a app tem o perfil gravado).
 */
export const PERFIL_POR_OMISSAO: Perfil = { profileName: '', email: '', phone: '', members: [] };

export function estadoInicial(): Estado {
  return {
    transactions: [],
    petPhotos: {},
    notifications: true,
    hideValues: false,
    annualExpenses: [],
    salaries: {},
    profile: structuredClone(PERFIL_POR_OMISSAO),
    categories: [...CATEGORIAS_POR_OMISSAO],
    incomeCategories: [...CATEGORIAS_RECEITA_POR_OMISSAO],
    categoryIcons: {},
    accounts: structuredClone(CONTAS_POR_OMISSAO),
    appearance: { ...APARENCIA_POR_OMISSAO },
    pinHash: '',
    extras: {},
  };
}

export function eObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
