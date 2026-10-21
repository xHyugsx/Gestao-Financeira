import { describe, expect, it } from 'vitest';
import type { Movimento } from '../dados';
import { anoEmRevista } from './revista';

let n = 0;
const m = (date: string, title: string, amount: number, cat = 'Lazer'): Movimento =>
  ({ id: ++n, title, date, amount, detail: `1 x · ${cat}`, movementType: amount < 0 ? 'expense' : 'income' });

describe('ano em revista', () => {
  const l = [
    m('2025-03-01', 'Antigo', -500),
    m('2026-03-10', 'Mercado', -100, 'Alimentação'), m('2026-03-11', 'mercado ', -50, 'Alimentação'), m('2026-03-12', 'Renda', -600, 'Habitação'),
    m('2026-05-02', 'Mercado', -80, 'Alimentação'), m('2026-05-03', 'Poupança', -200, 'Poupança'), m('2026-05-20', 'Salário', 2000, 'Salário'),
    m('2026-11-01', 'Futuro', -999),
  ];
  const r = anoEmRevista({ transactions: l }, 2026, new Date(2026, 9, 12, 12));

  it('totais até hoje; poupança à parte; comparação com o mesmo período do ano anterior', () => {
    expect(r).toMatchObject({ ateMes: 9, gasto: 830, recebido: 2000, poupado: 200, movimentos: 6 });
    expect(r.variacao).toBeCloseTo(66);
  });

  it('meses, categorias e títulos', () => {
    expect(r.mesMaisCaro).toEqual({ mes: 'março', valor: 750 });
    expect(r.mesMaisPoupado).toEqual({ mes: 'maio', valor: 80 });
    expect(r.categorias.map((c) => [c.nome, c.valor])).toEqual([['Habitação', 600], ['Alimentação', 230]]);
    expect(r.maisGasto).toEqual({ titulo: 'Renda', valor: 600 });
    expect(r.maisVezes).toEqual({ titulo: 'Mercado', vezes: 3 });
  });

  it('o mês em curso não conta para o mês mais leve', () => {
    const s = anoEmRevista({ transactions: [m('2026-08-03', 'A', -50), m('2026-09-03', 'B', -80), m('2026-10-03', 'C', -5)] }, 2026, new Date(2026, 9, 12, 12));
    expect(s.mesMaisPoupado).toEqual({ mes: 'agosto', valor: 50 });
  });

  it('dias sem despesas só desde o primeiro movimento', () => {
    const s = anoEmRevista({ transactions: [m('2026-10-01', 'A', -1), m('2026-10-05', 'B', -1)] }, 2026, new Date(2026, 9, 12, 12));
    expect(s.diasSemGastos).toBe(10);
    expect(s.maiorSequencia).toBe(7);
  });

  it('recorrentes variáveis ainda sem valor não contam como movimento nem como dia com despesas', () => {
    const base = [m('2026-02-01', 'A', -10), m('2026-02-03', 'B', -10)];
    const pendente: Movimento = { ...m('2026-02-02', 'Luz', 0), movementType: 'expense', recurring: 'sem' };
    const com = anoEmRevista({ transactions: [...base, pendente] }, 2026, new Date(2026, 1, 3, 12));
    const sem = anoEmRevista({ transactions: base }, 2026, new Date(2026, 1, 3, 12));
    expect(com.movimentos).toBe(2);
    expect(com.diasSemGastos).toBe(sem.diasSemGastos);
  });
});
