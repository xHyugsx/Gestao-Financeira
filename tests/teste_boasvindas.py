"""Boas-vindas (v2.58.0): tutorial na 1.ª abertura, dicas por cima da app e páginas escondidas sem carro ou sem animais."""
import json
from correr import verificar, PREFIXO


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}')


async def acrescentar(p, rotulo, texto):
    await p.fill(f'.ffbv input[aria-label="{rotulo}"]', texto); await p.click(f'.ffbv button.ffbv-mais[aria-label="{rotulo}"]'); await p.wait_for_timeout(100)


async def seguinte(p):
    await p.click('.ffbv button[type=submit]'); await p.wait_for_timeout(450)


async def t_tutorial_completo(app):
    await app.abrir({}, tutorial=True)
    p = app.page
    verificar(await p.query_selector('.ffbv'), 'uma instalação nova devia mostrar as boas-vindas')
    verificar('Jarvis' in (await p.text_content('.ffbv h1') or ''), 'ecrã de boas-vindas')
    await seguinte(p)
    await p.fill('#ffbv-casa', 'Casa Teste')
    await acrescentar(p, 'Acrescentar pessoa', 'Ana'); await acrescentar(p, 'Acrescentar pessoa', 'Rui'); await acrescentar(p, 'Acrescentar pessoa', 'ana')
    verificar(await p.locator('.ffbv-chip').count() == 2, 'nomes repetidos não entram')
    await seguinte(p)
    await p.click('.ffbv button:has-text("No início do mês")')
    await acrescentar(p, 'Acrescentar conta', 'Cartão refeição')
    await seguinte(p)
    await p.click('.ffbv button:has-text("Tenho carro ou mota")'); await acrescentar(p, 'Acrescentar viatura', 'Clio')
    await p.click('.ffbv button:has-text("Tenho animais")'); await acrescentar(p, 'Acrescentar animal', 'Pipoca')
    await seguinte(p)
    await p.click('.ffbv button:has-text("Pedir um PIN")')
    await p.fill('.ffbv input[aria-label="PIN"]', '1234'); await p.fill('.ffbv input[aria-label="Confirmar PIN"]', '4321'); await seguinte(p)
    verificar('não coincidem' in (await p.text_content('.ffbv-erro') or ''), 'PIN diferente devia avisar')
    await p.fill('.ffbv input[aria-label="Confirmar PIN"]', '1234'); await seguinte(p); await p.wait_for_timeout(600)
    d = await dados(app)
    perfil = d['profile']
    verificar(perfil['profileName'] == 'Casa Teste' and perfil['members'] == ['Ana', 'Rui'] and perfil['salaryMonth'] == 'proprio', f'perfil: {perfil}')
    verificar(perfil['vehicles'] == [{'name': 'Clio', 'type': 'carro'}] and perfil['pets'] == [{'name': 'Pipoca', 'sex': 'f'}], f'carro e animal: {perfil}')
    verificar([c['name'] for c in d['accounts']] == ['Principal', 'Cartão refeição'], f'contas (sem a Revolut): {d["accounts"]}')
    verificar(d.get('pinHash'), 'devia gravar o PIN')
    # dicas: «+», robô, «Mais»
    verificar(not await p.query_selector('.ffbv') and await p.query_selector('.ffdicas'), 'depois do tutorial vêm as dicas')
    for _ in range(2): await p.click('.ffdicas-seguinte'); await p.wait_for_timeout(350)
    verificar('Mais' in (await p.text_content('.ffdicas-bolha strong') or ''), 'a 3.ª dica é o «Mais»')
    await p.click('.ffdicas-seguinte'); await p.wait_for_timeout(300)
    verificar(not await p.query_selector('.ffdicas'), 'a última dica fecha')
    await p.reload(); await p.wait_for_timeout(1800)
    verificar(await p.query_selector('#ff-lock') and not await p.query_selector('.ffbv'), 'ao reabrir pede o PIN e não repete o tutorial')


async def t_saltar_e_quem_ja_usa_a_app(app):
    await app.abrir({}, tutorial=True)
    p = app.page
    await p.click('.ffbv-saltar'); await p.wait_for_timeout(500)
    verificar(not await p.query_selector('.ffbv'), 'saltar fecha o tutorial')
    await p.click('.ffdicas-pe button:text-is("Saltar")'); await p.wait_for_timeout(300)
    verificar(not await p.query_selector('.ffdicas'), 'saltar fecha as dicas')
    await p.reload(); await p.wait_for_timeout(1800)
    verificar(not await p.query_selector('.ffbv'), 'não volta a aparecer')
    # quem já tem movimentos nunca vê as boas-vindas
    await app.abrir({'transactions': [{'id': 1, 'title': 'Café', 'amount': -2, 'date': '2026-09-20', 'detail': '20 setembro · Alimentação', 'movementType': 'expense'}]}, tutorial=True)
    verificar(not await p.query_selector('.ffbv'), 'com dados, sem tutorial')


async def t_ja_tenho_um_backup(app):
    await app.abrir({}, tutorial=True)
    p = app.page
    await p.click('.ffbv button:has-text("Já tenho um backup")'); await p.wait_for_timeout(800)
    verificar(not await p.query_selector('.ffbv') and await p.query_selector('input[aria-label="Ficheiro de cópia de segurança"]'), 'devia abrir Definições › Backup')


async def t_paginas_escondidas_e_dicas_outra_vez(app):
    await app.abrir({})
    p = app.page
    await p.click('.nav-item:has-text("Mais")'); await p.wait_for_timeout(500)
    paginas = await p.evaluate("[...document.querySelectorAll('.ffmore-it')].map(e=>e.textContent.trim())")
    verificar(paginas == ['Categorias', 'Resumo'], f'sem carro nem animais: {paginas}')
    await app.abrir({'profile': {'profileName': '', 'email': '', 'phone': '', 'members': [], 'vehicles': [{'name': 'Clio', 'type': 'carro'}], 'pets': [{'name': 'Pipoca', 'sex': 'f'}]}})
    await p.click('.nav-item:has-text("Mais")'); await p.wait_for_timeout(500)
    paginas = await p.evaluate("[...document.querySelectorAll('.ffmore-it')].map(e=>e.textContent.trim())")
    verificar(paginas == ['Categorias', 'Resumo', 'Combustível', 'Veterinário'], f'com carro e animal: {paginas}')
    await p.reload(); await p.wait_for_timeout(1800)
    await p.click('button[aria-label="Jarvis e definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-more'); await p.wait_for_timeout(500)
    await p.click('.ffdef-dicas'); await p.wait_for_timeout(1200)
    verificar(await p.query_selector('.ffdicas') and not await p.query_selector('.settings-sheet'), 'devia mostrar as dicas por cima da Principal')
