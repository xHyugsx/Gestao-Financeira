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
