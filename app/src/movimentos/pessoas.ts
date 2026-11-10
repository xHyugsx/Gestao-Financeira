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

// «Quem fez» (v2.61.0, decisões do dono): sem pessoa escolhida, a despesa é de **ambos** (com 3 ou mais membros, «Todos»);
// com um só membro, é sempre dele. Os dados guardados não mudam: uma despesa sem `person` passa a ler-se como de ambos.
export const rotuloAmbos = (n: number) => (n >= 3 ? 'Todos' : 'Ambos');

let atuais: string[] = [];
/** Membros atuais (a App chama a cada mudança; as linhas dos movimentos usam-nos para a etiqueta «Ambos»). */
export function definirPessoas(l: string[]) { atuais = l; }

/** Quem fez esta despesa, para mostrar: a pessoa escolhida; sem ela, o único membro ou «Ambos»/«Todos»; `null` sem membros. */
export function quemFez(m: Pick<Movimento, 'movementType' | 'person'>, pessoas: string[] = atuais): string | null {
  if (m.movementType !== 'expense') return typeof m.person === 'string' && m.person ? m.person : null;
  if (typeof m.person === 'string' && m.person) return m.person;
  if (pessoas.length === 1) return pessoas[0]!;
  return pessoas.length >= 2 ? rotuloAmbos(pessoas.length) : null;
}

/** Opções de «Quem fez»: «Ambos»/«Todos» primeiro (valor vazio = de ambos) e depois cada membro, com as cores fixas. */
export function opcoesQuemFez(pessoas: string[], extra: string[] = []) {
  const nomes = [...new Set([...pessoas, ...extra.filter(Boolean)])];
  return [{ valor: '', rotulo: rotuloAmbos(pessoas.length), classe: 'ffpambos' },
    ...nomes.map((p, k) => ({ valor: p, rotulo: p, classe: k === 0 ? 'ffp1' : k === 1 ? 'ffp2' : undefined }))];
}

/** Nome para a saudação: o do perfil se for um dos membros (ou se não houver membros); senão, o único membro; senão, nenhum. */
export function nomeParaSaudar(perfil: string | undefined, membros: string[]): string {
  const p = (perfil || '').trim().split(/\s+/)[0] || '';
  const primeiro = (n: string) => n.trim().split(/\s+/)[0]!.toLocaleLowerCase('pt-PT');
  if (p && (!membros.length || membros.some((m) => primeiro(m) === p.toLocaleLowerCase('pt-PT')))) return p;
  return membros.length === 1 ? membros[0]!.trim().split(/\s+/)[0]! : '';
}
