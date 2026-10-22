import { describe, expect, it } from 'vitest';
import { caminhoDaFatia, coresDistintas, fatiasComSeta, type LinhaCategoria } from './calculos';

const c = (name: string, tone: string, amount = 0) => ({ name, tone, amount, share: 0, auto: false, icone: 'tags', type: 'pontual', bucket: 0, trend: 0 }) as LinhaCategoria;

describe('cores do gráfico circular', () => {
  it('a segunda categoria com o mesmo tom (por ordem alfabética) passa para o primeiro tom livre', () => {
    const l = coresDistintas([c('Restaurantes', 'violet', 90), c('Lazer', 'violet', 10), c('Casa', 'blue', 50)]);
    expect(l.map((e) => [e.name, e.tone])).toEqual([['Restaurantes', 'green'], ['Lazer', 'violet'], ['Casa', 'blue']]);
  });

  it('a mesma lista dá as mesmas cores, seja qual for a ordem dos valores', () => {
    const a = coresDistintas([c('Lazer', 'violet', 1), c('Restaurantes', 'violet', 99)]);
    const b = coresDistintas([c('Restaurantes', 'violet', 99), c('Lazer', 'violet', 1)]);
    expect(a.find((e) => e.name === 'Restaurantes')!.tone).toBe(b.find((e) => e.name === 'Restaurantes')!.tone);
  });

  it('sem repetições, a lista fica igual', () => {
    const l = [c('A', 'blue'), c('B', 'green')];
    expect(coresDistintas(l)).toBe(l);
  });
});

describe('setas do gráfico circular', () => {
  it('as fatias abaixo de 5% (duas ou mais) juntam-se em «Outras»', () => {
    const l = [c('A', 'blue', 70), c('B', 'green', 22), c('C', 'red', 4), c('D', 'pink', 3), c('E', 'cyan', 1)];
    const s = fatiasComSeta(l, 100);
    expect(s.map((e) => [e.name, e.tone, e.amount])).toEqual([['A', 'blue', 70], ['B', 'green', 22], ['Outras', 'outras', 8]]);
  });

  it('uma só fatia pequena fica com a sua seta', () => {
    const l = [c('A', 'blue', 96), c('B', 'green', 4)];
    expect(fatiasComSeta(l, 100)).toBe(l);
  });
});

describe('caminho das fatias', () => {
  it('um quarto do anel começa no topo e roda no sentido dos ponteiros', () => {
    expect(caminhoDaFatia(0, 0.25)).toBe('M50 0A50 50 0 0 1 100 50L84 50A34 34 0 0 0 50 16Z');
  });

  it('mais de meia volta usa o arco grande; uma volta inteira são duas metades', () => {
    expect(caminhoDaFatia(0, 0.75)).toContain('A50 50 0 1 1');
    expect(caminhoDaFatia(0, 1).match(/M/g)).toHaveLength(2);
  });
});
