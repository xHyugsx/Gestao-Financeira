// Salários registados como receitas com «Quem recebe» (v2.57.0): a tabela de Salários acompanha ao gravar, editar ou apagar.
import { eReceitaDeSalario, type Movimento, type Salarios } from '../dados';

/** Coluna da tabela quando ainda não há membros na família. */
export const COLUNA_SEM_MEMBROS = 'Salário';

const celula = (m: Movimento): string | null =>
  typeof m.person === 'string' && m.person && !m.skipped && eReceitaDeSalario(m) && /^\d{4}-\d{2}/.test(m.date) ? `${m.date.slice(0, 4)}|${Number(m.date.slice(5, 7)) - 1}|${m.person}` : null;

/**
 * Atualiza as células da tabela tocadas pelas receitas de salário com pessoa que mudaram entre `antes` e `depois`:
 * cada célula fica com a soma dessas receitas no mês. As outras células (escritas à mão, recibos, importações) não mudam.
 */
export function sincronizarSalarios(antes: Movimento[], depois: Movimento[], salarios: Salarios): Salarios {
  const tocadas = new Set<string>();
  const porId = new Map(antes.map((m) => [m.id, m]));
  const vistos = new Set<Movimento['id']>();
  for (const m of depois) {
    vistos.add(m.id);
    const a = porId.get(m.id);
    if (a === m) continue;
    const ca = a ? celula(a) : null, cd = celula(m);
    if (ca && (ca !== cd || a!.amount !== m.amount)) tocadas.add(ca);
    if (cd && (cd !== ca || a!.amount !== m.amount)) tocadas.add(cd);
  }
  for (const a of antes) if (!vistos.has(a.id)) { const c = celula(a); if (c) tocadas.add(c); }
  if (!tocadas.size) return salarios;
  const novo: Salarios = { ...salarios };
  for (const c of tocadas) {
    const [ano, mes, pessoa] = c.split('|') as [string, string, string];
    const soma = depois.filter((m) => celula(m) === c && m.amount > 0).reduce((s, m) => s + m.amount, 0);
    const doAno = { ...(novo[ano] ?? {}) }, lista = [...(doAno[pessoa] ?? Array(12).fill(0))];
    lista[Number(mes)] = Math.round(soma * 100) / 100;
    doAno[pessoa] = lista; novo[ano] = doAno;
  }
  return novo;
}
