import { describe, expect, it } from 'vitest';
import type { Movimento } from '../dados';
import { categoriaSugerida, titulosAnteriores } from './sugestoes';

const m = (id: number, title: string, date: string, cat: string, movementType: 'expense' | 'income' = 'expense'): Movimento =>
  ({ id, title, date, detail: `1 setembro · ${cat}`, amount: movementType === 'expense' ? -1 : 1, movementType });
const L = [m(1, 'Continente', '2026-08-01', 'Alimentação'), m(2, 'continente ', '2026-09-10', 'Casa'), m(3, 'Galp', '2026-09-01', 'Combustível'),
  m(4, 'Salário', '2026-09-25', 'Salário', 'income')];

describe('sugestões do novo movimento', () => {
  it('categoria do movimento mais recente com o mesmo título', () => {
    expect(categoriaSugerida(L, 'CONTINENTE', 'expense')).toBe('Casa');
    expect(categoriaSugerida(L, '  galp ', 'expense')).toBe('Combustível');
    expect(categoriaSugerida(L, 'Lidl', 'expense')).toBeNull();
    expect(categoriaSugerida(L, 'Salário', 'expense')).toBeNull();
    expect(categoriaSugerida(L, 'salario', 'income')).toBe('Salário');
  });
  it('títulos anteriores sem repetidos, do mais recente', () => {
    expect(titulosAnteriores(L, 'expense')).toEqual(['continente', 'Galp']);
    expect(titulosAnteriores(L, 'income')).toEqual(['Salário']);
  });
});
