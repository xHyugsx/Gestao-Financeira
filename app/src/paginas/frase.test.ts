import { describe, expect, it } from 'vitest';
import type { Movimento } from '../dados';
import { fraseDoDia } from './frase';

let n = 0;
const m = (date: string, title: string, amount: number, cat: string, extra: Partial<Movimento> = {}): Movimento =>
  ({ id: ++n, title, date, amount, detail: `1 outubro · ${cat}`, movementType: amount < 0 ? 'expense' : 'income', ...extra });
const HOJE = new Date(2026, 9, 11, 12);  // 11 de outubro

describe('frase do dia', () => {
  it('compara com o mesmo dia do mês anterior', () => {
    const l = [m('2026-10-03', 'A', -100, 'Lazer'), m('2026-09-04', 'B', -250, 'Lazer'), m('2026-09-20', 'C', -900, 'Lazer')];
    expect(fraseDoDia({ transactions: l }, HOJE)).toBe('Até hoje gastaste 150 € menos do que em setembro no mesmo dia 👏');
  });

  it('categoria só conta com gastos nas duas semanas; dias seguidos sem despesas; poupança', () => {
    const l = [m('2026-09-30', 'Mercado', -80, 'Alimentação'), m('2026-10-07', 'Mercado', -40, 'Alimentação'), m('2026-09-29', 'Renda', -600, 'Habitação')];
    const frases = new Set(Array.from({ length: 6 }, (_, i) => fraseDoDia({ transactions: l }, new Date(2026, 9, 10 + (i % 2), 12))));
    expect([...frases].some((f) => f?.includes('menos 50% em Alimentação'))).toBe(true);
    expect([...frases].some((f) => f?.includes('Habitação'))).toBe(false);
    expect(fraseDoDia({ transactions: [m('2026-10-07', 'X', -5, 'Lazer')] }, HOJE)).toBe('3 dias seguidos sem despesas. Continua assim!');
    expect(fraseDoDia({ transactions: [m('2026-10-11', 'Poupança', -200, 'Poupança')] }, HOJE)).toBe('Este mês já puseste 200 € de parte 💪');
  });

  it('sem nada a dizer', () => {
    expect(fraseDoDia({ transactions: [m('2026-10-11', 'X', -5, 'Lazer')] }, HOJE)).toBeNull();
  });

  it('recorrentes por pagar', () => {
    const l = [{ ...m('2026-09-20', 'Internet', -40, 'Casa'), recurring: 'com' as const }, m('2026-10-11', 'X', -5, 'Lazer')];
    expect(fraseDoDia({ transactions: l }, HOJE)).toBe('Falta pagar 1 recorrente este mês (≈ 40\u00a0€).');
  });

  it('lembra os recorrentes de valor variável por confirmar (este mês e o anterior)', () => {
    const v = (date: string, title: string) => ({ ...m(date, title, 0, 'Casa'), movementType: 'expense' as const, recurring: 'sem' as const });
    expect(fraseDoDia({ transactions: [v('2026-10-05', 'Luz'), v('2026-09-28', 'Água '), v('2026-10-06', 'Luz')] }, HOJE))
      .toBe('Falta confirmar o valor de Luz e Água: toca no movimento e escreve o valor deste mês.');
    expect(fraseDoDia({ transactions: [v('2026-08-05', 'Luz'), m('2026-10-07', 'X', -5, 'Lazer')] }, HOJE)).not.toMatch(/confirmar/);
  });

  it('cópias saltadas não pedem para confirmar o valor', () => {
    const v = { ...m('2026-10-05', 'Luz', 0, 'Casa'), movementType: 'expense' as const, recurring: 'sem' as const, skipped: true };
    expect(fraseDoDia({ transactions: [v] }, HOJE) ?? '').not.toMatch(/confirmar/);
  });

  it('lembra as despesas anuais deste mês ainda por pagar', () => {
    const annualExpenses = [{ id: 1, name: 'IUC', value: 150, month: 10, year: 2026 }, { id: 2, name: 'Seguro', value: 300, month: 11, year: 2026 }];
    expect(fraseDoDia({ transactions: [], annualExpenses }, HOJE)).toBe('Este mês há uma despesa anual por pagar: IUC (≈ 150\u00a0€).');
    expect(fraseDoDia({ transactions: [], annualExpenses: [{ ...annualExpenses[0]!, year: 2027 }] }, HOJE)).not.toMatch(/anual/);
  });

  it('meses saltados não contam como recorrentes por pagar', () => {
    const r = (date: string, extra: Partial<Movimento>) => ({ ...m(date, 'Streaming', -12, 'Lazer'), recurring: 'com' as const, recurringEvery: 1, ...extra });
    expect(fraseDoDia({ transactions: [r('2026-09-10', { recurringDone: true }), r('2026-10-10', { skipped: true })] }, HOJE) ?? '').not.toMatch(/Falta pagar/);
  });
});

