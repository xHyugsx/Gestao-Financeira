import { describe, expect, it } from 'vitest';
import { horasDoSol, saudacao, svgDoCeu } from './ceu';

describe('céu do cabeçalho', () => {
  const dia = new Date('2026-09-28T11:00:00Z'); // 12:00 em Lisboa

  it('nascer e pôr do sol iguais aos da app atual (07:36 e 19:17 a 28 de setembro)', () => {
    const svg = svgDoCeu(dia);
    expect(svg).toContain('>07:36</text>');
    expect(svg).toContain('>19:17</text>');
    const [n, p] = horasDoSol(dia);
    expect(n).toBeLessThan(p);
  });

  it('sol de dia, lua de noite', () => {
    expect(svgDoCeu(dia)).toContain('ws-rays');
    expect(svgDoCeu(new Date('2026-09-28T22:00:00Z'))).toContain('ws-moon');
  });

  it('saudação conforme a hora', () => {
    expect(saudacao(new Date('2026-09-28T08:00:00Z'))).toBe('Bom dia');
    expect(saudacao(dia)).toBe('Boa tarde');
    expect(saudacao(new Date('2026-09-28T20:00:00Z'))).toBe('Boa noite');
  });
});
