import { describe, expect, it } from 'vitest';
import { estadoInicial, type Movimento } from '../dados';
import { gastosPorPessoa } from '../paginas/calculos';
import { opcoesQuemFez, pessoasDaFamilia, quemFez, rotuloAmbos } from './pessoas';
import { movimentoEditado, novoMovimento } from './regras';

const campos = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const ctx = { tipo: 'expense' as const, categoria: 'Alimentação', recorrente: false, tipoValor: 'com', revolut: false, hoje: new Date(2026, 9, 5), id: 1 };
const m = (id: number, date: string, amount: number, person?: string): Movimento =>
  ({ id, title: 'X', detail: '1 outubro · Lazer', date, amount, movementType: amount < 0 ? 'expense' : 'income', ...(person ? { person } : {}) });

describe('quem fez a despesa', () => {
  it('pessoas do perfil; sem perfil, as da tabela de salários', () => {
    const e = estadoInicial();
    expect(pessoasDaFamilia({ ...e, profile: { ...e.profile, members: ['Pessoa A', ' ', 'Pessoa B', 'Pessoa A'] } })).toEqual(['Pessoa A', 'Pessoa B']);
    expect(pessoasDaFamilia({ ...e, salaries: { '2025': { X: [] }, '2026': { Y: [], Z: [] } } })).toEqual(['Y', 'Z']);
    expect(pessoasDaFamilia(e)).toEqual([]);
  });

  it('grava a pessoa só nas despesas; ao editar, «—» apaga-a', () => {
    expect(novoMovimento(campos({ title: 'Mercado', amount: '10', date: '2026-10-05', person: 'Pessoa A' }), ctx)).toMatchObject({ person: 'Pessoa A' });
    expect(novoMovimento(campos({ title: 'Prémio', amount: '10', date: '2026-10-05', person: 'Pessoa A' }), { ...ctx, tipo: 'income' })).not.toHaveProperty('person');
    expect(novoMovimento(campos({ title: 'Ordenado', amount: '10', date: '2026-10-05', category: 'Salário', person: 'Pessoa A' }), { ...ctx, tipo: 'income' })).toMatchObject({ person: 'Pessoa A' });
    expect(novoMovimento(campos({ title: 'Mercado', amount: '10', date: '2026-10-05', person: '' }), ctx)).not.toHaveProperty('person');
    const base = m(9, '2026-10-05', -10, 'Pessoa A');
    expect(movimentoEditado(base, campos({ title: 'X', amount: '10', person: 'Pessoa B' }))!.person).toBe('Pessoa B');
    expect(movimentoEditado(base, campos({ title: 'X', amount: '10', person: '' }))!.person).toBeUndefined();
    expect(movimentoEditado(base, campos({ title: 'X', amount: '10' }))!.person).toBe('Pessoa A');
  });

  it('gastos por pessoa na Análise (sem pessoa = «Ambos»; vazio com menos de dois membros)', () => {
    const l = [m(1, '2026-10-01', -60, 'Pessoa A'), m(2, '2026-10-02', -30, 'Pessoa B'), m(3, '2026-10-03', -10), m(4, '2026-09-03', -20, 'Pessoa B'), m(5, '2026-10-04', 500, 'Pessoa A')];
    const r = gastosPorPessoa({ transactions: l }, new Date(2026, 9, 1), ['Pessoa A', 'Pessoa B']);
    expect(r.map((c) => [c.name, c.amount, Math.round(c.share), c.anterior])).toEqual([['Pessoa A', 60, 60, 0], ['Pessoa B', 30, 30, 20], ['Ambos', 10, 10, 0]]);
    expect(r.map((c) => c.tone)).toEqual(['azul', 'rosa', 'roxo']);
    expect(gastosPorPessoa({ transactions: [m(1, '2026-10-01', -60)] }, new Date(2026, 9, 1), ['A', 'B', 'C'])[0]!.name).toBe('Todos');
    expect(gastosPorPessoa({ transactions: [m(1, '2026-10-01', -60)] }, new Date(2026, 9, 1), ['Pessoa A', 'Pessoa B']).map((c) => c.name)).toEqual(['Ambos']);
    expect(gastosPorPessoa({ transactions: l }, new Date(2026, 9, 1), ['Pessoa B', 'Pessoa A']).find((c) => c.name === 'Pessoa B')!.tone).toBe('azul');
    expect(gastosPorPessoa({ transactions: [m(1, '2026-10-01', -60)] }, new Date(2026, 9, 1), ['Pessoa A'])).toEqual([]);
  });

  it('sem pessoa escolhida: o único membro, senão «Ambos» (2) ou «Todos» (3+)', () => {
    expect(rotuloAmbos(2)).toBe('Ambos');
    expect(rotuloAmbos(3)).toBe('Todos');
    expect(quemFez(m(1, '2026-10-01', -5), ['Pessoa A'])).toBe('Pessoa A');
    expect(quemFez(m(1, '2026-10-01', -5), ['Pessoa A', 'Pessoa B'])).toBe('Ambos');
    expect(quemFez(m(1, '2026-10-01', -5), ['A', 'B', 'C'])).toBe('Todos');
    expect(quemFez(m(1, '2026-10-01', -5, 'Pessoa B'), ['Pessoa A', 'Pessoa B'])).toBe('Pessoa B');
    expect(quemFez(m(1, '2026-10-01', -5), [])).toBeNull();
    expect(quemFez(m(1, '2026-10-01', 50), ['Pessoa A', 'Pessoa B'])).toBeNull();
    expect(opcoesQuemFez(['Pessoa A', 'Pessoa B']).map((o) => [o.valor, o.rotulo])).toEqual([['', 'Ambos'], ['Pessoa A', 'Pessoa A'], ['Pessoa B', 'Pessoa B']]);
    expect(opcoesQuemFez(['Pessoa A', 'Pessoa B'], ['Antiga'])[0]!.rotulo).toBe('Ambos');
  });
});
