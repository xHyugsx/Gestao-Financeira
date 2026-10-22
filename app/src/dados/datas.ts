export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] as const;

/** "AAAA-MM" da data dada (hora local). */
export function anoMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "AAAA-MM-DD" da data dada (hora local). */
export function dia(d: Date): string {
  return `${anoMes(d)}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 1.º dia do mês `delta` meses depois (ou antes) de `d`. */
export function inicioDoMes(d: Date, delta = 0): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

/**
 * Data atribuída a movimentos antigos gravados sem `date`: o dia vem do início do `detail`
 * ("12 setembro · …") e o mês é sempre setembro de 2026 — comportamento herdado da 1.9.x.
 */
export function dataPorOmissao(detail: unknown): string {
  const d = Number.parseInt(String(detail), 10) || 1;
  return `2026-09-${String(d).padStart(2, '0')}`;
}

/** Domingo de Páscoa do ano (calendário gregoriano, algoritmo de Meeus/Jones/Butcher). */
function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), diaP = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, diaP);
}

/** Feriados nacionais de Portugal do ano ("AAAA-MM-DD"): os de data fixa, a Sexta-feira Santa e o Corpo de Deus. */
export function feriados(ano: number): Set<string> {
  const fixos = ['01-01', '04-25', '05-01', '06-10', '08-15', '10-05', '11-01', '12-01', '12-08', '12-25'].map((x) => `${ano}-${x}`);
  const p = pascoa(ano), mais = (n: number) => dia(new Date(p.getFullYear(), p.getMonth(), p.getDate() + n));
  return new Set([...fixos, mais(-2), mais(60)]);
}

/** Dia do salário (vencimento): 3.º dia útil a contar do fim do mês de `mes` (sem fins de semana nem feriados nacionais). */
export function diaDeVencimento(mes: Date): number | null {
  const livres = feriados(mes.getFullYear());
  let contados = 0;
  for (let d = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate(); d > 0; d--) {
    const data = new Date(mes.getFullYear(), mes.getMonth(), d), semana = data.getDay();
    if (semana !== 0 && semana !== 6 && !livres.has(dia(data)) && ++contados === 3) return d;
  }
  return null;
}
