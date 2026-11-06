// Sugestões no «Novo movimento» a partir do histórico: títulos já usados e a categoria usada da última vez.
import type { Movimento } from '../dados';
import { categoriaDespesa, categoriaReceita, simplificar } from './categorias';

const chave = (t: unknown) => simplificar(t).replace(/\s+/g, ' ').trim();
const recentes = (l: Movimento[], tipo: 'expense' | 'income') =>
  l.filter((m) => m.movementType === tipo && m.title).sort((a, b) => b.date.localeCompare(a.date) || (+b.id || 0) - (+a.id || 0));

/** Títulos já usados neste tipo de movimento, do mais recente para o mais antigo, sem repetidos. */
export function titulosAnteriores(l: Movimento[], tipo: 'expense' | 'income', max = 60): string[] {
  const vistos = new Set<string>(), r: string[] = [];
  for (const m of recentes(l, tipo)) {
    const k = chave(m.title);
    if (!k || vistos.has(k)) continue;
    vistos.add(k); r.push(m.title.trim());
    if (r.length >= max) break;
  }
  return r;
}

/** Categoria do movimento mais recente com o mesmo título (sem acentos nem maiúsculas); `null` se não houver. */
export function categoriaSugerida(l: Movimento[], titulo: string, tipo: 'expense' | 'income'): string | null {
  const k = chave(titulo);
  if (!k) return null;
  const m = recentes(l, tipo).find((x) => chave(x.title) === k);
  return m ? (tipo === 'income' ? categoriaReceita(m) : categoriaDespesa(m)) : null;
}

// Palavras comuns → categorias candidatas (a primeira que existir na lista da pessoa). Sem nomes pessoais (v2.59.0).
const PALAVRAS: { tipo: 'expense' | 'income'; re: RegExp; cats: string[] }[] = [
  { tipo: 'income', re: /\b(salario|ordenado|vencimento|subsidio de (ferias|natal))\b/, cats: ['Salário', 'Salários'] },
  { tipo: 'income', re: /\b(reembolso|devolucao|irs)\b/, cats: ['Reembolsos'] },
  { tipo: 'income', re: /\b(juros|dividendos?|acoes|certificados?)\b/, cats: ['Investimentos'] },
  { tipo: 'expense', re: /\b(gasolina|gasoleo|combustivel|abastecimento|galp|repsol|bp|prio|cepsa)\b/, cats: ['Combustível', 'Combustíveis', 'Transportes'] },
  { tipo: 'expense', re: /\b(uber|bolt|portage(m|ns)|via verde|metro|comboio|cp|carris|autocarro|passe|estacionamento|parque|oficina|pneus?|inspecao|iuc|taxi)\b/, cats: ['Transportes'] },
  { tipo: 'expense', re: /\b(renda|condominio|luz|eletricidade|edp|endesa|agua|gas|internet|meo|nos|vodafone|digi|telemovel|telefone|ikea|leroy|obras|casa)\b/, cats: ['Habitação', 'Casa'] },
  { tipo: 'expense', re: /\b(farmacia|medico|medica|consulta|dentista|hospital|clinica|analises|oculista|otica|wells|cuf|lusiadas)\b/, cats: ['Saúde'] },
  { tipo: 'expense', re: /\b(veterinari[oa]|racao|petshop|pet|tiendanimal|zooplus)\b/, cats: ['Veterinário', 'Animais'] },
  { tipo: 'expense', re: /\b(seguro|seguros|fidelidade|tranquilidade|ageas|allianz|zurich|generali|ok teleseguros)\b/, cats: ['Seguros'] },
  { tipo: 'expense', re: /\b(escola|propinas|livros?|explicac(ao|oes)|creche|universidade|curso|material escolar)\b/, cats: ['Educação'] },
  { tipo: 'expense', re: /\b(restaurante|cafe|pastelaria|padaria|pizza|sushi|hamburguer|mcdonalds|burger king|kfc|jantar|almoco|lanche|bar|uber eats|glovo|bolt food)\b/, cats: ['Restauração', 'Restaurantes', 'Alimentação', 'Lazer'] },
  { tipo: 'expense', re: /\b(netflix|spotify|disney|hbo|max|prime video|youtube|apple|icloud|cinema|teatro|concerto|bilhetes?|ginasio|jogos?|playstation|steam|ferias|hotel|viagem)\b/, cats: ['Subscrições', 'Lazer'] },
  { tipo: 'expense', re: /\b(continente|pingo doce|lidl|aldi|mercadona|auchan|intermarche|minipreco|meu super|supermercado|mercado|talho|peixaria|frutaria|mercearia)\b/, cats: ['Alimentação', 'Supermercado'] },
  { tipo: 'expense', re: /\b(roupa|sapatos|zara|primark|h&m|decathlon|worten|fnac|amazon|compras|presente|cabeleireiro|barbeiro)\b/, cats: ['Compras', 'Vestuário', 'Lazer'] },
];

/** Categoria sugerida por palavras comuns do título (ex.: «Renda» → Habitação), só entre as `cats` que a pessoa tem; `null` se nenhuma servir. */
export function categoriaPeloTitulo(titulo: string, cats: string[], tipo: 'expense' | 'income'): string | null {
  const t = ` ${chave(titulo)} `;
  if (!t.trim()) return null;
  for (const r of PALAVRAS) {
    if (r.tipo !== tipo || !r.re.test(t)) continue;
    const c = r.cats.find((x) => cats.includes(x));
    if (c) return c;
  }
  return null;
}
