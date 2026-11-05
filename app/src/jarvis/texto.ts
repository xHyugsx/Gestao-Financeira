// Utilitários de texto do Jarvis (mesmas regras da app atual).

/** Sem acentos e em minúsculas. */
export const semAcentos = (s: unknown) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Sem acentos, só letras e algarismos separados por um espaço. */
export const normal = (s: unknown) => semAcentos(s).replace(/[^a-z0-9]+/g, ' ').trim();

/** Valores com cêntimos escritos no texto ("1.234,56", "12,30", "1,234.56", "12.30"). */
export function valores(s: string): number[] {
  return [...String(s).matchAll(/(?<![\d.,])(?:\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})(?![.,]?\d)/g)].map((m) => {
    const v = m[0];
    return Number(v.lastIndexOf(',') > v.lastIndexOf('.') ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, ''));
  });
}

/** Primeiro valor do texto; aceita também inteiros ("45 €", "45"). */
export function valorNoTexto(s: string): number | null {
  const a = valores(s);
  if (a.length) return a[0]!;
  const m = s.match(/(\d+)\s*(?:€|eur\b|euros?)/i) || s.match(/\b(\d+)\b/);
  return m ? +m[1]! : null;
}

export const categoriaNoTexto = (nrm: string, lista: string[]) => lista.find((c) => nrm.includes(semAcentos(c)));

const PALAVRAS_DO_PEDIDO = new Set([
  'adiciona', 'adicionar', 'adicione', 'regista', 'registar', 'registe', 'lanca', 'lança', 'lancar', 'lançar', 'lance', 'por', 'favor', 'hoje',
  'uma', 'um', 'o', 'a', 'os', 'as', 'despesa', 'receita', 'gasto', 'movimento', 'rendimento', 'extra', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'com', 'para', 'euro', 'euros', 'eur', '€', 'valor', 'conta',
]);
const MINUSCULAS = new Set(['de', 'do', 'da', 'dos', 'das', 'e']);

/** Título de um registo pedido ao Jarvis: o texto sem o verbo, o valor e as palavras de ligação («adiciona 15€ no pingo doce» → «Pingo Doce»). */
export function tituloDoRegisto(q: string): string {
  const palavras = q.toLocaleLowerCase('pt-PT').replace(/(\d)\s*€/g, '$1 €').split(/\s+/).map((p) => p.replace(/^[«"'(]+|[»"'),.!?;:]+$/g, '')).filter(Boolean);
  const util = palavras.filter((p) => !/^[\d.,]+€?$/.test(p) && !PALAVRAS_DO_PEDIDO.has(p));
  // tira as palavras de ligação que ficaram no início ou no fim
  while (util.length && MINUSCULAS.has(util[0]!)) util.shift();
  while (util.length && MINUSCULAS.has(util.at(-1)!)) util.pop();
  return util.map((p, i) => (i && MINUSCULAS.has(p) ? p : p.charAt(0).toLocaleUpperCase('pt-PT') + p.slice(1))).join(' ').slice(0, 60);
}
