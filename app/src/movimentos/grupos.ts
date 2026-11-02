// Grupos de categorias (v2.44.0): cada categoria pode pertencer a um grupo, que é outra categoria da mesma lista
// (ex.: Habitação › Luz). Os movimentos continuam a guardar a sua categoria; os grupos ficam em `categoryGroups`
// (categoria → grupo), um campo novo nos dados principais. Só há dois níveis: um grupo não pertence a outro grupo.
import type { Estado } from '../dados';
import { simplificar } from './categorias';

export type MapaGrupos = Record<string, string>;

/** Grupos válidos para uma lista de categorias (despesas ou receitas): grupo e categoria existem e o grupo não tem grupo. */
export function gruposDe(estado: Pick<Estado, 'extras'>, lista: readonly string[]): MapaGrupos {
  const bruto = estado.extras.categoryGroups;
  if (!bruto || typeof bruto !== 'object') return {};
  const nomes = new Set(lista), r: MapaGrupos = {};
  for (const [cat, grupo] of Object.entries(bruto as Record<string, unknown>)) {
    if (typeof grupo === 'string' && cat !== grupo && nomes.has(cat) && nomes.has(grupo)) r[cat] = grupo;
  }
  const grupos = new Set(Object.values(r));
  for (const cat of Object.keys(r)) if (grupos.has(cat)) delete r[cat];  // um grupo não pertence a outro grupo
  return r;
}

/** Grupo de uma categoria (a própria, se não tiver grupo). */
export const grupoDe = (categoria: string, mapa: MapaGrupos) => mapa[categoria] ?? categoria;

/** Categorias que são grupo de alguma outra. */
export const comSubcategorias = (mapa: MapaGrupos) => new Set(Object.values(mapa));

/** Muda o grupo de uma categoria (vazio = sem grupo). */
export function definirGrupo<T extends Pick<Estado, 'extras'>>(e: T, categoria: string, grupo: string): T {
  const atual = { ...((e.extras.categoryGroups as MapaGrupos | undefined) ?? {}) };
  if (grupo && grupo !== categoria) atual[categoria] = grupo; else delete atual[categoria];
  return { ...e, extras: { ...e.extras, categoryGroups: atual } };
}

/** Tira uma categoria dos grupos (ao eliminar): sai do seu grupo e as suas subcategorias ficam soltas. */
export function tirarDosGrupos<T extends Pick<Estado, 'extras'>>(e: T, categoria: string): T {
  const atual = e.extras.categoryGroups as MapaGrupos | undefined;
  if (!atual) return e;
  return { ...e, extras: { ...e.extras, categoryGroups: Object.fromEntries(Object.entries(atual).filter(([c, g]) => c !== categoria && g !== categoria)) } };
}

/** Grupos sugeridos pelo nome das categorias (só para grupos que já existem e categorias ainda soltas). */
const PALAVRAS: [RegExp, RegExp][] = [
  [/habitacao|^casa$/, /renda|luz|eletric|energia|agua|gas\b|internet|telecom|telemovel|condominio|imi\b|limpeza|mobilia|obras/],
  [/alimentacao/, /supermercado|mercearia|restaura|cafe|padaria|talho|refeic|take.?away|almoco|jantar/],
  [/transportes?/, /combust|gasolin|gasoleo|portage|estaciona|parque|oficina|revisao|pneu|uber|bolt|comboio|metro|autocarro|passe|via verde|iuc/],
  [/saude/, /farmacia|medic|consulta|dentist|hospital|clinica|oculos|analises/],
  [/lazer/, /streaming|cinema|ferias|viage|desporto|ginasio|concerto|jogos|livros|netflix|spotify/],
  [/animais/, /veterin|racao|pet\b|tosquia/],
  [/educacao/, /escola|propina|curso|explica|material escolar/],
  [/seguros?/, /^seguro/],
];
export function sugerirGrupos(lista: readonly string[], mapa: MapaGrupos, vistas: readonly string[] = []): { grupo: string; categorias: string[] }[] {
  const grupos = comSubcategorias(mapa), r = new Map<string, string[]>();
  for (const cat of lista) {
    if (mapa[cat] || grupos.has(cat) || vistas.includes(cat)) continue;
    const n = simplificar(cat);
    for (const [g, p] of PALAVRAS) {
      const grupo = lista.find((x) => x !== cat && !mapa[x] && g.test(simplificar(x)));
      if (grupo && !g.test(n) && p.test(n)) { r.set(grupo, [...(r.get(grupo) ?? []), cat]); break; }
    }
  }
  return [...r].map(([grupo, categorias]) => ({ grupo, categorias }));
}

/** Linhas por categoria juntas por grupo (soma dos valores; `subs` com as categorias do grupo, a própria incluída). */
export function agruparLinhas<L extends { name: string; amount: number; anterior: number; share: number }>(linhas: L[], mapa: MapaGrupos): (L & { subs: L[] })[] {
  const total = linhas.reduce((s, l) => s + l.amount, 0);
  const porGrupo = new Map<string, L[]>();
  for (const l of linhas) { const g = grupoDe(l.name, mapa); porGrupo.set(g, [...(porGrupo.get(g) ?? []), l]); }
  return [...porGrupo].map(([g, subs]) => {
    const base = linhas.find((l) => l.name === g) ?? subs[0]!;
    const amount = subs.reduce((s, l) => s + l.amount, 0), anterior = subs.reduce((s, l) => s + l.anterior, 0);
    return { ...base, name: g, amount, anterior, share: total ? Math.round((amount / total) * 1000) / 10 : 0, subs: subs.length > 1 || subs[0]!.name !== g ? [...subs].sort((a, b) => b.amount - a.amount) : [] };
  }).sort((a, b) => b.amount - a.amount);
}

/** Opções de uma lista de escolha de categoria: soltas primeiro, depois cada grupo (o próprio e «Grupo › Categoria»). */
export function opcoesAgrupadas(lista: readonly string[], mapa: MapaGrupos): { grupo: string | null; itens: { valor: string; rotulo: string }[] }[] {
  const grupos = comSubcategorias(mapa);
  const soltas = lista.filter((c) => !mapa[c] && !grupos.has(c)).map((c) => ({ valor: c, rotulo: c }));
  return [
    ...(soltas.length ? [{ grupo: null, itens: soltas }] : []),
    ...lista.filter((c) => grupos.has(c)).map((g) => ({ grupo: g, itens: [{ valor: g, rotulo: g }, ...lista.filter((c) => mapa[c] === g).map((c) => ({ valor: c, rotulo: `${g} › ${c}` }))] })),
  ];
}
