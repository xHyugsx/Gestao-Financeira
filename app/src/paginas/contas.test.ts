import { describe, expect, it } from 'vitest';
import type { Movimento } from '../dados';
import { gastosPorConta } from './calculos';

let n = 0;
const m = (date: string, title: string, amount: number, cat: string, extra: Partial<Movimento> = {}): Movimento =>
  ({ id: ++n, title, date, amount, detail: `1 outubro · ${cat}`, movementType: amount < 0 ? 'expense' : 'income', ...extra });

describe('gastos por conta (Análise)', () => {
  it('soma as despesas por conta, sem transferências, com a parte e o mês anterior', () => {
    const contas = [{ id: 'principal', name: 'Principal' }, { id: 'revolut', name: 'Revolut Conjunta' }, { id: 'ed', name: 'Cartão refeição' }];
    const l = [m('2026-10-02', 'Renda', -600, 'Habitação'), m('2026-10-03', 'Mercado', -150, 'Alimentação', { account: 'revolut' }),
      m('2026-10-04', 'Almoço', -50, 'Alimentação', { account: 'ed' }), m('2026-10-05', 'Outro', -200, 'Lazer', { account: 'conta-de-outro' }),
      { ...m('2026-10-06', 'Para a conjunta', 0, 'Transferência'), movementType: 'transfer' as const, transferValue: 300, revolut: { holder: 'Conjunta' } },
      m('2026-09-03', 'Mercado', -100, 'Alimentação', { account: 'revolut' }), m('2026-10-07', 'Salário', 2000, 'Salário')];
    const r = gastosPorConta({ accounts: contas, transactions: l }, new Date(2026, 9, 1));
    expect(r.map((c) => [c.name, c.amount, Math.round(c.share), c.anterior])).toEqual([
      ['Principal', 600, 60, 0], ['Outras contas', 200, 20, 0], ['Revolut Conjunta', 150, 15, 100], ['Cartão refeição', 50, 5, 0]]);
  });
});
