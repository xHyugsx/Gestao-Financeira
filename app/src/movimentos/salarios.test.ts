import { describe, expect, it } from 'vitest';
import type { Movimento } from '../dados';
import { sincronizarSalarios } from './salarios';

const sal = (id: number, amount: number, date = '2026-11-01', person = 'Ana', extra: Partial<Movimento> = {}): Movimento =>
  ({ id, title: 'Ordenado', detail: `1 novembro · Salário`, amount, date, movementType: 'income', person, ...extra } as Movimento);

describe('salários na tabela', () => {
  it('gravar, editar e apagar atualizam o mês da pessoa', () => {
    const t1 = sincronizarSalarios([], [sal(1, 1500)], {});
    expect(t1['2026']!['Ana']![10]).toBe(1500);
    const t2 = sincronizarSalarios([sal(1, 1500)], [sal(1, 1550)], t1);
    expect(t2['2026']!['Ana']![10]).toBe(1550);
    const t3 = sincronizarSalarios([sal(1, 1550)], [sal(1, 1550, '2026-12-01')], t2);
    expect(t3['2026']!['Ana']![10]).toBe(0);
    expect(t3['2026']!['Ana']![11]).toBe(1550);
    expect(sincronizarSalarios([sal(1, 1550, '2026-12-01')], [], t3)['2026']!['Ana']![11]).toBe(0);
  });

  it('soma dois salários do mesmo mês e não mexe no resto da tabela', () => {
    const tabela = { '2026': { Rui: [0, 0, 0, 0, 0, 0, 0, 0, 0, 900, 0, 0], Ana: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1400, 0, 0] } };
    const t = sincronizarSalarios([sal(1, 1500)], [sal(1, 1500), sal(2, 300, '2026-11-15')], tabela);
    expect(t['2026']!['Ana']![10]).toBe(1800);
    expect(t['2026']!['Ana']![9]).toBe(1400);
    expect(t['2026']!['Rui']![9]).toBe(900);
  });

  it('receitas sem pessoa, despesas e saltados não contam; sem mudanças devolve a mesma tabela', () => {
    const tabela = {};
    const sem = { ...sal(1, 1500), person: undefined } as Movimento;
    expect(sincronizarSalarios([], [sem, { ...sal(2, -30), movementType: 'expense', title: 'Café', detail: '1 novembro · Alimentação' } as Movimento], tabela)).toBe(tabela);
    expect(sincronizarSalarios([], [sal(3, 1500, '2026-11-01', 'Ana', { skipped: true })], tabela)).toBe(tabela);
    const l = [sal(1, 1500)];
    expect(sincronizarSalarios(l, l, tabela)).toBe(tabela);
  });
});
