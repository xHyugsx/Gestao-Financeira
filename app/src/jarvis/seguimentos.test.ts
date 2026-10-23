import { describe, expect, it } from 'vitest';
import { seguimentos } from './seguimentos';

const hoje = new Date(2026, 8, 28);

describe('perguntas de seguimento do Jarvis', () => {
  it('gastos: mês passado, comparação e maior categoria', () => {
    expect(seguimentos('Quanto gastei este mês?', hoje)).toEqual(['Quanto gastei no mês passado?', 'Gastei mais do que no mês passado?', 'Maior categoria']);
    expect(seguimentos('quanto gastei no mes passado', hoje)).toEqual(['Quanto gastei este mês?', 'Maior categoria no mês passado']);
  });
  it('saldo: previsão do mês seguinte', () => {
    expect(seguimentos('Saldo das contas', hoje)).toEqual(['Previsão do saldo em outubro', 'Saldo no fim do mês passado']);
  });
  it('ações não têm seguimento', () => {
    expect(seguimentos('Adiciona despesa de 12€ em Lazer', hoje)).toEqual([]);
    expect(seguimentos('Confirmar', hoje)).toEqual([]);
  });
});
