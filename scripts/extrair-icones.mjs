// Gera app/src/ui/icones.ts a partir do núcleo 1.9.x (js/app.js): ícones (lucide, ISC),
// catálogo de ícones das categorias e categorias base, para o desenho ficar igual ao pixel.
// Uso único durante a migração: node scripts/extrair-icones.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const s = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function literal(desde) {
  let n = 0, i = desde;
  for (; i < s.length; i++) {
    if (s[i] === '[' || s[i] === '{') n++;
    else if (s[i] === ']' || s[i] === '}') { n--; if (n === 0) break; }
  }
  return s.slice(desde, i + 1);
}

const icones = {}, varParaNome = {};
for (const m of s.matchAll(/([\w$]+)=T\(`([\w-]+)`,\[/g)) {
  const nos = new Function(`return ${literal(m.index + m[0].length - 1)}`)();
  icones[m[2]] = nos.map(([tag, { key, ...attrs }]) => [tag, attrs]);
  varParaNome[m[1]] = m[2];
}
const nomeDe = (v) => { if (!varParaNome[v]) throw new Error(`ícone desconhecido: ${v}`); return varParaNome[v]; };
const i0 = s.indexOf('uc=[{id:`home`'), c0 = s.indexOf('cc=[{name:`Habitação`');

// Avalia a lista trocando cada variável de ícone por um marcador com o seu nome.
function avaliarComNomes(texto) {
  const marcadores = Object.fromEntries(Object.keys(varParaNome).map((v) => [v, { name: v }]));
  return new Function(...Object.keys(marcadores), `return ${texto}`)(...Object.values(marcadores));
}
const catalogo = avaliarComNomes(literal(i0 + 3)).map((e) => ({ id: e.id, label: e.label, icone: nomeDe(e.icon.name), grupo: e.g }));
const base = avaliarComNomes(literal(c0 + 3)).map((e) => ({ name: e.name, icone: nomeDe(e.icon.name), tone: e.tone, type: e.type }));

const saida = `// GERADO por scripts/extrair-icones.mjs a partir do núcleo 1.9.x — não editar à mão.
// Ícones: lucide (licença ISC), exatamente as versões usadas pela app atual.

export type NoIcone = readonly [string, Readonly<Record<string, string>>];

export const ICONES = {
${Object.entries(icones).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
} as const satisfies Record<string, readonly NoIcone[]>;

export type NomeIcone = keyof typeof ICONES;

/** Ícones que se podem escolher para uma categoria (id guardado em \`categoryIcons\`). */
export const CATALOGO_ICONES: readonly { id: string; label: string; icone: NomeIcone; grupo: string }[] = [
${catalogo.map((e) => `  ${JSON.stringify(e)},`).join('\n')}
];

/** Categorias de despesa base, com ícone e cor. */
export const CATEGORIAS_BASE: readonly { name: string; icone: NomeIcone; tone: string; type: string }[] = [
${base.map((e) => `  ${JSON.stringify(e)},`).join('\n')}
];
`;
writeFileSync(new URL('../app/src/ui/icones.ts', import.meta.url), saida);
console.log(`${Object.keys(icones).length} ícones, ${catalogo.length} no catálogo, ${base.length} categorias base`);
