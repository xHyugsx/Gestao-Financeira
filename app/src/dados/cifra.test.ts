import { describe, expect, it } from 'vitest';
import { cifrarBackup, decifrarBackup, eBackupCifrado } from './cifra';

const texto = JSON.stringify({ app: 'financas-familiar', version: 4, data: { transactions: [{ id: 1, title: 'Mercado', amount: -12.3 }] } });

describe('backup protegido', () => {
  it('cifra e decifra com a mesma palavra-passe', async () => {
    const b = await cifrarBackup(texto, 'segredo1', new Date('2026-10-12T10:00:00Z'), 1000);
    expect(eBackupCifrado(b)).toBe(true);
    expect(JSON.stringify(b)).not.toContain('Mercado');
    expect(await decifrarBackup(b, 'segredo1')).toBe(texto);
  });
  it('palavra-passe errada ou ficheiro alterado dá null', async () => {
    const b = await cifrarBackup(texto, 'segredo1', new Date(), 1000);
    expect(await decifrarBackup(b, 'segredo2')).toBeNull();
    const alterado = { ...b, encrypted: { ...b.encrypted, data: b.encrypted.data.replace(/^./, (c) => (c === 'A' ? 'B' : 'A')) } };
    expect(await decifrarBackup(alterado, 'segredo1')).toBeNull();
  });
  it('cada backup usa sal e IV novos', async () => {
    const [a, b] = [await cifrarBackup(texto, 'x123456', new Date(), 1000), await cifrarBackup(texto, 'x123456', new Date(), 1000)];
    expect(a.encrypted.salt).not.toBe(b.encrypted.salt);
    expect(a.encrypted.iv).not.toBe(b.encrypted.iv);
  });
  it('reconhece só o formato protegido', () => {
    expect(eBackupCifrado(JSON.parse(texto))).toBe(false);
    expect(eBackupCifrado(null)).toBe(false);
  });
});
