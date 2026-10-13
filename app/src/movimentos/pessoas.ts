// Quem fez a despesa: pessoas da família (perfil, ou as da tabela de salários) — nunca nomes no código.
import type { Estado, Movimento } from '../dados';

/** Pessoas para escolher: os membros do perfil; sem perfil, as pessoas com salários registados. */
export function pessoasDaFamilia(e: Pick<Estado, 'profile' | 'salaries'>): string[] {
  const membros = (e.profile.members || []).map((n) => String(n || '').trim()).filter(Boolean);
  if (membros.length) return [...new Set(membros)];
  const anos = Object.keys(e.salaries || {}).sort().reverse();
  for (const a of anos) { const p = Object.keys(e.salaries[a] ?? {}); if (p.length) return p; }
  return [];
}

/** Pessoa da despesa registada mais recentemente com pessoa (pré-escolhida no «Novo movimento»). */
export function ultimaPessoa(l: Movimento[], pessoas: string[]): string {
  let melhor: Movimento | null = null;
  for (const m of l) {
    if (m.movementType !== 'expense' || typeof m.person !== 'string' || !pessoas.includes(m.person)) continue;
    if (!melhor || m.date > melhor.date || (m.date === melhor.date && (+m.id || 0) > (+melhor.id || 0))) melhor = m;
  }
  return melhor?.person ?? '';
}
