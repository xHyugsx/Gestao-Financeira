import { describe, expect, it } from 'vitest';
import { tituloDoRegisto } from './texto';

describe('título de um registo pedido ao Jarvis', () => {
  it('tira o verbo, o valor e as palavras de ligação', () => {
    expect(tituloDoRegisto('adiciona 15€ no pingo doce')).toBe('Pingo Doce');
    expect(tituloDoRegisto('Adiciona uma despesa de 10 euros no café')).toBe('Café');
    expect(tituloDoRegisto('regista o salário de 1200')).toBe('Salário');
    expect(tituloDoRegisto('adiciona despesa de 45,90€ em Alimentação')).toBe('Alimentação');
    expect(tituloDoRegisto('adiciona 20 euros')).toBe('');
  });
});
