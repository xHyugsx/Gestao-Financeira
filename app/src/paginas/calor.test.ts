import { describe, expect, it } from 'vitest';
import type { Movimento } from '../dados';
import { calorDoMes } from './calculos';

const m = (date: string, amount: number, movementType: Movimento['movementType'] = amount < 0 ? 'expense' : 'income', title = 'X'): Movimento =>
  ({ id: date + amount, title, detail: 'x', date, amount, movementType });

describe('mapa de calor do calendário', () => {
  const l = [m('2026-10-02', -100), m('2026-10-02', -20), m('2026-10-05', -30), m('2026-10-06', -1), m('2026-10-07', 900), m('2026-10-08', -50, 'transfer'), m('2026-10-04', -300, 'expense', 'Poupança'), m('2026-09-30', -500)];

  it('níveis 1–4 pela posição entre os dias com gastos; poupança e transferências não contam', () => {
    const c = calorDoMes(l, new Date(2026, 9, 1), new Date(2026, 9, 8, 12));
    expect(c.gasto[2]).toBe(120);
    expect([c.nivel[2], c.nivel[4], c.nivel[5], c.nivel[6], c.nivel[7], c.nivel[8]]).toEqual([4, 0, 3, 2, 0, 0]);
    expect(c.semGastos).toEqual([1, 3, 4, 7, 8]);
    expect(c.maisCaro).toBe(2);
  });

  it('meses futuros não têm dias sem despesas; meses sem gastos não têm dia mais caro', () => {
    const c = calorDoMes(l, new Date(2026, 10, 1), new Date(2026, 9, 8, 12));
    expect(c.semGastos).toEqual([]);
    expect(c.maisCaro).toBeNull();
    expect(calorDoMes(l, new Date(2026, 8, 1), new Date(2026, 9, 8)).semGastos).toHaveLength(29);
  });
});
