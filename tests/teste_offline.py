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


async def t_nova_versao_sem_pergunta_nem_recarregar_a_meio(app):
    """v2.60.0: a versão nova não pergunta nem recarrega com a app à vista (aplica-se ao ir para segundo plano)."""
    await app.abrir()
    p = app.page
    await p.reload(); await p.wait_for_timeout(2500)
    await p.route('**/version.json', lambda r: r.fulfill(status=200, content_type='application/json', body='{"version":"9.99.9","files":[]}'))
    await p.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await p.wait_for_timeout(1500)
    url = p.url
    await p.wait_for_timeout(1500)
    verificar(not await p.query_selector('#pwa-update-overlay') and p.url == url, 'não devia perguntar nem recarregar com a app à vista')
