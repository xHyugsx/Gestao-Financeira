import { describe, expect, it } from 'vitest';
import type { Movimento } from '../dados';
import { lerRecibo, salarioPorConfirmar } from './recibos';

const RECIBO = ['Recibo de Vencimento', 'Junho 2026', 'EMPRESA FICTICIA LDA', 'Valor líquido a receber pelo colaborador 1.234,56 €'].join('\n');
const rec = (id: number, title: string, date: string, amount = 0): Movimento =>
  ({ id, title, detail: 'x · Salário', amount, date, movementType: 'income', recurring: 'sem', recurringEvery: 1, recurringDay: 'salario' });
const ctx = (movimentos: Movimento[]) => ({
  pessoas: ['Ana', 'Rui'], regras: [], contas: [], salarios: {}, agora: new Date(2026, 5, 30), eur: (v: number) => `${v} €`, movimentos,
});

describe('recibo preenche o salário por confirmar', () => {
  it('escolhe a receita com o nome da pessoa ou a única por confirmar no mês', () => {
    const l = [rec(1, 'Salário Ana', '2026-06-26'), rec(2, 'Salário Rui', '2026-06-26'), rec(3, 'Salário Rui', '2026-05-27')];
    expect(salarioPorConfirmar(l, 'Rui', '2026', 5)?.id).toBe(2);
    expect(salarioPorConfirmar([rec(4, 'Ordenado', '2026-06-26')], 'Rui', '2026', 5)?.id).toBe(4);
    expect(salarioPorConfirmar([rec(4, 'Ordenado', '2026-06-26'), rec(5, 'Outro', '2026-06-26')], 'Rui', '2026', 5)).toBeNull();
    expect(salarioPorConfirmar([rec(6, 'Salário Rui', '2026-06-26', 1500)], 'Rui', '2026', 5)).toBeNull();
  });

  it('o recibo propõe preencher a receita com o líquido', () => {
    const r = lerRecibo(`${RECIBO}\nRui`, ctx([rec(2, 'Salário Rui', '2026-06-26')]))!;
    expect(r.texto).toContain('Receita «Salário Rui» de junho, por confirmar → 1234.56 €');
    expect(r.pendente).toMatchObject({ type: 'slip', payload: { preencher: { id: 2, valor: 1234.56 } } });
  });

  it('sem receita por confirmar, fica como antes', () => {
    const r = lerRecibo(`${RECIBO}\nRui`, ctx([]))!;
    expect(r.pendente && 'preencher' in r.pendente.payload).toBe(false);
  });
});
