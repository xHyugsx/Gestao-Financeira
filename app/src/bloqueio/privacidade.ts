// Imagem desfocada por cima da app quando sai dela (gestor de apps), como na app atual.
import { rebloqueio } from './estado';

let camada: HTMLDivElement | null = null;

const mostrar = () => camada?.classList.add('on');
export const esconderPrivacidade = () => camada?.classList.remove('on');
const aoVoltar = () => { if (!rebloqueio.pendente) esconderPrivacidade(); };

export function iniciarPrivacidade(): void {
  const iniciar = () => {
    camada = document.createElement('div');
    camada.id = 'ff-privacy';
    camada.setAttribute('aria-hidden', 'true');
    camada.addEventListener('pointerdown', esconderPrivacidade);
    document.body.appendChild(camada);
    window.addEventListener('blur', mostrar);
    window.addEventListener('focus', aoVoltar);
    window.addEventListener('pagehide', mostrar);
    window.addEventListener('pageshow', aoVoltar);
    document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? mostrar() : aoVoltar()));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
}
