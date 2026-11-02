import { describe, expect, it } from 'vitest';
import { estadoInicial, type Movimento } from '../dados';
import { categoriasDoPeriodo, diasSemDespesas, mesesDoPeriodo } from './calculos';

const m = (date: string, amount: number, categoria: string): Movimento =>
  ({ id: date + amount, title: 'X', detail: `1 x · ${categoria}`, date, amount, movementType: 'expense' });
const am = (l: Date[]) => l.map((d) => `${d.getFullYear()}-${d.getMonth() + 1}`);

describe('período do Resumo', () => {
  it('meses de cada período e os de comparação', () => {
    const out = new Date(2026, 9, 15);
    expect(am(mesesDoPeriodo(out, 'mes').meses)).toEqual(['2026-10']);
    expect(am(mesesDoPeriodo(out, 'mes').anteriores)).toEqual(['2026-9']);
    expect(am(mesesDoPeriodo(out, 'trimestre').meses)).toEqual(['2026-8', '2026-9', '2026-10']);
    expect(am(mesesDoPeriodo(out, 'trimestre').anteriores)).toEqual(['2026-5', '2026-6', '2026-7']);
    const ano = mesesDoPeriodo(new Date(2026, 2, 1), 'ano');
    expect(am(ano.meses)).toEqual(['2026-1', '2026-2', '2026-3']);
    expect(am(ano.anteriores)).toEqual(['2025-1', '2025-2', '2025-3']);
    expect(am(mesesDoPeriodo(new Date(2026, 1, 1), 'trimestre').meses)).toEqual(['2025-12', '2026-1', '2026-2']);
  });

  it('categorias somadas nos meses do período, com o anterior dos meses de comparação', () => {
    const e = { ...estadoInicial(), transactions: [m('2026-08-03', -100, 'Casa'), m('2026-09-03', -50, 'Casa'), m('2026-09-04', -150, 'Lazer'), m('2026-07-01', -20, 'Lazer')] };
    const l = categoriasDoPeriodo(e, [new Date(2026, 7, 1), new Date(2026, 8, 1)], [new Date(2026, 5, 1), new Date(2026, 6, 1)]);
    const casa = l.find((c) => c.name === 'Casa')!, lazer = l.find((c) => c.name === 'Lazer')!;
    expect([casa.amount, casa.share, casa.anterior]).toEqual([150, 50, 0]);
    expect([lazer.amount, lazer.share, lazer.anterior]).toEqual([150, 50, 20]);
  });

  it('dias sem despesas e a maior sequência a passar de um mês para o outro', () => {
    const l = [m('2026-08-01', -1, 'Casa'), ...Array.from({ length: 25 }, (_, i) => m(`2026-08-${String(i + 2).padStart(2, '0')}`, -1, 'Casa')), m('2026-09-05', -1, 'Casa')];
    // agosto: dias 27–31 sem despesas; setembro: 1–4 e 6–30 → a sequência 27/08–04/09 tem 9 dias, a de 6 a 30/09 tem 25
    expect(diasSemDespesas(l, [new Date(2026, 7, 1), new Date(2026, 8, 1)], new Date(2026, 9, 1))).toEqual({ dias: 34, seguidos: 25 });
    expect(diasSemDespesas(l, [new Date(2026, 7, 1), new Date(2026, 8, 1)], new Date(2026, 8, 4, 12))).toEqual({ dias: 9, seguidos: 9 });
  });
});
