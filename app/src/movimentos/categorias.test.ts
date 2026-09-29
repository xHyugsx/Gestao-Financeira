import { describe, expect, it } from 'vitest';
import type { Movimento } from '../dados';
import { aspetoDoMovimento, aspetosCategorias, categoriaDespesa, iconePorTipo, simplificar } from './categorias';

const mov = (m: Partial<Movimento>): Movimento =>
  ({ id: 1, title: 'X', detail: '4 setembro · Alimentação', amount: -1, date: '2026-09-04', movementType: 'expense', ...m });
const base = { categories: ['Alimentação', 'Lazer'], incomeCategories: ['Salário'], categoryIcons: { Lazer: 'bike' } as Record<string, string> };
const setembro = new Date(2026, 8, 1);

describe('categorias e ícones', () => {
  it('categoria vem do detail; animais têm categoria própria', () => {
    expect(categoriaDespesa(mov({}))).toBe('Alimentação');
    expect(categoriaDespesa(mov({ pet: 'X' }))).toBe('Animais');
    expect(categoriaDespesa(mov({ detail: 'sem categoria ·' }))).toBe('Outros');
  });

  it('ícone e cor: base, escolhidos pelo utilizador e por omissão', () => {
    const tx = [mov({}), mov({ detail: '5 setembro · Combustível' }), mov({ detail: '6 setembro · Salário', movementType: 'income', amount: 1 })];
    const a = aspetosCategorias({ ...base, transactions: tx }, setembro);
    expect(aspetoDoMovimento(tx[0]!, a)).toEqual({ icone: 'shopping-cart', tone: 'green' });
    expect(a.despesas.get('Lazer')).toEqual({ icone: 'bike', tone: 'violet' });
    expect(aspetoDoMovimento(tx[1]!, a)).toEqual({ icone: 'fuel', tone: 'orange' });
    expect(aspetoDoMovimento(tx[2]!, a)).toEqual({ icone: 'briefcase', tone: 'green' });
  });

  it('categoria só de meses antigos não é conhecida (usa o ícone por tipo, como a app atual)', () => {
    const antigo = mov({ date: '2026-05-01', detail: '1 maio · Viagem', kind: 'car' });
    expect(aspetoDoMovimento(antigo, aspetosCategorias({ ...base, transactions: [antigo] }, setembro))).toBeNull();
    expect(iconePorTipo('car')).toBe('car');
    expect(iconePorTipo(undefined)).toBe('wallet-cards');
  });

  it('transferências não têm ícone de categoria', () => {
    const t = mov({ movementType: 'transfer' });
    expect(aspetoDoMovimento(t, aspetosCategorias({ ...base, transactions: [t] }, setembro))).toBeNull();
  });

  it('pesquisa ignora acentos e maiúsculas', () => {
    expect(simplificar('Pão Açúcar')).toBe('pao acucar');
  });
});
