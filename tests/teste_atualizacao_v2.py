"""Atualização da app nova: aviso «Nova versão», «Atualizar» guarda a versão nova, apaga ficheiros antigos e mantém os dados."""
import json
from correr import verificar, PREFIXO

DADOS = {'transactions': [{'id': 1, 'title': 'Mercado', 'amount': -12.3, 'date': '2026-09-20', 'detail': '20 setembro · Alimentação', 'movementType': 'expense'}]}
VELHO = './assets/fundo-cosmico-versao-antiga.webp'


async def t_atualizar_limpa_a_cache_e_mantem_os_dados(app):
    await app.abrir(DADOS)
    p = app.page
    await p.reload(); await p.wait_for_timeout(2500)
    antes = await p.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO)
    await p.evaluate("V=>caches.open('financas-v2').then(c=>c.put(V,new Response('antigo')))", VELHO)
    await p.route('**/version.json', lambda r: r.fulfill(status=200, content_type='application/json', body='{"version":"9.99.9","files":[]}'))
    await p.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await p.wait_for_timeout(1500)
    verificar(await p.query_selector('#pwa-update-overlay'), 'aviso de nova versão não apareceu')
    await p.unroute('**/version.json')
    async with p.expect_navigation(timeout=20000):
        await p.click('#pwa-update-confirm')
    await p.wait_for_timeout(2000)
    chaves = await p.evaluate("caches.open('financas-v2').then(c=>c.keys()).then(k=>k.map(r=>new URL(r.url).pathname))")
    verificar(not any(k.endswith('fundo-cosmico-versao-antiga.webp') for k in chaves), f'ficheiro antigo ficou na cache: {chaves}')
    verificar(any(k.endswith('/v2/version.json') for k in chaves) and '/v2/js/app.js' in chaves and '/v2/vendor/pdfjs/pdf.min.mjs' in chaves, f'versão nova não ficou guardada: {chaves}')
    verificar(await p.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) == antes, 'os dados mudaram com a atualização')
    verificar(not await p.query_selector('#pwa-update-overlay'), 'o aviso voltou a aparecer depois de atualizar')
    await p.context.set_offline(True)
    try:
        await p.reload(); await p.wait_for_timeout(2000)
        titulos = await p.evaluate("[...document.querySelectorAll('.transaction-list h3')].map(e=>e.textContent)")
    finally:
        await p.context.set_offline(False)
    verificar(titulos == ['Mercado'], f'sem internet depois de atualizar: {titulos}')
