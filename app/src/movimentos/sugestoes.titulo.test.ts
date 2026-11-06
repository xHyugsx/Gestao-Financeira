import { describe, expect, it } from 'vitest';
import { CATEGORIAS_POR_OMISSAO, CATEGORIAS_RECEITA_POR_OMISSAO } from '../dados/esquema';
import { categoriaPeloTitulo } from './sugestoes';

const d = (t: string, cats = CATEGORIAS_POR_OMISSAO) => categoriaPeloTitulo(t, cats, 'expense');

describe('categoria pelo título', () => {
  it('palavras comuns vão para a categoria certa (só entre as que existem)', () => {
    expect(d('Renda')).toBe('Habitação');
    expect(d('Luz novembro')).toBe('Habitação');
    expect(d('Farmácia')).toBe('Saúde');
    expect(d('Gasolina')).toBe('Transportes');
    expect(d('Galp', [...CATEGORIAS_POR_OMISSAO, 'Combustível'])).toBe('Combustível');
    expect(d('Spotify')).toBe('Lazer');
    expect(d('Pingo Doce')).toBe('Alimentação');
    expect(d('Seguro do carro')).toBe('Seguros');
    expect(d('Propinas')).toBe('Educação');
    expect(d('Ração do gato')).toBe('Animais');
    expect(d('Xpto Lda')).toBeNull();
    expect(d('Casamento')).toBeNull();
  });
  it('receitas: salário e reembolsos', () => {
    expect(categoriaPeloTitulo('Ordenado', CATEGORIAS_RECEITA_POR_OMISSAO, 'income')).toBe('Salário');
    expect(categoriaPeloTitulo('Reembolso IRS', CATEGORIAS_RECEITA_POR_OMISSAO, 'income')).toBe('Reembolsos');
    expect(categoriaPeloTitulo('Renda', CATEGORIAS_RECEITA_POR_OMISSAO, 'income')).toBeNull();
  });
});
