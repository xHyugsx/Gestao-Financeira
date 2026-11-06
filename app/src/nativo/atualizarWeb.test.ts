import { describe, expect, it } from 'vitest';
import { comGuarda, decidir, maisRecente } from './atualizarWeb';

describe('atualização sozinha da APK', () => {
  it('só a parte web quando o nível Android é o mesmo; senão, a APK', () => {
    expect(decidir({ version: '2.61.0', nativo: 1 }, '2.60.0', 1)).toBe('web');
    expect(decidir({ version: '2.61.0' }, '2.60.0', 1)).toBe('web');
    expect(decidir({ version: '2.61.0', nativo: 2 }, '2.60.0', 1)).toBe('apk');
    expect(decidir({ version: '2.60.0', nativo: 1 }, '2.60.0', 1)).toBe('nada');
    expect(decidir({ version: '2.59.0', nativo: 1 }, '2.60.0', 1)).toBe('nada');
    expect(decidir({ version: '2.61.0', nativo: 1 }, '2.60.0', 1, ['2.61.0'])).toBe('nada');
    expect(maisRecente('2.60.10', '2.60.9')).toBe(true);
  });
  it('a versão descarregada leva uma guarda que volta atrás se não arrancar', () => {
    const html = comGuarda('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>', '2.61.0');
    expect(html.indexOf('<script>')).toBeGreaterThan(html.indexOf('<head>'));
    expect(html).toContain('__ffArrancou');
    expect(html).toContain("setServerAssetPath");
    expect(html).toContain('"2.61.0"');
  });
});
