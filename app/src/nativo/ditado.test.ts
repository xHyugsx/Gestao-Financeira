import { describe, expect, it } from 'vitest';
import { interpretarDitado } from './ditado';

describe('ditado no «+»', () => {
  it.each([
    ['Gastei 12 euros no café', 12, 'Café'],
    ['45,90 no supermercado', 45.9, 'Supermercado'],
    ['paguei 30 € de gasóleo', 30, 'Gasóleo'],
    ['12 euros e 50 na farmácia', 12.5, 'Farmácia'],
    ['Continente 23,40 euros', 23.4, 'Continente'],
    ['jantar fora 60', 60, 'Jantar fora'],
    ['recebi 200 euros do reembolso', 200, 'Reembolso'],
  ])('«%s» → %s € · %s', (frase, valor, titulo) => {
    expect(interpretarDitado(frase)).toEqual({ valor, titulo });
  });
  it('sem valor: só o título', () => {
    expect(interpretarDitado('padaria')).toEqual({ valor: null, titulo: 'Padaria' });
  });
});
