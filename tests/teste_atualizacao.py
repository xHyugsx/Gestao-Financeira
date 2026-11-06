"""Atualização da app (v2.60.0: sozinha): a versão nova aplica-se ao ir para segundo plano, guarda os ficheiros novos, apaga os antigos e mantém os dados."""
import json
from correr import verificar, PREFIXO

DADOS = {'transactions': [{'id': 1, 'title': 'Mercado', 'amount': -12.3, 'date': '2026-09-20', 'detail': '20 setembro · Alimentação', 'movementType': 'expense'}]}
VELHO = './assets/fundo-cosmico-versao-antiga.webp'
CACHE = 'financas-app'


async def t_atualizar_limpa_a_cache_e_mantem_os_dados(app):
    await app.abrir(DADOS)
    p = app.page
    await p.reload(); await p.wait_for_timeout(2500)
    antes = await p.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO)
    await p.evaluate("([C,V])=>caches.open(C).then(c=>c.put(V,new Response('antigo')))", [CACHE, VELHO])
    await p.route('**/version.json', lambda r: r.fulfill(status=200, content_type='application/json', body='{"version":"9.99.9","files":[]}'))
    await p.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await p.wait_for_timeout(1500)
    verificar(not await p.query_selector('#pwa-update-overlay'), 'já não pergunta: atualiza sozinha')
    await p.unroute('**/version.json')
    # ao ir para segundo plano, a versão nova é aplicada (a página recarrega sem perguntar)
    async with p.expect_navigation(timeout=20000):
        await p.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))")
    await p.wait_for_timeout(2500)
    base = await p.evaluate("location.pathname.replace(/index\\.html$/, '')")
    chaves = await p.evaluate("C=>caches.open(C).then(c=>c.keys()).then(k=>k.map(r=>new URL(r.url).pathname))", CACHE)
    verificar(not any(k.endswith('fundo-cosmico-versao-antiga.webp') for k in chaves), f'ficheiro antigo ficou na cache: {chaves}')
    verificar(base + 'version.json' in chaves and base + 'js/app.js' in chaves and base + 'vendor/pdfjs/pdf.min.mjs' in chaves, f'versão nova não ficou guardada: {chaves}')
    # ir para segundo plano pode ligar «ocultar valores ao sair»: esse campo não conta como dados mudados
    sem_ocultos = lambda t: {k: v for k, v in json.loads(t).items() if k != 'hideValues'}
    verificar(sem_ocultos(await p.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO)) == sem_ocultos(antes), 'os dados mudaram com a atualização')
    await p.context.set_offline(True)
    try:
        await p.reload(); await p.wait_for_timeout(2000)
        titulos = await p.evaluate("[...document.querySelectorAll('.transaction-list h3')].map(e=>e.textContent)")
    finally:
        await p.context.set_offline(False)
    verificar(titulos == ['Mercado'], f'sem internet depois de atualizar: {titulos}')
    marca = PREFIXO + 'atualizada'
    verificar(await p.evaluate("k=>localStorage.getItem(k)", marca) is None, 'a marca da atualização devia sair ao recarregar')
    # numa atualização a sério a versão muda: ao abrir, avisa para que versão atualizou
    await p.evaluate("k=>localStorage.setItem(k,'2.0.0')", marca); await p.reload(); await p.wait_for_timeout(2500)
    aviso = await p.text_content('#ff-atualizada', timeout=5000) or ''
    verificar('atualizada para a versão' in aviso, f'devia avisar que atualizou: {aviso!r}')
