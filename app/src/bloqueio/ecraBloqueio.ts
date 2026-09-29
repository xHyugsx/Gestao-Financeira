// Ecrã de bloqueio: deslizar para cima, teclado de PIN, impressão digital e oferta para a ativar.
// Mesmo comportamento (gestos, tempos e vibrações) da app atual.
import { hashPin } from '../dados';
import * as biometria from './biometria';
import { rebloqueio } from './estado';
import { marcacaoBloqueio, SVG_IMPRESSAO } from './marcacao';
import { esconderPrivacidade } from './privacidade';

export interface OpcoesBloqueio {
  /** Hash do PIN guardado. */
  hash: string;
  aoDesbloquear: () => void;
}

const vibrar = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* sem vibração */ } };

/** Desenha o ecrã dentro de `anfitriao`; devolve a função que o desmonta. */
export function montarBloqueio(anfitriao: HTMLElement, { hash, aoDesbloquear }: OpcoesBloqueio): () => void {
  const raiz = document.createElement('div');
  raiz.id = 'ff-lock';
  raiz.innerHTML = marcacaoBloqueio();
  anfitriao.appendChild(raiz);

  const q = <T extends Element>(s: string) => raiz.querySelector(s) as T;
  const teclado = q<HTMLElement>('.ffl-pad'), pontos = q<HTMLElement>('.ffl-dots');
  const listaPontos = [...pontos.children];
  const teclaBio = q<HTMLElement>('[data-k="bio"]');
  const comBio = biometria.registada(hash);
  let pin = '', ocupado = false, bioOcupada = false, controlo: AbortController | null = null;
  let inicioY: number | null = null, inicioT = 0;

  if (comBio) { teclaBio.innerHTML = SVG_IMPRESSAO; teclaBio.className = 'ffl-key bio'; }

  const aberto = () => raiz.classList.contains('ffl-open');
  const aAguardar = () => raiz.classList.contains('ffl-bio');
  const desenhar = () => listaPontos.forEach((d, i) => d.classList.toggle('on', i < pin.length));
  const limpar = () => { pin = ''; pontos.className = 'ffl-dots'; desenhar(); };

  function abrir() {
    raiz.classList.remove('ffl-bio');
    if (aberto()) return;
    raiz.classList.add('ffl-open');
    teclado.setAttribute('aria-hidden', 'false');
    vibrar(12);
  }
  function fechar() {
    if (ocupado) return;
    raiz.classList.remove('ffl-open', 'ffl-bio');
    teclado.setAttribute('aria-hidden', 'true');
    limpar();
  }
  function terminar() {
    ocupado = true;
    raiz.classList.add('ffl-gone');
    window.removeEventListener('keydown', aoTeclar);
    setTimeout(() => { raiz.remove(); aoDesbloquear(); }, 420);
  }
  function iniciarBio(doTeclado: boolean) {
    if (bioOcupada || ocupado) return;
    bioOcupada = true;
    controlo = new AbortController();
    if (!doTeclado) { raiz.classList.add('ffl-bio'); vibrar(12); }
    biometria.verificar(hash, controlo.signal).then((ok) => {
      bioOcupada = false; controlo = null;
      if (ok) { vibrar(25); if (aberto()) pontos.classList.add('ok'); terminar(); return; }
      if (aAguardar()) abrir();
      else if (doTeclado) vibrar([40, 40, 40]);
    });
  }
  function usarPin() { try { controlo?.abort(); } catch { /* já terminou */ } abrir(); }
  function revelar() { if (aberto() || aAguardar()) return; if (comBio) iniciarBio(false); else abrir(); }

  // Depois do PIN certo: oferece a impressão digital uma vez (se houver sensor e ainda não estiver ativa).
  function depoisDoPin() {
    if (comBio || biometria.ofertaRecusada()) { setTimeout(terminar, 250); return; }
    biometria.disponivel().then((d) => {
      if (!d) { setTimeout(terminar, 250); return; }
      setTimeout(() => raiz.classList.add('ffl-offer'), 350);
    });
  }
  function confirmarPin() {
    ocupado = true;
    hashPin(pin).then((h) => {
      if (h === hash) { pontos.classList.add('ok'); vibrar(25); depoisDoPin(); return; }
      pontos.classList.add('err'); vibrar([70, 50, 70]);
      setTimeout(() => { limpar(); ocupado = false; }, 450);
    });
  }
  function premir(k: string) {
    if (ocupado) return;
    if (k === 'bio') { if (comBio) iniciarBio(true); return; }
    if (k === 'del') { pin = pin.slice(0, -1); desenhar(); vibrar(8); return; }
    if (pin.length >= 4) return;
    pin += k; desenhar(); vibrar(10);
    if (pin.length === 4) setTimeout(confirmarPin, 120);
  }

  q<HTMLElement>('.ffl-keys').addEventListener('pointerdown', (e) => {
    const tecla = (e.target as Element).closest<HTMLElement>('.ffl-key');
    if (!tecla || (tecla.dataset.k === 'bio' && !comBio)) return;
    tecla.classList.add('pressed');
    premir(tecla.dataset.k!);
    const soltar = () => {
      tecla.classList.remove('pressed');
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  });
  q<HTMLElement>('.ffl-pad .ffl-back').addEventListener('click', fechar);
  q<HTMLElement>('.ffl-usepin').addEventListener('click', usarPin);
  q<HTMLElement>('.ffl-no').addEventListener('click', () => { biometria.recusarOferta(); terminar(); });
  q<HTMLButtonElement>('.ffl-yes').addEventListener('click', function (this: HTMLButtonElement) {
    this.disabled = true; this.textContent = 'A ativar…';
    biometria.registar(hash).then((ok) => { if (ok) vibrar(25); terminar(); });
  });

  // Gestos: deslizar para cima abre, para baixo fecha o teclado; um toque na dica também abre.
  raiz.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('.ffl-key,.ffl-back,.ffl-sheet')) return;
    inicioY = e.clientY; inicioT = performance.now();
  });
  raiz.addEventListener('pointerup', (e) => {
    if (inicioY === null) return;
    const dy = e.clientY - inicioY, v = dy / Math.max(1, performance.now() - inicioT);
    inicioY = null;
    if (!aberto() && !aAguardar() && (dy < -70 || v < -0.5)) revelar();
    else if (aberto() && !ocupado && (dy > 90 || v > 0.6) && !(e.target as Element).closest('.ffl-keys')) fechar();
    else if (!aberto() && !aAguardar() && Math.abs(dy) < 8 && (e.target as Element).closest('.ffl-hint')) revelar();
  });

  function aoTeclar(e: KeyboardEvent) {
    if (aAguardar()) return;
    if (/^[0-9]$/.test(e.key)) { abrir(); premir(e.key); }
    else if (e.key === 'Backspace' && aberto()) premir('del');
    else if (e.key === 'Escape') fechar();
    else if ((e.key === 'Enter' || e.key === 'ArrowUp') && !aberto()) revelar();
  }
  window.addEventListener('keydown', aoTeclar);

  if (rebloqueio.pendente) {
    rebloqueio.pendente = false;
    requestAnimationFrame(() => requestAnimationFrame(() => esconderPrivacidade()));
  }

  return () => { window.removeEventListener('keydown', aoTeclar); raiz.remove(); };
}
