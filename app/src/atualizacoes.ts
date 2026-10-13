// Regista o service worker e mostra o aviso "Nova versão disponível" (mesmo comportamento de
// js/modulos/atualizacoes.js da 1.9.x).
import { CACHE } from './config';

export function iniciarAtualizacoes() {
  if (!('serviceWorker' in navigator)) return;
  const ignoradas = new Set<string>();

  function aviso(aoConfirmar: () => void) {
    if (document.getElementById('pwa-update-overlay')) return;
    const o = document.createElement('div');
    o.id = 'pwa-update-overlay';
    o.innerHTML = '<div class="pwa-update-card"><h3>Nova versão disponível</h3><p>Há uma atualização da app pronta a instalar. Queres atualizar agora?</p><div class="pwa-update-actions"><button class="pwa-update-btn dismiss" id="pwa-update-dismiss">Ignorar</button><button class="pwa-update-btn confirm" id="pwa-update-confirm">Atualizar</button></div></div>';
    document.body.appendChild(o);
    document.getElementById('pwa-update-dismiss')!.onclick = () => o.remove();
    const ok = document.getElementById('pwa-update-confirm') as HTMLButtonElement;
    ok.onclick = () => { ok.disabled = true; ok.textContent = 'A atualizar…'; aoConfirmar(); };
  }

  async function verificarVersao() {
    if (!navigator.serviceWorker.controller || !window.caches) return;
    try {
      const atual = await (await caches.open(CACHE)).match('./version.json').then((r) => (r ? r.json() : null));
      if (!atual) return;
      const r = await fetch('./version.json', { cache: 'no-store' });
      const nova = r.ok ? await r.json() : null;
      if (!nova || nova.version === atual.version || ignoradas.has(nova.version)) return;
      aviso(() => {
        const canal = new MessageChannel();
        canal.port1.onmessage = () => location.reload();
        navigator.serviceWorker.controller?.postMessage({ type: 'REFRESH_ALL' }, [canal.port2]);
        setTimeout(() => location.reload(), 20000);
      });
      document.getElementById('pwa-update-dismiss')?.addEventListener('click', () => ignoradas.add(nova.version));
    } catch { /* sem rede: tenta mais tarde */ }
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) aviso(() => reg.waiting?.postMessage({ type: 'SKIP_WAITING' }));
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) aviso(() => w.postMessage({ type: 'SKIP_WAITING' }));
        });
      });
      verificarVersao();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') { reg.update().catch(() => {}); verificarVersao(); }
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
