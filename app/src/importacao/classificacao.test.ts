import { describe, expect, it } from 'vitest';
import { CATEGORIAS_POR_OMISSAO, CATEGORIAS_RECEITA_POR_OMISSAO } from '../dados/esquema';
import { classificar } from './classificacao';
import type { Extrato } from './leitura';

const ext = (linhas: [string, number][]) => ({ lines: linhas.map(([raw, amount], i) => ({ date: `2026-11-0${i + 1}`, raw, amount })) }) as unknown as Extrato;
const ctx = { tx: [], cats: [...CATEGORIAS_POR_OMISSAO], inc: [...CATEGORIAS_RECEITA_POR_OMISSAO], sal: {} };

describe('importação: salário sem regra pessoal (v2.60.0)', () => {
  it('«TRF SALARIO …» fica na categoria Salário; outras receitas não mudam', () => {
    const { items } = classificar(ext([['TRF SALARIO EMPRESA XPTO', 1350], ['TRF DE JOAO', 20], ['VENCIMENTO OUTUBRO', 900]]), ctx, [], {});
    expect(items.map((x) => [x.k, x.c])).toEqual([['inc', 'Salário'], ['inc', 'Outras receitas'], ['inc', 'Salário']]);
  });
});
