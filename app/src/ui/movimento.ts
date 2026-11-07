// Animações: desligadas pelo sistema (movimento reduzido) ou em Definições › Aparência › Animações (v2.64.0).
const CLASSE = 'ff-sem-animacoes';

export const semAnimacoes = (): boolean =>
  document.documentElement.classList.contains(CLASSE) || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function aplicarAnimacoes(ligadas: boolean): void {
  document.documentElement.classList.toggle(CLASSE, !ligadas);
}
