// Animações (Definições › Aparência): todas, leves ou desligadas (v2.64.0/v2.65.0).
// Desligadas também quando o sistema pede movimento reduzido.
import { eNativo } from '../nativo/plataforma';

export type NivelAnimacoes = 'todas' | 'leves' | 'nenhuma';
const SEM = 'ff-sem-animacoes';
const LEVES = 'ff-animacoes-leves';

/** `appearance.animations`: false = desligadas, 'leves', true = todas; sem valor = leves na APK, todas na versão web. */
export function nivelAnimacoes(valor: unknown): NivelAnimacoes {
  if (valor === false) return 'nenhuma';
  if (valor === 'leves') return 'leves';
  if (valor === true) return 'todas';
  return eNativo() ? 'leves' : 'todas';
}

export const valorDoNivel = (n: NivelAnimacoes): boolean | 'leves' => (n === 'nenhuma' ? false : n === 'leves' ? 'leves' : true);

export const semAnimacoes = (): boolean =>
  document.documentElement.classList.contains(SEM) || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Também sem as animações decorativas (números a subir): desligadas ou leves. */
export const animacoesReduzidas = (): boolean => semAnimacoes() || document.documentElement.classList.contains(LEVES);

export function aplicarAnimacoes(n: NivelAnimacoes): void {
  const raiz = document.documentElement;
  raiz.classList.toggle(SEM, n === 'nenhuma');
  raiz.classList.toggle(LEVES, n === 'leves');
}
