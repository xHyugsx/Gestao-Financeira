// Movimentos recorrentes com periodicidade: a app cria sozinha a cópia seguinte quando chega a data.
// Campos novos (só na app nova): `recurringEvery` (meses) e `recurringDone` (a cópia seguinte já foi criada).
import { dia, type Movimento } from '../dados';
import { diaEMes } from './regras';

export const PERIODICIDADES = [
  { meses: 1, rotulo: 'Mensal' }, { meses: 2, rotulo: 'Bimestral' }, { meses: 3, rotulo: 'Trimestral' }, { meses: 12, rotulo: 'Anual' },
] as const;

/** Mesma data `meses` depois (dia limitado ao último dia do mês: 31 jan + 1 mês = 28/29 fev). */
export function somarMeses(data: string, meses: number): string {
  const [a, m, d] = data.split('-').map(Number) as [number, number, number];
  const alvo = new Date(a, m - 1 + meses, 1);
  alvo.setDate(Math.min(d, new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()));
  return dia(alvo);
}

/** Descrição com a data nova e o resto igual ("12 setembro · Habitação" → "12 outubro · Habitação"). */
function detalheCom(detail: string, data: string): string {
  const i = detail.indexOf(' · ');
  return i < 0 ? detail : `${diaEMes(data)}${detail.slice(i)}`;
}

const repete = (m: Movimento) => !!m.recurring && typeof m.recurringEvery === 'number' && m.recurringEvery > 0 && !m.recurringDone;

/**
 * Cria as cópias em falta até `hoje` (inclusive). Devolve a lista nova, ou `null` se não houver nada a criar.
 * Cada cópia continua a série; a anterior fica marcada como feita, por isso apagar ou desmarcar a última pára a série.
 */
export function gerarRecorrentes(movimentos: Movimento[], hoje: Date, novoId: () => number | string = (() => { let n = Date.now(); return () => n++; })()): Movimento[] | null {
  const limite = dia(hoje);
  let lista = movimentos, criados = 0;
  for (let procurar = true; procurar;) {
    procurar = false;
    for (const m of lista) {
      if (!repete(m) || !m.date) continue;
      const data = somarMeses(m.date, m.recurringEvery as number);
      if (data > limite) continue;
      const copia: Movimento = { ...m, id: novoId(), date: data, detail: detalheCom(m.detail, data) };
      delete copia.recurringDone; delete copia.importKey; delete copia.importBatch;
      if (m.recurring === 'sem') { copia.amount = 0; if (m.revolut) copia.transferValue = 0; }
      lista = [copia, ...lista.map((x) => (x === m ? { ...x, recurringDone: true } : x))];
      criados++;
      procurar = true;
      break;
    }
  }
  return criados ? lista : null;
}
