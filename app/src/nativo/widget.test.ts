import { describe, expect, it } from 'vitest';
import { estadoInicial, type Movimento } from '../dados';
import { dadosDoWidget } from './widget';

const HOJE = new Date(2026, 10, 18, 12);  // quarta, 18 de novembro
const mov = (id: number, amount: number, date: string): Movimento => ({ id, title: 't', detail: '', amount, date, movementType: amount < 0 ? 'expense' : 'income' } as Movimento);

describe('dados dos widgets', () => {
  const e = { ...estadoInicial(), transactions: [mov(1, -100, '2026-11-16'), mov(2, -50, '2026-11-17'), mov(3, -200, '2026-10-10'), mov(4, -500, '2026-10-25')] };
  it('gastos do mês, comparação até ao mesmo dia e pontos da semana', () => {
    const d = dadosDoWidget(e, HOJE);
    expect(d.mes).toBe('novembro');
    expect(d.gastos).toMatch(/150,00/);
    expect(d.comparacao).toBe('novembro · ↓ 25%');
    expect(d.pontos.slice(0, 2).every((p) => p.startsWith('q'))).toBe(true);
    expect(d.pontos[2]).toBe('sem');
    expect(d.pontos.slice(3)).toEqual(['futuro', 'futuro', 'futuro', 'futuro']);
    expect(d.hoje).toBe(2);
  });
  it('valores ocultos: sem valores nem percentagens', () => {
    const d = dadosDoWidget({ ...e, hideValues: true }, HOJE);
    expect(d.gastos).toBe('••••••');
    expect(d.rendimento).toBe('••••••');
    expect(d.comparacao).toBe('novembro');
  });
});
