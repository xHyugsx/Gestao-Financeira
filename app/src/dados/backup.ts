// Cópia de segurança (JSON exportado). O formato tem de continuar restaurável pela 1.9.x e vice-versa.
import { dataPorOmissao } from './datas';
import {
  APARENCIA_POR_OMISSAO, CAMPOS, type Aparencia, type Conta, type Estado, type Movimento, type Perfil,
  type Salarios, eObjeto,
} from './esquema';

export interface Backup {
  app: 'financas-familiar';
  version: 4;
  exportedAt: string;
  data: Record<string, unknown>;
  jarvisThreads: unknown[];
  vetReminders: unknown[];
}

export interface ExtrasBackup {
  jarvisThreads: unknown[];
  vetReminders: unknown[];
  agora?: Date;
}

export function criarBackup(s: Estado, { jarvisThreads, vetReminders, agora = new Date() }: ExtrasBackup): Backup {
  return {
    app: 'financas-familiar',
    version: 4,
    exportedAt: agora.toISOString(),
    data: {
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
    },
    jarvisThreads,
    vetReminders,
  };
}

export function nomeFicheiroBackup(agora = new Date()): string {
  return `financas-familiar-backup-${agora.toISOString().slice(0, 10)}.json`;
}

export type LeituraBackup =
  | { ok: true; dados: Record<string, unknown>; jarvisThreads?: unknown[]; vetReminders?: unknown[] }
  | { ok: false };

/** Aceita o backup completo (`{ data: … }`) ou só os dados; exige uma lista de movimentos. */
export function lerBackup(texto: string): LeituraBackup {
  try {
    const t: unknown = JSON.parse(texto);
    const dados = eObjeto(t) && t.data !== undefined && t.data !== null ? t.data : t;
    if (!eObjeto(dados) || !Array.isArray(dados.transactions)) return { ok: false };
    return {
      ok: true,
      dados,
      ...(eObjeto(t) && Array.isArray(t.jarvisThreads) ? { jarvisThreads: t.jarvisThreads } : {}),
      ...(eObjeto(t) && Array.isArray(t.vetReminders) ? { vetReminders: t.vetReminders } : {}),
    };
  } catch {
    return { ok: false };
  }
}

/**
 * Aplica os dados de um backup ao estado atual, com as regras da 1.9.x: movimentos e fotografias são
 * substituídos; os outros campos só mudam se o backup os tiver válidos.
 * Diferença intencional: movimentos sem data recebem a data por omissão (a 1.9.x só o fazia ao reabrir).
 */
export function aplicarBackup(atual: Estado, n: Record<string, unknown>): Estado {
  const s: Estado = { ...atual, extras: { ...atual.extras } };
  s.transactions = (n.transactions as unknown[])
    .filter((m): m is Movimento => eObjeto(m) && typeof m.amount === 'number' && typeof m.title === 'string')
    .map((m) => ({ ...m, date: m.date || dataPorOmissao(m.detail) }));
  s.petPhotos = n.petPhotos && typeof n.petPhotos === 'object' ? (n.petPhotos as Record<string, string>) : {};
  if (typeof n.notifications === 'boolean') s.notifications = n.notifications;
  if (typeof n.hideValues === 'boolean') s.hideValues = n.hideValues;
  if (Array.isArray(n.annualExpenses)) s.annualExpenses = n.annualExpenses;
  if (n.salaries && typeof n.salaries === 'object') s.salaries = n.salaries as Salarios;
  if (n.profile && typeof n.profile === 'object') s.profile = n.profile as Perfil;
  if (Array.isArray(n.categories) && n.categories.length) {
    s.categories = n.categories.filter((c): c is string => typeof c === 'string').slice(0, 100);
  }
  if (Array.isArray(n.incomeCategories) && n.incomeCategories.length) {
    s.incomeCategories = n.incomeCategories.filter((c): c is string => typeof c === 'string').slice(0, 100);
  }
  if (n.categoryIcons && typeof n.categoryIcons === 'object') s.categoryIcons = n.categoryIcons as Record<string, string>;
  if (Array.isArray(n.accounts) && n.accounts.length >= 2) s.accounts = n.accounts as Conta[];
  if (n.appearance && typeof n.appearance === 'object') s.appearance = { ...APARENCIA_POR_OMISSAO, ...(n.appearance as Partial<Aparencia>) };
  if (typeof n.pinHash === 'string') s.pinHash = n.pinHash;
  for (const [k, v] of Object.entries(n)) if (!(CAMPOS as readonly string[]).includes(k)) s.extras[k] = v;
  return s;
}
