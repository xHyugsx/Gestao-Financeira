from correr import verificar


async def t_funciona_sem_internet(app):
    await app.abrir()
    p = app.page
    await p.reload(); await p.wait_for_timeout(2500)
    await p.context.set_offline(True)
    await p.reload(); await p.wait_for_timeout(2000)
    ok = await p.evaluate("!!document.querySelector('.bottom-nav')")
    await p.context.set_offline(False)
    verificar(ok, 'a app não abriu sem internet')


async def t_aviso_de_nova_versao(app):
    await app.abrir()
    p = app.page
    await p.reload(); await p.wait_for_timeout(2500)
    await p.route('**/version.json', lambda r: r.fulfill(status=200, content_type='application/json', body='{"version":"9.99.9","files":[]}'))
    await p.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await p.wait_for_timeout(1500)
    verificar(await p.query_selector('#pwa-update-overlay'), 'aviso de nova versão não apareceu')


async def t_sw_nao_responde_pela_v2(app):
    await app.abrir()
    p = app.page
    await p.reload(); await p.wait_for_timeout(2500)
    verificar(await p.evaluate("!!navigator.serviceWorker.controller"), 'service worker não ficou ativo')
    r = await p.goto(app.url + 'v2/qualquer-coisa'); await p.wait_for_timeout(800)
    verificar(r.status == 404 and not await p.query_selector('.bottom-nav'), f'o service worker respondeu por /v2/ (estado {r.status})')


async def t_sw_preserva_cache_da_v2(app):
    await app.abrir()
    p = app.page
    await p.reload(); await p.wait_for_timeout(2500)
    await p.evaluate("""async()=>{await (await caches.open('financas-v2')).put('./v2/marca', new Response('v2'));
      for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister()}""")
    await p.reload(); await p.wait_for_timeout(3000)
    ativo = await p.evaluate("navigator.serviceWorker.getRegistration().then(r=>!!r?.active)")
    verificar(ativo, 'o service worker não voltou a ativar')
    verificar(await p.evaluate("caches.has('financas-v2')"), 'o service worker apagou a cache da /v2/')
