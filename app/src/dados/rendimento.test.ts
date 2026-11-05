import { describe, expect, it } from 'vitest';
import type { Movimento } from './esquema';
import { mesDoRendimento, perguntarQuandoSalario, rendimentoDoMes } from './rendimento';

const sal = (id: number, date: string, amount: number): Movimento => ({ id, title: 'Ordenado', detail: 'x · Salário', amount, date, movementType: 'income' });
const base = (salaryMonth?: 'anterior' | 'proprio') => ({
  salaries: {}, transactions: [sal(1, '2026-10-30', 1400), sal(2, '2026-11-01', 1500)],
  profile: { profileName: '', email: '', phone: '', members: [], ...(salaryMonth ? { salaryMonth } : {}) },
});

describe('quando se recebe o salário', () => {
  it('por omissão, o rendimento é o dos salários do mês anterior', () => {
    expect(rendimentoDoMes(base(), new Date(2026, 10, 5)).valor).toBe(1400);
  });
  it('«No início do mês»: o rendimento é o dos salários do próprio mês e não salta de mês', () => {
    const d = base('proprio');
    expect(rendimentoDoMes(d, new Date(2026, 10, 5))).toMatchObject({ valor: 1500, anterior: 1400 });
    expect(mesDoRendimento(d, new Date(2026, 10, 1), new Date(2026, 10, 28))).toEqual(new Date(2026, 10, 1));
  });
  it('só pergunta no primeiro salário e sem escolha feita', () => {
    const vazio = { ...base(), transactions: [sal(1, '2026-11-01', 1500)] };
    expect(perguntarQuandoSalario(vazio, 1)).toBe(true);
    expect(perguntarQuandoSalario(base(), 2)).toBe(false);
    expect(perguntarQuandoSalario({ ...vazio, profile: { ...vazio.profile, salaryMonth: 'anterior' } }, 1)).toBe(false);
    expect(perguntarQuandoSalario({ ...vazio, salaries: { '2026': { Ana: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] } } }, 1)).toBe(false);
  });
});
