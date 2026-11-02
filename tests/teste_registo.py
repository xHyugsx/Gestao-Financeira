"""Etapa 4: folhas de registo (valor grande, escolhas em botões, painel da categoria, Guardar à vista) e Jarvis em folha inteira."""
import json
from correr import verificar, PREFIXO

M = lambda i, d, t, v, cat: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'1 x · {cat}', 'movementType': 'expense'}
DADOS = {'categories': ['Alimentação', 'Habitação', 'Luz', 'Lazer'], 'categoryGroups': {'Luz': 'Habitação'}, 'transactions': [
    M(1, '2026-09-20', 'Mercado', -30, 'Alimentação'), M(2, '2026-09-21', 'Mercado', -20, 'Alimentação'), M(3, '2026-09-10', 'EDP', -40, 'Luz'),
    M(4, '2026-08-10', 'EDP', -35, 'Luz')]}


async def t_folha_abre_sem_teclado_e_guardar_a_vista(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    for botao in ('Adicionar movimento',):
        await p.click(f'[aria-label="{botao}"]'); await p.wait_for_timeout(600)
        foco = await p.evaluate("document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)")
        verificar(not foco, 'ao abrir, nenhum campo de texto devia ficar com o cursor (o teclado só abre ao tocar)')
        caixa = await p.evaluate("(()=>{const r=document.querySelector('[role=dialog] .ffguardar').getBoundingClientRect(); return r.bottom<=innerHeight+1 && r.top>0})()")
        verificar(caixa, 'o Guardar devia estar à vista sem fazer scroll')
    verificar(await p.evaluate("getComputedStyle(document.querySelector('[role=dialog] .ffvalor input')).fontSize") >= '40px', 'valor em grande')


async def t_painel_da_categoria_e_data(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(500)
    await p.click('[role=dialog] .ffcat-escolha-abrir'); await p.wait_for_timeout(200)
    usadas = await p.evaluate("[...document.querySelectorAll('[role=dialog] .ffcat-painel > .ffescolhas [data-valor]')].map(b=>b.dataset.valor)")
    verificar(usadas[:2] == ['Alimentação', 'Luz'], f'mais usadas: {usadas}')
    verificar(not await p.is_visible('[role=dialog] .ffguardar'), 'com o painel aberto, o resto da folha fica escondido')
    await p.fill('[role=dialog] .ffcat-busca input', 'lu'); await p.wait_for_timeout(150)
    achadas = await p.evaluate("[...document.querySelectorAll('[role=dialog] .ffcat-painel [data-valor]')].map(b=>b.textContent)")
    verificar(achadas == ['Habitação › Luz'], f'pesquisa: {achadas}')
    await p.click('[role=dialog] .ffcat-painel [data-valor="Luz"]'); await p.wait_for_timeout(200)
    verificar('Habitação ›' in await p.inner_text('[role=dialog] .ffcat-escolha-abrir'), 'o cartão mostra «Grupo › Categoria»')
    await p.click('[role=dialog] .ffdata button:has-text("Ontem")')
    verificar(await p.input_value('[role=dialog] input[name=date]') == '2026-09-27', 'Ontem')
    await p.fill('[role=dialog] input[name=title]', 'EDP'); await p.fill('[role=dialog] input[name=amount]', '12,5')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(600)
    m = json.loads(await p.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO))['transactions'][0]
    verificar([m['date'], m['amount'], m['detail']] == ['2026-09-27', -12.5, '27 setembro · Luz'], f'gravado: {m}')


async def t_jarvis_em_folha_com_cartoes(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await app.abrir_jarvis()
    alto = await p.evaluate("document.querySelector('.jarvis-box').getBoundingClientRect().height / innerHeight")
    verificar(alto > .8, f'o Jarvis devia ocupar quase o ecrã todo: {alto}')
    cartoes = await p.evaluate("[...document.querySelectorAll('.ffjv-cartoes .ffjv-cartao-sug b')].map(b=>b.textContent)")
    verificar(cartoes[0] == 'Quanto gastei este mês?' and len(cartoes) == 4, f'sugestões em cartões: {cartoes}')
    await p.click('.ffjv-cartao-sug:has-text("Quanto gastei este mês?")'); await p.wait_for_timeout(800)
    valor = (await p.inner_text('.ffjv-cartao .ffjv-cartao-valor')).replace('\xa0', ' ')
    verificar(valor == '90,00 €', f'cartão da resposta: {valor}')
    verificar(await p.locator('.ffjv-cartao .ffjv-mini > span').count() == 6, 'os últimos 6 meses no mini-gráfico')
    verificar('gastaste 90,00' in (await app.jarvis('Quanto gastei este mês?')).replace('\xa0', ' '), 'o texto da resposta continua igual')
