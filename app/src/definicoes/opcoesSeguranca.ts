// Opções "Impressão digital" e "Bloquear ao voltar à app" do painel Segurança.
// Desenhadas diretamente no DOM, com a mesma marcação da app atual (js/modulos/bloqueio.js e autobloqueio.js).
import * as biometria from '../bloqueio/biometria';
import { type ModoAutobloqueio, modoAutobloqueio, mudarModoAutobloqueio } from '../bloqueio/autobloqueio';

function pintar(el: HTMLElement, ativa: (v: string) => boolean) {
  el.querySelectorAll<HTMLElement>('[data-v]').forEach((b) => {
    const a = ativa(b.dataset.v!);
    b.className = a ? 'autohide-choice autohide-choice-active' : 'autohide-choice';
    b.setAttribute('aria-checked', String(a));
  });
}

export function montarBiometria(el: HTMLElement, hash: string): void {
  el.innerHTML = '';
  el.style.display = 'none';
  void biometria.disponivel().then((disponivel) => {
    if (!disponivel || !hash) return;
    el.style.display = '';
    el.innerHTML = '<div class="settings-divider"></div><div class="autohide-setting"><strong>Impressão digital</strong><small>Desbloquear com o sensor do telemóvel. O PIN continua como alternativa.</small><div class="autohide-options" role="radiogroup" aria-label="Impressão digital" style="grid-template-columns:repeat(2,minmax(0,1fr))"><button type="button" role="radio" data-v="off">Desligado</button><button type="button" role="radio" data-v="on">Ativado</button></div><small class="ffb-msg" aria-live="polite"></small></div>';
    const msg = el.querySelector('.ffb-msg')!;
    const repintar = () => { const on = biometria.registada(hash); pintar(el, (v) => (v === 'on') === on); };
    repintar();
    el.querySelector('.autohide-options')!.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-v]');
      if (!b) return;
      if (b.dataset.v === 'off') {
        if (biometria.registada(hash)) { biometria.desativar(); msg.textContent = 'Impressão digital desativada.'; }
        repintar();
        return;
      }
      if (biometria.registada(hash)) return;
      msg.textContent = 'A aguardar o sensor…';
      void biometria.registar(hash).then((ok) => { repintar(); msg.textContent = ok ? 'Impressão digital ativada.' : 'Não foi possível ativar.'; });
    });
  });
}

const MODOS: [ModoAutobloqueio, string][] = [['off', 'Nunca'], ['now', 'Logo'], ['60', 'Após 1 min'], ['300', 'Após 5 min']];

export function montarAutobloqueio(el: HTMLElement): void {
  el.innerHTML = '<div class="settings-divider"></div><div class="autohide-setting"><strong>Bloquear ao voltar à app</strong><small>Pede o PIN (ou a impressão digital) quando regressas depois de algum tempo fora da app.</small><div class="autohide-options" role="radiogroup" aria-label="Bloquear ao voltar à app" style="grid-template-columns:repeat(4,minmax(0,1fr))">'
    + MODOS.map(([v, l]) => `<button type="button" role="radio" data-v="${v}">${l}</button>`).join('') + '</div></div>';
  const repintar = () => { const m = modoAutobloqueio(); pintar(el, (v) => v === m); };
  repintar();
  el.querySelector('.autohide-options')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-v]');
    if (!b) return;
    mudarModoAutobloqueio(b.dataset.v as ModoAutobloqueio);
    repintar();
  });
}
