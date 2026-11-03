// Ditado no «+»: tira o valor e o título de uma frase como «Gastei 12 euros no café» ou «45,90 no supermercado».

export interface Ditado { valor: number | null; titulo: string }

const VERBOS = /^(?:eu\s+)?(?:gastei|paguei|comprei|recebi|foram|foi|uma\s+despesa\s+de|despesa\s+de|despesa|registar|regista|adiciona|adicionar|mete|p[oõ]e)\b\s*/i;
const PREPOSICAO = /^(?:no|na|nos|nas|em|num|numa|de|do|da|dos|das|ao|à|aos|às|para|com|pelo|pela)\s+/i;
const MOEDA = /\s*(?:€|(?:euros?|eur)\b)\.?/i;

const maiuscula = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const limpar = (s: string) => s.replace(/[.,;:!?]+$/g, '').replace(/\s+/g, ' ').trim();

export function interpretarDitado(frase: string): Ditado {
  let t = ` ${frase.trim()} `;
  // «12 euros e 50 (cêntimos)» → 12.50
  let valor: number | null = null;
  const m = /(\d+(?:[.,]\d{1,2})?)(\s*(?:€|(?:euros?|eur)\b)\.?)?(?:\s+e\s+(\d{1,2})(?:\s*(?:c[eê]ntimos?))?)?/i.exec(t);
  if (m) {
    valor = Number(m[1]!.replace(',', '.'));
    if (m[3] && !/[.,]/.test(m[1]!)) valor += Number(m[3]) / (m[3].length === 1 ? 10 : 100);
    valor = Math.round(valor * 100) / 100;
    const antes = t.slice(0, m.index), depois = t.slice(m.index + m[0].length).replace(MOEDA, '');
    const resto = limpar(depois).replace(PREPOSICAO, '');
    t = resto || limpar(antes).replace(VERBOS, '');
  } else {
    t = limpar(t).replace(VERBOS, '').replace(PREPOSICAO, '');
  }
  return { valor: valor && valor > 0 ? valor : null, titulo: maiuscula(limpar(t)) };
}
