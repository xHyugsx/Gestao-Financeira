"""Atalhos do ícone da app (Nova despesa, Jarvis) e sugestões no «Novo movimento» a partir do histórico."""
import hashlib, json
from correr import verificar

PIN = hashlib.sha256(b'financas-familiar:1234').hexdigest()
MOV = lambda i, t, d, cat: {'id': i, 'title': t, 'amount': -10, 'date': d, 'detail': f'{int(d[8:])} setembro · {cat}', 'movementType': 'expense'}
DADOS = {'categories': ['Alimentação', 'Combustível', 'Lazer', 'Casa'], 'transactions': [
    MOV(1, 'Continente', '2026-09-02', 'Casa'), MOV(2, 'Continente', '2026-09-12', 'Alimentação'), MOV(3, 'Galp', '2026-09-05', 'Combustível')]}
TITULO_DIALOGO = "document.querySelector('[role=dialog] h2')?.textContent || ''"


async def abrir_atalho(app, acao, dados=DADOS):
    await app.abrir(dados)
    p = app.page
    await p.goto(app.url + f'index.html?acao={acao}'); await p.wait_for_timeout(1500)


async def t_atalho_nova_despesa(app):
    await abrir_atalho(app, 'despesa')
    p = app.page
    verificar(await p.evaluate(TITULO_DIALOGO) == 'Novo movimento', 'não abriu o «Novo movimento»')
    tipo = await p.evaluate("[...document.querySelectorAll('[role=dialog] .segmented button')].find(b=>b.getAttribute('aria-pressed')==='true'||b.className.includes('active'))?.textContent")
    verificar(tipo == 'Despesa', f'tipo: {tipo}')
    verificar('acao=' not in p.url, f'o endereço ficou com a ação: {p.url}')


async def t_atalho_jarvis(app):
    await abrir_atalho(app, 'jarvis')
    verificar(await app.page.query_selector('.jarvis-overlay'), 'não abriu o Jarvis')


async def t_atalho_espera_pelo_pin(app):
    await abrir_atalho(app, 'despesa', {**DADOS, 'pinHash': PIN})
    p = app.page
    verificar(await p.query_selector('#ff-lock') and not await p.evaluate(TITULO_DIALOGO), 'abriu antes do PIN')
    await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    for k in '1234': await p.keyboard.press(k)
    await p.wait_for_timeout(1500)
    verificar(await p.evaluate(TITULO_DIALOGO) == 'Novo movimento', 'não abriu depois do PIN')


async def t_manifesto_tem_os_atalhos(app):
    await app.abrir({})
    p = app.page
    m = await p.evaluate("fetch('manifest.webmanifest').then(r=>r.json())")
    verificar([s['url'] for s in m['shortcuts']] == ['./index.html?acao=despesa', './index.html?acao=jarvis'], f'atalhos: {m.get("shortcuts")}')
    verificar(m['start_url'] == './index.html' and m['scope'] == './', 'o manifesto mudou o start_url ou o scope')
    for s in m['shortcuts']:
        estado = await p.evaluate("u=>fetch(u).then(r=>r.ok && r.headers.get('content-type'))", s['icons'][0]['src'])
        verificar(estado and 'image/png' in estado, f'ícone em falta: {s["icons"][0]["src"]}')


async def novo(app):
    await app.page.click('[aria-label="Adicionar movimento"]'); await app.page.wait_for_timeout(500)


async def t_sugere_a_categoria_pelo_historico(app):
    await app.abrir(DADOS)
    p = app.page
    await novo(app)
    opcoes = await p.evaluate("[...document.querySelectorAll('#ffv2-titulos option')].map(o=>o.value)")
    verificar(opcoes == ['Continente', 'Galp'], f'títulos sugeridos: {opcoes}')
    await p.fill('[role=dialog] input[name=title]', 'continente'); await p.wait_for_timeout(200)
    verificar(await p.input_value('[role=dialog] select[name=category]') == 'Alimentação', 'não escolheu a categoria da última vez')
    verificar('Alimentação' in await p.inner_text('.ffv2-sugestao'), 'falta a indicação da sugestão')
    await p.fill('[role=dialog] input[name=title]', 'Galp'); await p.wait_for_timeout(200)
    verificar(await p.input_value('[role=dialog] select[name=category]') == 'Combustível', 'não atualizou a sugestão')
    await p.fill('[role=dialog] input[name=amount]', '40'); await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(500)
    guardado = json.loads(await p.evaluate("localStorage.getItem('financas-familiar:v3')"))['transactions'][0]
    verificar(guardado['title'] == 'Galp' and guardado['detail'].endswith('· Combustível'), f'gravado: {guardado}')


async def t_escolha_manual_nao_e_alterada(app):
    await app.abrir(DADOS)
    p = app.page
    await novo(app)
    await p.select_option('[role=dialog] select[name=category]', 'Lazer')
    await p.fill('[role=dialog] input[name=title]', 'Galp'); await p.wait_for_timeout(200)
    verificar(await p.input_value('[role=dialog] select[name=category]') == 'Lazer', 'mudou a categoria escolhida à mão')
    verificar(not await p.query_selector('.ffv2-sugestao'), 'mostrou sugestão depois da escolha manual')
