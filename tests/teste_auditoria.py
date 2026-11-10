"""Auditoria v2.65.1: uma só conta fica uma só conta (a Revolut não volta), o Jarvis compara períodos iguais,
a saudação não usa o nome da casa e um erro ao desenhar mostra «Algo correu mal» em vez do ecrã vazio."""
import hashlib
from correr import verificar

PERFIL = {'profileName': 'Casa', 'email': '', 'phone': '', 'members': ['Pessoa A', 'Pessoa B']}
M = lambda i, d, v, t='Mercado': {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'{int(d[8:])} x · Alimentação', 'movementType': 'expense'}


async def t_so_a_conta_principal(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir({'profile': PERFIL, 'accounts': [{'id': 'principal', 'name': 'Principal'}], 'transactions': []})
    p = app.page
    await p.reload(); await p.wait_for_timeout(800)
    await p.click('.ffplus'); await p.wait_for_timeout(500)
    texto = await p.inner_text('[role=dialog]')
    verificar('Revolut' not in texto, 'a Revolut voltou a aparecer com uma só conta')


async def t_jarvis_compara_o_mesmo_periodo(app):
    # nos testes, hoje é 28/09/2026: compara 1–28 de setembro com 1–28 de agosto (o dia 30 de agosto fica de fora)
    await app.abrir({'profile': PERFIL, 'transactions': [M(1, '2026-09-10', -100), M(2, '2026-08-10', -50), M(3, '2026-08-30', -150)]})
    r = await app.jarvis('quanto gastei este mês?')
    verificar('mais 100% do que de 1 a 28 de agosto' in r, f'resposta: {r}')
    cartao = await app.page.evaluate("[...document.querySelectorAll('.jarvis-overlay *')].map(e=>e.textContent).find(t=>/vs 1 a 28 de agosto/.test(t))")
    verificar(cartao, 'o cartão não mostra «vs 1 a 28 de agosto»')


async def t_saudacao_sem_o_nome_da_casa(app):
    await app.abrir({'profile': PERFIL, 'transactions': []})
    await app.abrir_jarvis()
    texto = await app.page.inner_text('.jarvis-overlay')
    verificar('Casa' not in texto, f'a saudação usa o nome da casa: {texto[:200]}')


async def t_erro_mostra_algo_correu_mal(app):
    p = app.page
    PIN = hashlib.sha256(b'financas-familiar:1234').hexdigest()
    # dados estragados (os membros não são uma lista) fazem rebentar o desenho da página
    await app.abrir({'transactions': [M(1, '2026-09-10', -100)], 'profile': {**PERFIL, 'members': 5}, 'pinHash': PIN})
    await p.reload(); await p.wait_for_timeout(1200)
    # o bloqueio vem primeiro (o erro não o contorna); depois do PIN aparece o aviso
    await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    for k in '1234': await p.keyboard.press(k)
    await p.wait_for_timeout(1200)
    verificar(await p.query_selector('.fferro'), f'não apareceu «Algo correu mal»: {app.erros[:2]} {(await p.inner_text("body"))[:200]}')
    verificar('Error' in (await p.text_content('.fferro details') or ''), 'sem o detalhe do erro')
    verificar(await p.query_selector('.fferro input[aria-label=PIN]'), 'com PIN, exportar tem de pedir o PIN')
    async with p.expect_download(timeout=3000) as d:
        await p.fill('.fferro input', '1234'); await p.click('.fferro-sec')
    verificar((await d.value).suggested_filename.endswith('.json'), 'o backup não foi descarregado')


async def t_movimento_estragado_nao_rebenta(app):
    await app.abrir({'transactions': [{**M(1, '2026-09-10', -100), 'detail': {'x': 1}, 'title': None}, M(2, '2026-09-11', -5, 'Pão')]})
    p = app.page
    verificar(not await p.query_selector('.fferro'), 'um movimento estragado ainda faz rebentar a app')
    verificar('Pão' in await p.inner_text('.page-current'), 'a lista não aparece')
