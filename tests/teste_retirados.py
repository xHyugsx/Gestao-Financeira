"""Versões retiradas (/v1/ e /v2/): quem as abrir fica sem a cache e o service worker antigos, a /v2/ apaga os dados de
teste (financas-v2:*), os dados reais ficam intactos e a pessoa vai parar à app."""
import functools, http.server, json, pathlib, shutil, socket, tempfile, threading
from correr import verificar, RAIZ, SITE

REAL = {'financas-familiar:v3': json.dumps({'transactions': [{'id': 1, 'title': 'Mercado', 'amount': -12.3, 'date': '2026-09-20',
                                                              'detail': '20 setembro · Alimentação', 'movementType': 'expense'}]}),
        'financas-familiar:last-backup': '2026-09-27T10:00:00.000Z'}
PREPARAR = """async ([real]) => {
  for (const [k, v] of Object.entries(real)) localStorage.setItem(k, v);
  localStorage.setItem('financas-v2:v3', '{"transactions":[]}'); localStorage.setItem('financas-v2:last-backup', 'x');
  await (await caches.open('financas-v1')).put('./v1/x', new Response('1'));
  await (await caches.open('financas-v2')).put('./v2/x', new Response('2'));
}"""
ESTADO = """async () => [Object.keys(localStorage).sort(), (await caches.keys()).sort(),
  (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.scope).pathname).sort()]"""


async def esperar_app(p, raiz):
    for _ in range(40):
        if p.url.rstrip('/') == raiz.rstrip('/') or p.url == raiz + 'index.html':
            if await p.query_selector('.bottom-nav'): return True
        await p.wait_for_timeout(250)
    return False


async def t_abrir_as_versoes_retiradas_limpa_e_abre_a_app(app):
    p = app.page
    await p.goto(app.raiz); await app.esperar_sw(); await p.wait_for_timeout(1000)
    await p.evaluate(PREPARAR, [REAL])
    for pasta in ('v1/', 'v2/'):
        await p.goto(app.raiz + pasta)
        verificar(await esperar_app(p, app.raiz), f'/{pasta} não reencaminhou para a app (ficou em {p.url})')
    chaves, caches, registos = await p.evaluate(ESTADO)
    verificar(not any(k.startswith('financas-v2:') for k in chaves), f'dados de teste ficaram: {chaves}')
    verificar(all(k in chaves for k in REAL), f'dados reais apagados: {chaves}')
    verificar('financas-v1' not in caches and 'financas-v2' not in caches and 'financas-app' in caches, f'caches: {caches}')
    verificar(all('/v1/' not in r and '/v2/' not in r for r in registos), f'service workers antigos ficaram: {registos}')
    verificar(await p.evaluate("document.querySelectorAll('.transaction-list h3').length") == 1, 'a app não mostra os dados reais')


def servir(pasta):
    s = socket.socket(); s.bind(('127.0.0.1', 0)); porta = s.getsockname()[1]; s.close()
    class Silencioso(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', porta), functools.partial(Silencioso, directory=str(pasta)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{porta}/'


def publicar(pasta, origem):
    for c in pasta.iterdir():
        shutil.rmtree(c) if c.is_dir() else c.unlink()
    shutil.copytree(origem, pasta, dirs_exist_ok=True, copy_function=shutil.copy)  # data de agora, como numa publicação nova


async def t_v2_instalada_no_telemovel_e_retirada(app):
    """Telemóvel com a versão de teste instalada (service worker e cache próprios): ao abri-la depois da publicação, é retirada."""
    antes = pathlib.Path(tempfile.mkdtemp()); pasta = pathlib.Path(tempfile.mkdtemp())
    shutil.copytree(SITE, antes, dirs_exist_ok=True)
    v2 = antes / 'v2'; shutil.rmtree(v2); v2.mkdir()
    (v2 / 'service-worker.js').write_text((RAIZ / 'app' / 'service-worker.js').read_text(encoding='utf-8').replace("'financas-app'", "'financas-v2'"), encoding='utf-8')
    (v2 / 'version.json').write_text('{"version":"2.01.3","files":["index.html"]}', encoding='utf-8')
    (v2 / 'index.html').write_text('<!doctype html><title>V2 antiga</title><p id="antiga">V2 antiga</p>'
                                   "<script>navigator.serviceWorker.register('./service-worker.js')</script>", encoding='utf-8')
    publicar(pasta, antes)
    srv, url = servir(pasta)
    p = app.page
    try:
        await p.goto(url + 'v2/'); await p.wait_for_timeout(2500); await p.reload(); await p.wait_for_timeout(1500)
        verificar(await p.query_selector('#antiga') and await p.evaluate("!!navigator.serviceWorker.controller"), 'a V2 antiga não ficou instalada')
        await p.evaluate("localStorage.setItem('financas-v2:v3','{}')")
        publicar(pasta, SITE)
        await p.reload()  # abre a V2 (servida pela cache antiga); o service worker novo retira-a
        verificar(await esperar_app(p, url), f'não foi parar à app (ficou em {p.url})')
        chaves, caches, registos = await p.evaluate(ESTADO)
        verificar('financas-v2' not in caches and not any(k.startswith('financas-v2:') for k in chaves) and all('/v2/' not in r for r in registos),
                  f'a V2 não foi retirada: {caches} {registos}')
    finally:
        srv.shutdown(); shutil.rmtree(antes, ignore_errors=True); shutil.rmtree(pasta, ignore_errors=True)
