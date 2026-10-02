// Versão retirada: substitui o service worker antigo, apaga a cache, desregista-se e recarrega as janelas abertas
// (que passam a receber a página de retirada, que reencaminha para a app).
const CACHE = '{{CACHE}}';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  await caches.delete(CACHE);
  await self.clients.claim();
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url).catch(() => {});
})()));
