import { describe, expect, it } from 'vitest';
import { gastos, type Movimento } from '../dados';
import { mediaMensal, mesAnteriorComparavel, rotuloComparacao } from './calculos';

const d = (id: number, date: string, amount: number): Movimento => ({ id, title: 'x', detail: 'x · Alimentação', amount, date, movementType: 'expense' });
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

describe('comparações justas e médias (v2.59.0)', () => {
  const l = [d(1, '2026-10-02', -50), d(2, '2026-10-20', -100), d(3, '2026-11-03', -30)];
  it('no mês atual, o mês anterior conta só até ao mesmo dia', () => {
    expect(gastos(mesAnteriorComparavel(l, new Date(2026, 10, 1), new Date(2026, 10, 6)))).toBe(50);
    expect(gastos(mesAnteriorComparavel(l, new Date(2026, 10, 1), new Date(2026, 11, 6)))).toBe(150);
    expect(rotuloComparacao(new Date(2026, 10, 1), MESES, new Date(2026, 10, 6))).toBe('vs 1 a 6 de outubro');
    expect(rotuloComparacao(new Date(2026, 10, 1), MESES, new Date(2026, 11, 6))).toBe('vs outubro');
  });
  it('a média mensal começa no primeiro mês com movimentos', () => {
    expect(mediaMensal(l, new Date(2026, 10, 1), gastos)).toBe(90);
    expect(mediaMensal([], new Date(2026, 10, 1), gastos)).toBe(0);
  });
});
