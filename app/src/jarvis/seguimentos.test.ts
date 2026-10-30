import { describe, expect, it } from 'vitest';
import { seguimentos } from './seguimentos';

const hoje = new Date(2026, 8, 28);

describe('perguntas de seguimento do Jarvis', () => {
  it('gastos: mês passado, comparação e maior categoria', () => {
    expect(seguimentos('Quanto gastei este mês?', hoje)).toEqual(['Quanto gastei no mês passado?', 'Gastei mais do que no mês passado?', 'Maior categoria']);
    expect(seguimentos('quanto gastei no mes passado', hoje)).toEqual(['Quanto gastei este mês?', 'Maior categoria no mês passado']);
  });
  it('contas: gastos por conta do mês passado e previsão do mês seguinte', () => {
    expect(seguimentos('Gastos por conta', hoje)).toEqual(['Gastos por conta no mês passado', 'Previsão dos gastos em outubro']);
    expect(seguimentos('Gastos por conta no mês passado', hoje)).toEqual(['Gastos por conta este mês']);
    expect(seguimentos('Previsão dos gastos em outubro', hoje)).toEqual(['Gastos por conta', 'Quanto gastei este mês?']);
  });
  it('ações não têm seguimento', () => {
    expect(seguimentos('Adiciona despesa de 12€ em Lazer', hoje)).toEqual([]);
    expect(seguimentos('Confirmar', hoje)).toEqual([]);
  });
});
