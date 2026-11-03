import { describe, expect, it } from 'vitest';
import { estadoInicial, criarBackup } from '../dados';
import { assinatura, copiasAApagar } from './backupAuto';

describe('backup automático', () => {
  it('guarda só as 7 cópias mais recentes', () => {
    const nomes = Array.from({ length: 10 }, (_, i) => `financas-auto-2026-11-${String(i + 1).padStart(2, '0')}.json`);
    expect(copiasAApagar([...nomes, 'outro.json'])).toEqual(['financas-auto-2026-11-03.json', 'financas-auto-2026-11-02.json', 'financas-auto-2026-11-01.json']);
    expect(copiasAApagar(nomes.slice(0, 5))).toEqual([]);
  });
  it('a assinatura ignora a hora da cópia e muda com os dados', () => {
    const e = estadoInicial();
    const a = criarBackup(e, { jarvisThreads: [], vetReminders: [], agora: new Date(2026, 0, 1) });
    const b = criarBackup(e, { jarvisThreads: [], vetReminders: [], agora: new Date(2026, 5, 1) });
    expect(assinatura(a)).toBe(assinatura(b));
    const c = criarBackup({ ...e, transactions: [{ id: 1, title: 'x', detail: '', amount: -1, date: '2026-01-01', movementType: 'expense' }] }, { jarvisThreads: [], vetReminders: [] });
    expect(assinatura(c)).not.toBe(assinatura(a));
  });
});
