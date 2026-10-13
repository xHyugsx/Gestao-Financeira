import { describe, expect, it } from 'vitest';
import type { Movimento } from '../dados';
import { categoriasParaEditar, type ContextoNovo, lerValor, movimentoEditado, novoMovimento } from './regras';

const campos = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const ctx = (o: Partial<ContextoNovo> = {}): ContextoNovo =>
  ({ tipo: 'expense', categoria: 'Alimentação', recorrente: false, tipoValor: 'com', revolut: false, hoje: new Date(2026, 8, 28), id: 1, ...o });

describe('valores', () => {
  it('lê valores à portuguesa', () => {
    expect(lerValor('621,18')).toBe(621.18);
    expect(lerValor('1.234,56')).toBe(1234.56);
    expect(lerValor('1.234')).toBe(1234);
    expect(lerValor('12,5 €')).toBe(12.5);
    expect(lerValor('')).toBe(0);
    expect(lerValor('abc')).toBeNaN();
  });
});

describe('novo movimento', () => {
  it('despesa com nota numa conta que não é a Principal', () => {
    const m = novoMovimento(campos({ title: ' Supermercado ', amount: '20,00', date: '2026-09-05', category: 'Alimentação', account: 'edenred', affectsBalance: 'on', note: ' Compras ' }), ctx());
    expect(m).toEqual({ id: 1, title: 'Supermercado', detail: '5 setembro · Alimentação', amount: -20, kind: 'shop', movementType: 'expense', date: '2026-09-05', affectsBalance: true, account: 'edenred', note: 'Compras' });
  });

  it('receita, transferência e tipo visual', () => {
    expect(novoMovimento(campos({ title: 'Salário', amount: '1000', date: '2026-09-01', category: 'Salário', account: 'principal' }), ctx({ tipo: 'income' })))
      .toMatchObject({ amount: 1000, kind: 'income', affectsBalance: false });
    const t = novoMovimento(campos({ title: 'Reforço', amount: '50', date: '2026-09-02' }), ctx({ tipo: 'transfer' })) as Movimento;
    expect(t).toMatchObject({ amount: 0, kind: 'transfer', movementType: 'transfer', detail: '2 setembro · Transferência' });
    expect('account' in t).toBe(false);
    expect(novoMovimento(campos({ title: 'Oficina', amount: '5', date: '2026-09-02', category: 'Transportes' }), ctx())).toMatchObject({ kind: 'car' });
  });

  it('transferência para a Revolut', () => {
    const m = novoMovimento(campos({ title: 'Carregar', amount: '30', date: '2026-09-03', revolutPurpose: 'Poupança', affectsBalance: 'on' }), ctx({ revolut: true, recorrente: true }));
    expect(m).toEqual({ id: 1, title: 'Carregar', detail: '3 setembro · Revolut Conjunta · Poupança', amount: 0, kind: 'transfer', movementType: 'transfer', date: '2026-09-03', affectsBalance: true, revolut: { holder: 'Conjunta', purpose: 'Poupança' }, transferValue: 30, recurring: 'com', recurringEvery: 1 });
  });

  it('recorrente com periodicidade e destino «Poupança Conjunta»', () => {
    const m = novoMovimento(campos({ title: 'Cofre', amount: '50', date: '2026-09-03', revolutHolder: 'Poupança Conjunta', revolutPurpose: 'Poupança' }), ctx({ revolut: true, recorrente: true, periodicidade: 3 }));
    expect(m).toMatchObject({ detail: '3 setembro · Revolut Poupança Conjunta · Poupança', revolut: { holder: 'Poupança Conjunta' }, recurring: 'com', recurringEvery: 3 });
  });

  it('recorrente sem valor aceita zero', () => {
    expect(novoMovimento(campos({ title: 'Renda', amount: '', date: '2026-09-03' }), ctx({ recorrente: true, tipoValor: 'sem' }))).toMatchObject({ amount: -0, recurring: 'sem' });
  });

  it('erros com a mensagem da app atual', () => {
    expect(novoMovimento(campos({ title: '', amount: '5' }), ctx())).toEqual(['title', 'Indique uma descrição.']);
    for (const amount of ['', '0', 'x', '-3']) {
      expect(novoMovimento(campos({ title: 'A', amount }), ctx())).toEqual(['amount', 'Valor inválido. Use, por exemplo, 621,18 ou 1.234,56.']);
    }
  });

  it('nota com no máximo 140 caracteres; data de hoje por omissão', () => {
    const m = novoMovimento(campos({ title: 'A', amount: '1', note: 'x'.repeat(200) }), ctx()) as Movimento;
    expect(m.note).toHaveLength(140);
    expect(m.date).toBe('2026-09-28');
  });
});

describe('editar movimento', () => {
  const base: Movimento = { id: 7, title: 'Galp', detail: '9 agosto · Combustível', amount: -55, date: '2026-08-09', movementType: 'expense', account: 'revolut', note: 'n', extra: 1 };

  it('altera os campos e mantém os desconhecidos', () => {
    expect(movimentoEditado(base, campos({ title: 'Galp', amount: '60,5', date: '2026-08-10', category: 'Combustível', account: 'principal', note: '' })))
      .toEqual({ ...base, amount: -60.5, date: '2026-08-10', detail: '10 agosto · Combustível', account: undefined, note: undefined });
  });

  it('transferência simples mantém o valor; sem categoria fica "Outros"', () => {
    const t: Movimento = { ...base, movementType: 'transfer', amount: 0, account: undefined };
    expect(movimentoEditado(t, campos({ title: 'T', date: '2026-08-10' }))).toMatchObject({ amount: 0, detail: '10 agosto · Outros' });
  });

  it('Revolut: o valor vai para transferValue', () => {
    const r: Movimento = { ...base, movementType: 'transfer', amount: 0, revolut: { holder: 'Conjunta' }, transferValue: 10 };
    expect(movimentoEditado(r, campos({ title: 'R', amount: '12', date: '2026-08-10' }))).toMatchObject({ amount: 0, transferValue: 12 });
  });

  it('sem descrição não grava', () => {
    expect(movimentoEditado(base, campos({ title: ' ', amount: '1' }))).toBeNull();
  });

  it('categorias para escolher: as do tipo, mais a atual, por ordem alfabética', () => {
    expect(categoriasParaEditar(base, ['Lazer', 'Casa'], ['Salário'], 'Farmácia')).toEqual(['Casa', 'Farmácia', 'Lazer']);
    expect(categoriasParaEditar({ ...base, movementType: 'income' }, ['Lazer'], ['Salário', 'Bónus'], 'Salário')).toEqual(['Bónus', 'Salário']);
  });

  it('recorrente: periodicidade liga a criação automática; desmarcar pára a série', () => {
    const rec: Movimento = { ...base, recurring: 'com', recurringEvery: 1 };
    expect(movimentoEditado(rec, campos({ title: 'X', amount: '1', recurring: 'on', recurringEvery: '3' }))).toMatchObject({ recurring: 'com', recurringEvery: 3 });
    const parado = movimentoEditado(rec, campos({ title: 'X', amount: '1' }))!;
    expect(parado.recurring).toBeUndefined();
    expect(parado.recurringEvery).toBeUndefined();
    expect(movimentoEditado(base, campos({ title: 'X', amount: '1' }))!.recurring).toBeUndefined();
    const antigo = movimentoEditado({ ...base, recurring: 'sem' }, campos({ title: 'X', amount: '1', recurring: 'on', recurringEvery: '' }))!;
    expect(antigo.recurring).toBe('sem');
    expect(antigo.recurringEvery).toBeUndefined();
  });
});
