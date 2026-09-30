"""Troca (etapa 13): um telemóvel com a app anterior (1.9.x) na raiz recebe a app nova sem perder dados; /v1/ fica para recuo."""
import functools, http.server, json, pathlib, shutil, socket, tempfile, threading
from correr import verificar, RAIZ, SITE

VERSAO = json.loads((RAIZ / 'app' / 'versao.json').read_text(encoding='utf-8'))['versao']
ANTIGA = json.loads((RAIZ / 'version.json').read_text(encoding='utf-8'))
DADOS = {'transactions': [
    {'id': 1, 'title': 'Mercado', 'amount': -12.3, 'date': '2026-09-20', 'detail': '20 setembro · Alimentação', 'movementType': 'expense', 'note': 'fruta'},
    {'id': 2, 'title': 'Galp', 'amount': -40, 'date': '2026-09-10', 'detail': '10 setembro · Combustível', 'movementType': 'expense'}],
    'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 500}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 80}]}
EXTRA = {'financas-familiar:vet-reminders': json.dumps([{'id': 1, 'pet': 'Sam', 'type': 'vacina', 'last': '2025-10-20', 'every': 12}]),
         'financas-familiar:vet-snooze': '9999999999999',
         'financas-familiar:last-backup': '2026-09-27T10:00:00.000Z',
         'financas-familiar:jarvis-threads:v2': json.dumps([{'id': 'x', 'title': 'Nova conversa', 'updatedAt': '2026-09-27T10:00:00.000Z',
                                                             'messages': [{'role': 'user', 'content': 'Olá'}, {'role': 'assistant', 'content': 'Olá!'}]}])}
QUAL = "window.ffVer || (window.ffStmt ? 'antiga' : null)"  # a app anterior não expõe a versão; só ela tem o módulo de extratos
LER = "Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('financas-familiar:')).map(k=>[k,localStorage.getItem(k)]))"


def servir(pasta):
    s = socket.socket(); s.bind(('127.0.0.1', 0)); porta = s.getsockname()[1]; s.close()
    class Silencioso(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', porta), functools.partial(Silencioso, directory=str(pasta)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{porta}/'


def publicar(pasta, origem):
    """Troca o conteúdo publicado (como uma nova publicação no GitHub Pages)."""
    for c in pasta.iterdir():
        shutil.rmtree(c) if c.is_dir() else c.unlink()
    shutil.copytree(origem, pasta, dirs_exist_ok=True, copy_function=shutil.copy)  # data de agora, como numa publicação nova (senão o servidor responde 304)


async def t_telemovel_com_a_versao_antiga_atualiza_sem_perder_dados(app):
    antiga = pathlib.Path(tempfile.mkdtemp()); pasta = pathlib.Path(tempfile.mkdtemp())
    for f in {'index.html', 'version.json', 'service-worker.js', *ANTIGA['files']}:
        (antiga / f).parent.mkdir(parents=True, exist_ok=True); shutil.copy(RAIZ / f, antiga / f)
    publicar(pasta, antiga)
    srv, url = servir(pasta)
    p = app.page
    try:
        app.url = url
        await app.abrir(DADOS, EXTRA, sem_backup_aviso=False)
        await p.reload(); await p.wait_for_timeout(2500)
        verificar(await p.evaluate(QUAL) == 'antiga', 'a app anterior não abriu')
        antes = await p.evaluate(LER)
        publicar(pasta, SITE)
        for _ in range(5):  # a app anterior e depois a nova pedem «Atualizar» (versão e depois o service worker novo)
            await p.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await p.wait_for_timeout(2500)
            if not await p.query_selector('#pwa-update-confirm'):
                continue
            async with p.expect_navigation(timeout=30000):
                await p.click('#pwa-update-confirm')
            await p.wait_for_timeout(3000)
        verificar(await p.evaluate(QUAL) == VERSAO, f'não passou para a versão nova: {await p.evaluate(QUAL)}')
        await p.wait_for_timeout(2500)
        depois = await p.evaluate(LER)
        conversa = lambda d: [t['messages'] for t in json.loads(d['financas-familiar:jarvis-threads:v2'])]  # «updatedAt» muda ao abrir, nas duas apps
        verificar(conversa(depois) == conversa(antes), 'a conversa do Jarvis mudou com a atualização')
        for k in EXTRA:
            if k != 'financas-familiar:jarvis-threads:v2':
                verificar(depois.get(k) == antes.get(k), f'a chave {k} mudou com a atualização')
        d0, d1 = json.loads(antes['financas-familiar:v3']), json.loads(depois['financas-familiar:v3'])
        verificar(d1['transactions'] == d0['transactions'] and d1['accounts'] == d0['accounts'], 'movimentos ou contas mudaram com a atualização')
        titulos = await p.evaluate("[...document.querySelectorAll('.transaction-list h3')].map(e=>e.textContent)")
        verificar(titulos == ['Mercado', 'Galp'], f'movimentos na app nova: {titulos}')
        chaves = await p.evaluate("caches.open('financas-app').then(c=>c.keys()).then(k=>k.map(r=>new URL(r.url).pathname))")
        verificar('/js/app.js' in chaves and not any('/js/modulos/' in k for k in chaves), f'a cache não ficou só com a app nova: {sorted(chaves)[:8]}')
        await p.context.set_offline(True)
        try:
            await p.reload(); await p.wait_for_timeout(2000)
            sem_rede = await p.evaluate("[window.ffVer, document.querySelectorAll('.transaction-list h3').length]")
        finally:
            await p.context.set_offline(False)
        verificar(sem_rede == [VERSAO, 2], f'sem internet depois da atualização: {sem_rede}')
    finally:
        srv.shutdown(); shutil.rmtree(antiga, ignore_errors=True); shutil.rmtree(pasta, ignore_errors=True)


async def t_versao_anterior_fica_em_v1_com_os_mesmos_dados(app):
    p = app.page
    app.url = app.raiz + 'v1/'
    await app.abrir(DADOS, EXTRA)
    await p.reload(); await p.wait_for_timeout(2500)
    v1 = await p.evaluate("[window.ffVer || (window.ffStmt ? 'antiga' : null), document.querySelectorAll('.transaction-list h3').length, navigator.serviceWorker.controller?.scriptURL||'']")
    verificar(v1[0] == 'antiga' and v1[1] == 2 and v1[2].endswith('/v1/service-worker.js'), f'/v1/: {v1}')
    await p.goto(app.raiz); await app.esperar_sw(); await p.wait_for_timeout(1500)
    raiz = await p.evaluate("[window.ffVer, document.querySelectorAll('.transaction-list h3').length, navigator.serviceWorker.controller?.scriptURL||'']")
    verificar(raiz[0] == VERSAO and raiz[1] == 2 and raiz[2].endswith('/service-worker.js') and '/v1/' not in raiz[2], f'raiz: {raiz}')
    verificar(await p.evaluate("Promise.all([caches.has('financas-v1'), caches.has('financas-app')])") == [True, True], 'caches da raiz e da /v1/ não estão separadas')
    verificar(not await p.query_selector('#ffv2-tag'), 'a faixa «V2 · teste» aparece na raiz')
