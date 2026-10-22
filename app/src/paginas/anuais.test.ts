import { describe, expect, it } from 'vitest';
import type { Movimento } from '../dados';
import { anuaisPrevistas, despesasAnuais, estadoAnual, movimentoDoPagamento, renovar, renovarPagas, totalProximos12 } from './anuais';

const a = (id: number, name: string, value: number, month: number, year: number) => ({ id, name, value, month, year });
const HOJE = new Date(2026, 9, 21, 12);  // 21 de outubro de 2026

describe('despesas anuais', () => {
  const l = [a(1, 'IUC', 150, 3, 2026), a(2, 'Seguro casa', 300, 10, 2026), a(3, 'Seguro carro', 420, 2, 2027), a(4, 'Inspeção', 35, 10, 2027), a(5, 'Revisão', 200, 4, 2028)];

  it('estado: este mês por pagar, antes em atraso, depois prevista', () => {
    expect(l.map((e) => estadoAnual(e, HOJE))).toEqual(['em atraso', 'por pagar', 'prevista', 'prevista', 'prevista']);
  });

  it('total dos próximos 12 meses: sem as em atraso nem as mais distantes', () => {
    expect(totalProximos12(l, HOJE)).toBe(300 + 420);
  });

  it('renovar passa para o ano seguinte em que ainda não passou', () => {
    expect(renovar(l[1]!, HOJE)).toMatchObject({ month: 10, year: 2027 });
    expect(renovar(a(9, 'Antiga', 10, 3, 2024), HOJE)).toMatchObject({ year: 2027 });
  });

  it('pagamento: movimento de hoje com a categoria usada da última vez', () => {
    const antes: Movimento[] = [{ id: 1, title: 'iuc', detail: '3 março · Carro', amount: -150, date: '2025-03-03', movementType: 'expense' }];
    expect(movimentoDoPagamento(l[0]!, antes, HOJE, 7)).toMatchObject({ id: 7, title: 'IUC', amount: -150, date: '2026-10-21', detail: '21 outubro · Carro', movementType: 'expense' });
    expect(movimentoDoPagamento(l[1]!, [], HOJE, 8).detail).toBe('21 outubro · Outros');
  });

  it('previsão: por pagar e previstas até ao limite; em atraso fica de fora', () => {
    expect(anuaisPrevistas(l, HOJE, '2027-02-31').map((m) => [m.title, m.date, m.amount])).toEqual([['Seguro casa', '2026-10-01', -300], ['Seguro carro', '2027-02-01', -420]]);
  });

  it('ignora entradas inválidas', () => {
    expect(despesasAnuais([a(1, 'Ok', 10, 1, 2027), { id: 2, name: 'Sem valor', value: 0, month: 1, year: 2027 }, null, { name: 'x' }]).map((e) => e.id)).toEqual([1]);
  });

  it('paga «por fora»: despesa com o mesmo título desde o mês anterior ao previsto renova para o ano seguinte', () => {
    const mov = (title: string, date: string): Movimento => ({ id: date, title, detail: 'x', amount: -150, date, movementType: 'expense' });
    const r = renovarPagas(l, [mov('iuc ', '2026-03-10'), mov('Seguro casa', '2026-10-02'), mov('Seguro carro', '2026-10-02')], HOJE) as typeof l;
    expect(r.map((e) => [e.name, e.year])).toEqual([['IUC', 2027], ['Seguro casa', 2027], ['Seguro carro', 2027], ['Inspeção', 2027], ['Revisão', 2028]]);
    expect(renovarPagas(l, [mov('IUC', '2025-03-10'), mov('Seguro casa (parte)', '2026-10-02')], HOJE)).toBeNull();
    expect(renovarPagas(l, [{ ...mov('Seguro casa', '2026-10-02'), amount: 0, recurring: 'sem' }], HOJE)).toBeNull();
  });
});

