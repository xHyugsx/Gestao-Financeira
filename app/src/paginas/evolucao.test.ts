import { describe, expect, it } from 'vitest';
import type { Conta, Movimento } from '../dados';
import { evolucaoDoSaldo, pontosDaLinha } from './calculos';

const m = (id: number, date: string, amount: number): Movimento => ({ id, title: 'X', detail: 'x', date, amount, movementType: amount < 0 ? 'expense' : 'income' });

describe('evolução do saldo (mini-gráfico do Resumo)', () => {
  const conta: Conta = { id: 'principal', name: 'Principal', balance: 1000 };
  const movs = [m(1, '2026-07-05', -100), m(2, '2026-08-10', 500), m(3, '2026-09-03', -50)];

  it('saldo no fim de cada mês, desde o primeiro movimento até ao mês escolhido', () => {
    expect(evolucaoDoSaldo(conta, movs, new Date(2026, 8, 28, 12), new Date(2026, 8, 1))).toEqual([900, 1400, 1350]);
  });

  it('não começa antes de a conta ser criada', () => {
    expect(evolucaoDoSaldo({ ...conta, createdAt: '2026-08' }, movs, new Date(2026, 8, 28, 12), new Date(2026, 8, 1))).toHaveLength(2);
  });
});

describe('pontos da linha', () => {
  it('do mínimo (em baixo) ao máximo (em cima), com margem', () => {
    expect(pontosDaLinha([0, 10], 100, 30, 3)).toEqual([[3, 27], [97, 3]]);
  });
  it('valores iguais ficam a meio', () => {
    expect(pontosDaLinha([5, 5, 5], 100, 30).map((p) => p[1])).toEqual([15, 15, 15]);
  });
});
