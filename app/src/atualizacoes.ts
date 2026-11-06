// Regista o service worker e atualiza a app sozinha (v2.60.0): a versão nova é descarregada e aplicada quando a app
// vai para segundo plano (ou logo ao abrir), sem perguntar e sem interromper um registo a meio. Ao voltar, um aviso curto
// diz para que versão atualizou. Os dados (localStorage) não mudam.
import { CACHE, PREFIXO, VERSAO } from './config';
import { eNativo } from './nativo/plataforma';

const MARCA = `${PREFIXO}atualizada`;

/** Aviso curto «Atualizada para a versão X» (também usado pela APK). */
export function avisoAtualizada(versao: string) {
  const mostrar = () => {
    if (document.getElementById('ff-atualizada')) return;
    const el = document.createElement('div');
    el.id = 'ff-atualizada';
    el.setAttribute('role', 'status');
    el.textContent = `Finanças atualizada para a versão ${versao} ✨`;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, 3500);
  };
  // depois do desbloqueio (o aviso não fica por cima do ecrã de bloqueio)
  const esperar = () => (document.getElementById('ff-lock') ? setTimeout(esperar, 800) : setTimeout(mostrar, 600));
  esperar();
}

export function iniciarAtualizacoes() {
  if (eNativo() || !('serviceWorker' in navigator)) return;
  let pendente: (() => void) | null = null;
  let aAplicar = false;

  /** Aplica já se a app está em segundo plano (ou `agora`); senão, quando for para segundo plano. */
  function quandoPossivel(aplicar: () => void, agora = false) {
    pendente = () => {
      if (aAplicar) return;
      aAplicar = true;
      // guarda a versão de antes: ao recarregar, se a que corre for outra, avisa
      try { localStorage.setItem(MARCA, VERSAO); } catch { /* sem armazenamento */ }
      aplicar();
    };
    if (agora || document.visibilityState === 'hidden') pendente();
  }

  async function verificarVersao() {
    if (!navigator.serviceWorker.controller || !window.caches || pendente) return;
    try {
      const atual = await (await caches.open(CACHE)).match('./version.json').then((r) => (r ? r.json() : null));
      if (!atual) return;
      const r = await fetch('./version.json', { cache: 'no-store' });
      const nova = r.ok ? await r.json() : null;
      if (!nova || nova.version === atual.version) return;
      quandoPossivel(() => {
        const canal = new MessageChannel();
        canal.port1.onmessage = () => location.reload();
        navigator.serviceWorker.controller?.postMessage({ type: 'REFRESH_ALL' }, [canal.port2]);
        setTimeout(() => location.reload(), 20000);
      });
    } catch { /* sem rede: tenta mais tarde */ }
  }

  // aviso depois de atualizar (a marca fica até a app voltar a abrir)
  try {
    const v = localStorage.getItem(MARCA);
    // só se a versão mudou mesmo (o código que corre agora é o novo)
    if (v) { localStorage.removeItem(MARCA); if (v !== VERSAO) avisoAtualizada(VERSAO); }
  } catch { /* sem armazenamento */ }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').then((reg) => {
      const ativar = (w: ServiceWorker | null, agora = false) => quandoPossivel(() => w?.postMessage({ type: 'SKIP_WAITING' }), agora);
      // já instalada de uma vez anterior: aplica logo ao abrir (é imediato)
      if (reg.waiting && navigator.serviceWorker.controller) ativar(reg.waiting, true);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ativar(w); });
      });
      verificarVersao();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') pendente?.();
        else { reg.update().catch(() => {}); verificarVersao(); }
      });
    });
    let recarregar = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recarregar) return;
      recarregar = true;
      location.reload();
    });
  });
}
