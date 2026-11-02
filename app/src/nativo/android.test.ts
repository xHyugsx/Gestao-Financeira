import { describe, expect, it } from 'vitest';
import { acaoDoEndereco, maisRecente } from './android';

describe('APK: atalhos e versões', () => {
  it('lê a ação do atalho', () => {
    expect(acaoDoEndereco('financas://acao/despesa')).toBe('despesa');
    expect(acaoDoEndereco('https://localhost/index.html?acao=jarvis')).toBe('jarvis');
    expect(acaoDoEndereco('financas://acao/outra')).toBeNull();
    expect(acaoDoEndereco(undefined)).toBeNull();
  });
  it('compara versões', () => {
    expect(maisRecente('2.48.0', '2.47.0')).toBe(true);
    expect(maisRecente('2.47.10', '2.47.9')).toBe(true);
    expect(maisRecente('2.47.0', '2.47.0')).toBe(false);
    expect(maisRecente('2.46.9', '2.47.0')).toBe(false);
  });
});
