"""Categorias com grupos: sugestões, página com grupos e subcategorias, escolha no «+» e Análise por grupo."""
import json
from correr import verificar, PREFIXO

M = lambda i, d, t, v, cat: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'1 x · {cat}', 'movementType': 'expense'}
CATS = ['Habitação', 'Luz', 'Renda', 'Alimentação', 'Supermercado', 'Transportes', 'Combustível']
DADOS = {'categories': CATS, 'transactions': [
    M(1, '2026-09-01', 'Renda', -600, 'Renda'), M(2, '2026-09-05', 'EDP', -40, 'Luz'), M(3, '2026-09-06', 'Mercado', -100, 'Supermercado'),
    M(4, '2026-09-07', 'Galp', -50, 'Combustível'), M(5, '2026-08-07', 'EDP', -30, 'Luz')]}
AGRUPADO = {**DADOS, 'categoryGroups': {'Luz': 'Habitação', 'Renda': 'Habitação', 'Combustível': 'Transportes'}}


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}')


async def t_sugerir_e_aplicar_grupos(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('categorias')"); await p.wait_for_timeout(800)
    linhas = await p.evaluate("[...document.querySelectorAll('.page-current .ffsugest li')].map(l=>l.innerText.replace(/\\s+/g,' ').trim())")
    verificar(linhas == ['Renda, Luz → Habitação', 'Supermercado → Alimentação', 'Combustível → Transportes'], f'sugestões (pela ordem do valor gasto): {linhas}')
    await p.click('.page-current .ffsugest li:has-text("Supermercado") input')
    await p.click('.page-current .ffsugest button:text-is("Aplicar")'); await p.wait_for_timeout(500)
    d = await dados(app)
    verificar(d.get('categoryGroups') == {'Combustível': 'Transportes', 'Luz': 'Habitação', 'Renda': 'Habitação'}, f'grupos: {d.get("categoryGroups")}')
    verificar(d.get('categoryGroupsSeen') == ['Supermercado'], f'a desmarcada não volta a ser sugerida: {d.get("categoryGroupsSeen")}')
    verificar(not await p.query_selector('.page-current .ffsugest'), 'o cartão das sugestões devia desaparecer')
    verificar(set(d['categories']) == set(CATS) and len(d['transactions']) == 5, 'categorias e movimentos ficam como estavam')


async def t_pagina_com_grupos_e_subcategorias(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(AGRUPADO)
    p = app.page
    await p.evaluate("window.ffGoPg('categorias')"); await p.wait_for_timeout(800)
    txt = lambda s: p.evaluate(f"[...document.querySelectorAll('.page-current {s}')].map(e=>e.innerText.replace(/\\s+/g,' ').trim())")
    cab = await txt('.ffcat-grupo .ffcat-linha')
    verificar(cab[0] == 'Habitação 2 categorias · ↑ 2033,3% 640,00 € 81%' and cab[2].startswith('Transportes 1 categoria 50,00 €'), f'grupo com o total das categorias: {cab}')
    verificar(len(cab) == 4, f'Habitação, Supermercado, Transportes, Alimentação: {cab}')
    await p.click('.page-current [aria-label="Abrir Habitação"]'); await p.wait_for_timeout(300)
    subs = await txt('.ffcat-aberto .ffcat-sub')
    verificar(subs == ['Renda 93,8% 600,00 €', 'Luz 6,3% 40,00 €', 'Habitação sem gastos 0,00 €', 'Nova categoria em Habitação'], f'subcategorias: {subs}')
    await p.click('.page-current .ffcat-sub-nova'); await p.wait_for_timeout(400)
    verificar(await p.get_attribute('[role=dialog] .ffcat-pilulas button[aria-checked=true]', 'class') == 'on', 'grupo pré-escolhido')
    verificar((await p.inner_text('[role=dialog] .ffcat-pilulas button[aria-checked=true]')).strip() == 'Habitação', 'o grupo devia vir escolhido')
    await p.fill('[role=dialog] input[aria-label="Nome da categoria"]', 'Água')
    await p.click('[role=dialog] button:text-is("Criar")'); await p.wait_for_timeout(500)
    d = await dados(app)
    verificar('Água' in d['categories'] and d['categoryGroups'].get('Água') == 'Habitação', f'nova categoria no grupo: {d["categoryGroups"]}')
    # tirar a Luz do grupo
    await p.click('.page-current [aria-label="Editar categoria Luz"]'); await p.wait_for_timeout(400)
    await p.click('[role=dialog] .ffcat-pilulas button:text-is("Nenhum")')
    await p.click('[role=dialog] button:text-is("Guardar")'); await p.wait_for_timeout(500)
    verificar('Luz' not in (await dados(app))['categoryGroups'], 'a Luz devia sair do grupo')
    # um grupo com categorias não pode entrar noutro grupo
    await p.click('.page-current [aria-label="Editar categoria Habitação"]'); await p.wait_for_timeout(400)
    verificar(not await p.query_selector('[role=dialog] .ffcat-pilulas') and 'É o grupo de' in await p.inner_text('[role=dialog] .ffcat-campo'), 'um grupo não pertence a outro grupo')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_mudar_nome_do_grupo(app):
    await app.abrir(AGRUPADO)
    p = app.page
    await p.evaluate("window.ffGoPg('categorias')"); await p.wait_for_timeout(800)
    await p.click('.page-current [aria-label="Editar categoria Habitação"]'); await p.wait_for_timeout(400)
    await p.fill('[role=dialog] input[aria-label="Nome da categoria"]', 'Casa')
    await p.click('[role=dialog] button:text-is("Guardar")'); await p.wait_for_timeout(500)
    verificar((await dados(app))['categoryGroups'] == {'Luz': 'Casa', 'Renda': 'Casa', 'Combustível': 'Transportes'}, 'o grupo muda de nome nas suas categorias')


async def t_escolha_por_grupos_no_mais(app):
    await app.abrir(AGRUPADO)
    p = app.page
    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(500)
    await p.click('.movement-dialog .ffcat-escolha-abrir'); await p.wait_for_timeout(200)
    grupos = await p.evaluate("""[...document.querySelectorAll('.movement-dialog .ffcat-painel-grupo')].map(g=>g.querySelector('.ffrotulo').textContent
      + ': ' + [...g.querySelectorAll('[data-valor]')].map(o=>o.textContent).join(' | '))""")
    verificar(grupos == ['Sem grupo: Alimentação | Supermercado', 'Habitação: Habitação (geral) | Luz | Renda', 'Transportes: Transportes (geral) | Combustível'], f'escolha: {grupos}')
    await app.escolher('category', 'Luz', '.movement-dialog')
    await p.fill('.movement-dialog input[name=title]', 'EDP'); await p.fill('.movement-dialog input[name=amount]', '10')
    await p.click('.movement-dialog button[type=submit]'); await p.wait_for_timeout(600)
    verificar((await dados(app))['transactions'][0]['detail'].endswith('· Luz'), 'o movimento guarda a categoria (não o grupo)')


async def t_analise_por_grupo(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(AGRUPADO)
    p = app.page
    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(1000)
    nomes = lambda: p.evaluate("[...document.querySelectorAll('.page-current .ffdonut-legenda > div > span:nth-child(2)')].map(e=>e.textContent)")
    verificar(await nomes() == ['Habitação', 'Supermercado', 'Transportes'], f'por grupo: {await nomes()}')
    verificar(await p.locator('.page-current .ffdonut path').count() == 3, 'uma fatia por grupo')
    await p.click('.page-current .ffdonut-legenda > div:has-text("Habitação")'); await p.wait_for_timeout(300)
    subs = await p.evaluate("[...document.querySelectorAll('.page-current .ffsubcat')].map(e=>e.innerText.replace(/\\s+/g,' ').trim())")
    verificar(subs == ['Renda 93,8% 600,00 €', 'Luz 6,3% 40,00 €'], f'tocar no grupo abre as categorias: {subs}')
    await p.click('.page-current .ffseg-vista button:text-is("Por categoria")'); await p.wait_for_timeout(300)
    verificar(await nomes() == ['Renda', 'Supermercado', 'Combustível', 'Luz'], f'por categoria: {await nomes()}')
    verificar(not app.erros, f'erros: {app.erros}')
