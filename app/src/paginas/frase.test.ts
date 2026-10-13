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
});
