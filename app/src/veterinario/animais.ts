/**
 * Animais da família: vêm do perfil (`profile.pets`, Definições › Perfil e família). Enquanto o perfil não os
 * tiver, são deduzidos dos dados (lembretes, despesas veterinárias e fotografias) — sem nomes no código.
 */
import type { Estado } from '../dados';

export interface Animal { name: string; sex: 'm' | 'f' }

let atuais: Animal[] = [];

const eAnimal = (a: unknown): a is Animal => !!a && typeof a === 'object' && typeof (a as Animal).name === 'string' && !!(a as Animal).name.trim();

/** Animais definidos no perfil ou, se não houver, deduzidos dos dados (o 1.º macho e o 2.º fêmea, como na app anterior). */
export function animaisDe(e: Pick<Estado, 'profile' | 'transactions' | 'petPhotos'>, lembretes: { pet?: unknown }[] = []): Animal[] {
  const definidos = Array.isArray(e.profile.pets) ? e.profile.pets.filter(eAnimal) : [];
  if (definidos.length) return definidos.map((a) => ({ name: a.name.trim(), sex: a.sex === 'f' ? 'f' : 'm' }));
  const nomes: string[] = [];
  const juntar = (n: unknown) => { if (typeof n === 'string' && n.trim() && !nomes.includes(n.trim())) nomes.push(n.trim()); };
  lembretes.forEach((r) => juntar(r.pet));
  [...e.transactions].filter((m) => m.pet).sort((a, b) => a.date.localeCompare(b.date)).forEach((m) => juntar(m.pet));
  Object.keys(e.petPhotos || {}).forEach(juntar);
  return nomes.map((name, i) => ({ name, sex: i === 1 ? 'f' : 'm' }));
}

/** Atualizado pela app a cada alteração dos dados; usado pelas páginas, pelos lembretes e pelo Jarvis. */
export const definirAnimais = (l: Animal[]) => { atuais = l; };
export const animais = () => atuais.map((a) => a.name);
const sexo = (nome: string) => atuais.find((a) => a.name === nome)?.sex;

/** Avatar de um animal sem fotografia (mesmos símbolos da app anterior). */
export function simboloDoAnimal(nome: string): string {
  const s = sexo(nome);
  return s === 'm' ? '♂️' : s === 'f' ? '♀️' : String(nome).slice(0, 1);
}

/** Classe do avatar (as classes `sam`/`lola` vêm do CSS da app anterior: macho/fêmea). */
export const classeDoAnimal = (nome: string) => (sexo(nome) === 'm' ? 'sam' : sexo(nome) === 'f' ? 'lola' : 'other');

/** «do Rex» / «da Nina». */
export const deAnimal = (nome: string) => `${sexo(nome) === 'f' ? 'da' : 'do'} ${nome}`;
