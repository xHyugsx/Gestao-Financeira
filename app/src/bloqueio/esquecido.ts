// «Esqueci-me do PIN» (v2.57.0): sem servidor, a única saída é apagar os dados deste telemóvel e restaurar um backup sem o PIN.
import { chave } from '../dados';
import { PREFIXO } from '../config';

const CHAVE = () => chave('pinEsquecido', PREFIXO);

/** Apaga tudo o que a app guarda neste telemóvel, deixa a marca do PIN esquecido e recomeça. */
export function apagarPorPinEsquecido(prefixos: string[]): void {
  try {
    Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
      .filter((k): k is string => !!k && prefixos.some((p) => k.startsWith(p)))
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(CHAVE(), new Date().toISOString());
  } catch { /* sem armazenamento */ }
  window.location.reload();
}

export function pinFoiEsquecido(): boolean {
  try { return !!localStorage.getItem(CHAVE()); } catch { return false; }
}

/** Depois do restauro: o PIN do backup não volta (nem a impressão digital ligada a ele). */
export function esquecerMarcaDoPin(): void {
  try { for (const k of [CHAVE(), chave('biometria', PREFIXO), chave('ofertaBiometria', PREFIXO)]) localStorage.removeItem(k); } catch { /* sem armazenamento */ }
}
