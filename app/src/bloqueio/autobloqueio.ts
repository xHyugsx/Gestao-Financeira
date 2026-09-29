// Bloquear ao voltar à app depois de algum tempo fora ("Logo", 1 min, 5 min ou "Nunca").
import { PREFIXO } from '../config';
import { chave } from '../dados';
import { rebloqueio } from './estado';
import { esconderPrivacidade } from './privacidade';

const CHAVE = chave('autobloqueio', PREFIXO);

export type ModoAutobloqueio = 'off' | 'now' | '60' | '300';

export function modoAutobloqueio(): string {
  try { return localStorage.getItem(CHAVE) || '60'; } catch { return '60'; }
}

export function mudarModoAutobloqueio(m: ModoAutobloqueio): void {
  try { localStorage.setItem(CHAVE, m); } catch { /* sem armazenamento */ }
}

function limite(): number {
  const m = modoAutobloqueio();
  return m === 'off' ? Infinity : m === 'now' ? 0 : parseInt(m, 10) * 1000;
}

/** `bloquear` devolve `false` se não houver PIN (nada a bloquear). */
export function iniciarAutobloqueio(bloquear: () => boolean): void {
  let saiuEm = 0, ignorar = false;
  // Escolher um ficheiro abre o seletor do sistema: não conta como sair da app.
  document.addEventListener('click', (e) => { if ((e.target as Element | null)?.closest?.('input[type=file]')) ignorar = true; }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { if (!saiuEm) saiuEm = Date.now(); return; }
    const fora = saiuEm ? Date.now() - saiuEm : -1;
    saiuEm = 0;
    if (ignorar) { ignorar = false; return; }
    if (fora < 0 || fora < limite() || document.getElementById('ff-lock')) return;
    rebloqueio.pendente = true;
    if (!bloquear()) { rebloqueio.pendente = false; return; }
    setTimeout(() => {
      if (rebloqueio.pendente) { rebloqueio.pendente = false; esconderPrivacidade(); }
    }, 2000);
  });
}
