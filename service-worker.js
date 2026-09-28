// Service worker da app Finanças: modo offline e atualizações controladas pelo version.json
const CACHE = 'financas-app';
const CORE = ['./', './index.html', './version.json'];
const ROOT = new URL('./', self.location).pathname;
const SUB_APPS = ['v1/', 'v2/']; // versões de teste/recuo com service worker e cache próprios
const isOwn = (url) => !SUB_APPS.some((p) => url.pathname.startsWith(ROOT + p));

async function fileList() {
  try {
    const r = await fetch('./version.json', { cache: 'reload' });
    const j = await r.json();
    return [...new Set([...CORE, ...(j.files || []).map((f) => './' + f)])];
  } catch {
    return CORE;
  }
}

async function cacheAll() {
  const cache = await caches.open(CACHE);
  const list = await fileList();
  await Promise.all(list.map(async (u) => {
    const res = await fetch(new Request(u, { cache: 'reload' }));
    if (res.ok) await cache.put(u, res);
  }));
}

self.addEventListener('install', (event) => event.waitUntil(cacheAll()));

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const type = event.data?.type;
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'REFRESH_ALL' || type === 'REFRESH_INDEX') {
    const port = event.ports[0];
    event.waitUntil(cacheAll().then(() => port?.postMessage({ ok: true })).catch(() => port?.postMessage({ ok: false })));
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !isOwn(url)) return;
  if (url.pathname.endsWith('/version.json')) return; // a verificação de versões vai sempre à rede

  if (request.mode === 'navigate') {
    event.respondWith(caches.match('./index.html', { cacheName: CACHE }).then((c) => c || fetch(request)));
    return;
  }
  event.respondWith(
    caches.match(request, { cacheName: CACHE }).then((cached) => cached || fetch(request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
      return res;
    }))
  );
});
