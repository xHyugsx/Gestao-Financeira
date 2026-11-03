import { describe, expect, it } from 'vitest';
import { lerBackup, perguntaRestauro } from './backup';

describe('pergunta antes de restaurar', () => {
  it('mostra a data da cópia e os movimentos', () => {
    const r = lerBackup(JSON.stringify({ exportedAt: '2026-11-03T09:42:00Z', data: { transactions: [{ amount: -1, title: 'a' }, { amount: -2, title: 'b' }] } }));
    if (!r.ok) throw new Error('backup inválido');
    const t = perguntaRestauro(r, 5);
    expect(t).toContain('3/11/2026');
    expect(t).toContain('(2 movimentos)');
    expect(t).toContain('(5 movimentos)');
  });
  it('sem data, não a mostra', () => {
    const r = lerBackup(JSON.stringify({ transactions: [] }));
    if (!r.ok) throw new Error('backup inválido');
    expect(perguntaRestauro(r, 0)).toMatch(/^Restaurar a cópia \(0 movimentos\)/);
  });
});
