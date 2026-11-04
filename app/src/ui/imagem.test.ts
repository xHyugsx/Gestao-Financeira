import { describe, expect, it } from 'vitest';
import { eGrande, medidas } from './imagem';

describe('reduzir imagens', () => {
  it('mantém a proporção e não aumenta', () => {
    expect(medidas(4000, 3000, 640)).toEqual([640, 480]);
    expect(medidas(1080, 2400, 1600)).toEqual([720, 1600]);
    expect(medidas(300, 200, 640)).toEqual([300, 200]);
  });
  it('deteta as fotografias grandes de versões anteriores', () => {
    expect(eGrande(`data:image/jpeg;base64,${'a'.repeat(400_000)}`)).toBe(true);
    expect(eGrande('data:image/jpeg;base64,abc')).toBe(false);
    expect(eGrande(undefined)).toBe(false);
  });
});
