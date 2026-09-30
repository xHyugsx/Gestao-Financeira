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
