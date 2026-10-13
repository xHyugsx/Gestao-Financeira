// Tolerância a erros de escrita do Jarvis — mesmas regras de js/modulos/jarvis-correcao.js.
// Os nomes das pessoas e dos animais não estão na lista fixa: vêm dos dados (vocabulário dinâmico).

const PALAVRAS = 'quanto quantos quantas quando qual quais quem onde como para pelo pela pelos pelas mais menos muito pouco este esta isto esse essa neste nesta deste desta nesse algum alguma tenho tens tive temos fiz feito feita feitos foram foi fui sobre entre todos todas tudo nada dia dias mês meses ano anos total valor preço custo custou gastamos gastaste recebemos pagamos pagou dinheiro loja lojas compra compras comprei fatura faturas mostra mostrar lista listar dizer sabes podes pode favor obrigado obrigada tarde noite olá confirmo cancela anterior seguinte próximo próxima próximos próximas último última últimos últimas primeiro primeira semana amanhã agora ainda vezes média médias mensal anual comparar compara comparado versus relação diferença maior menor cara caro barata barato gasto gastos gastei gastar despesa despesas receita receitas rendimento rendimentos salário salários ordenado vencimento saldo saldos conta contas combustível gasolina gasóleo abastecimento abastecimentos abastecer veterinário veterinária animal animais categoria categorias movimento movimentos registo registos lembrete lembretes vacina vacinas desparasitação interna externa atraso atrasado atrasada nota notas adiciona adicionar remove remover apaga apagar elimina eliminar muda mudar altera alterar corrige corrigir edita editar troca trocar confirmar cancelar desfazer backup restaurar cria criar fazer novo nova marca marcar principal revolut edenred conjunta paguei recebi ganhei passado passada hoje ontem anteontem janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro data categoria alimentação transportes saúde lazer habitação outros resumo análise calendário'.split(' ');
const ABREVIATURAS: Record<string, string> = { qto: 'quanto', qnt: 'quanto', qnto: 'quanto', qt: 'quanto', qts: 'quantos', tb: 'também', tbm: 'também', hj: 'hoje', ont: 'ontem', msm: 'mesmo', mt: 'muito', mto: 'muito', pq: 'porque', vc: 'você' };

const nz = (s: unknown) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Distância de Damerau-Levenshtein, com corte em `max`. */
function distancia(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) d[i] = [i];
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    let melhor = max + 1;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      if (d[i]![j]! < melhor) melhor = d[i]![j]!;
    }
    if (melhor > max) return max + 1;
  }
  return d[a.length]![b.length]!;
}

export interface Correcao { text: string; fixes: [string, string][] }

/** Corrige palavras mal escritas usando a lista fixa e `dinamico` (títulos, categorias, contas, pessoas, animais). */
export function corrigir(q: string, dinamico: string[] = []): Correcao {
  const voc: Record<string, string> = {};
  PALAVRAS.forEach((w) => { voc[nz(w)] = w; });
  dinamico.forEach((x) => String(x || '').split(/[^A-Za-zÀ-ÿ0-9]+/).forEach((w) => { if (w.length >= 4) voc[nz(w)] = voc[nz(w)] || w; }));
  const chaves = Object.keys(voc), fixes: [string, string][] = [];
  const text = String(q).replace(/[A-Za-zÀ-ÿ]+/g, (w, idx: number) => {
    const lw = nz(w);
    if (ABREVIATURAS[lw]) { fixes.push([w, ABREVIATURAS[lw]]); return ABREVIATURAS[lw]; }
    if (lw.length < 4 || voc[lw]) return w;
    const antes = nz(String(q).slice(0, idx));
    if (/notas?\b.*\b(com|sobre|dizer|diga|digam)\s+[a-z ]*$/.test(antes) || /[«"“]\s*[a-z ]*$/.test(antes)) return w;
    const max = lw.length >= 7 ? 2 : 1;
    let bd = max + 1, cands: string[] = [];
    chaves.forEach((k) => {
      if (k.length < 3) return;
      const dd = distancia(lw, k, max);
      if (dd < bd) { bd = dd; cands = [k]; } else if (dd === bd && dd <= max) cands.push(k);
    });
    if (bd <= max && cands.length > 1) { const mesmo = cands.filter((k) => k.length === lw.length); cands = mesmo.length === 1 ? mesmo : cands; }
    const unicos = cands.filter((k, i) => cands.findIndex((x) => voc[x] === voc[k]) === i);
    if (bd <= max && unicos.length === 1) { fixes.push([w, voc[unicos[0]!]!]); return voc[unicos[0]!]!; }
    return w;
  });
  return { text, fixes };
}
