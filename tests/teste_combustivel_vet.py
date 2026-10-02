"""Combustível e Veterinário: registar pelo botão "+", fotografias e lembretes."""
import asyncio, base64, json
from correr import verificar, PREFIXO, chave

ANIMAIS = {'profile': {'profileName': '', 'email': '', 'phone': '', 'members': [], 'pets': [{'name': 'Rex', 'sex': 'm'}, {'name': 'Nina', 'sex': 'f'}]}}  # nomes fictícios

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}')


async def ir(app, pagina):
    await app.page.evaluate(f"window.ffGoPg('{pagina}')"); await app.page.wait_for_timeout(800)


async def t_registar_abastecimento(app):
    await app.abrir(ANIMAIS)
    p = app.page
    await ir(app, 'combustivel')
    await p.click('[aria-label="Adicionar abastecimento"]'); await p.wait_for_timeout(500)
    await p.fill('[role=dialog] input[name=amount]', '45,30')
    await p.fill('[role=dialog] input[name=station]', 'Posto Fictício')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(500)
    m = (await dados(app))['transactions'][0]
    verificar(m['title'] == 'Combustível — Posto Fictício' and m['amount'] == -45.3 and m['kind'] == 'car' and m['detail'].endswith('· Combustível'), f'abastecimento: {m}')
    verificar(await p.inner_text('.page-current .fuel-view .transaction-list h3') == 'Combustível — Posto Fictício', 'não aparece na lista do mês')


async def t_registar_despesa_veterinaria(app):
    await app.abrir(ANIMAIS)
    p = app.page
    await ir(app, 'veterinario')
    await p.click('[aria-label="Adicionar despesa veterinária"]'); await p.wait_for_timeout(500)
    await p.select_option('[role=dialog] select[name=pet]', 'Nina')
    await p.select_option('[role=dialog] select[name=vetCategory]', 'Vacinas')
    await p.fill('[role=dialog] input[name=amount]', '30')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(500)
    m = (await dados(app))['transactions'][0]
    verificar(m['pet'] == 'Nina' and m['vetCategory'] == 'Vacinas' and m['amount'] == -30 and m['title'] == 'Despesa veterinária', f'despesa: {m}')
    verificar(await p.query_selector('.page-current .vet-month-list [aria-label="Editar Despesa veterinária"]'), 'não aparece na lista do mês')


async def t_fotografia_do_animal(app):
    await app.abrir(ANIMAIS)
    p = app.page
    await ir(app, 'veterinario')
    await p.click('[aria-label="Adicionar fotografia de Rex"]'); await p.wait_for_timeout(500)
    await p.set_input_files('[role=dialog] input[type=file]', files=[{'name': 'sam.png', 'mimeType': 'image/png', 'buffer': PNG}])
    await p.wait_for_timeout(600)
    foto = (await dados(app)).get('petPhotos', {}).get('Rex', '')
    verificar(foto.startswith('data:image/png;base64,'), 'a fotografia não foi guardada')
    await p.click('[role=dialog] .remove-photo'); await p.wait_for_timeout(400)
    verificar('Rex' not in (await dados(app)).get('petPhotos', {}), 'a fotografia não foi removida')


async def t_criar_e_eliminar_lembrete(app):
    await app.abrir(ANIMAIS, {'financas-familiar:vet-snooze': '9999999999999'})
    p = app.page
    await ir(app, 'veterinario')
    await p.click('.ffvr-add'); await p.wait_for_timeout(400)
    await p.click('.ffvr-dlg [data-pet="Nina"]')
    await p.select_option('.ffvr-dlg select[name=type]', 'interna')
    await p.fill('.ffvr-dlg input[name=last]', '2026-07-01')
    await p.click('.ffvr-save'); await p.wait_for_timeout(500)
    lista = json.loads(await p.evaluate("k=>localStorage.getItem(k)", chave('financas-familiar:vet-reminders')) or '[]')
    verificar(len(lista) == 1 and lista[0]['pet'] == 'Nina' and lista[0]['type'] == 'interna' and lista[0]['every'] == 3 and lista[0]['last'] == '2026-07-01', f'lembrete: {lista}')
    verificar(await p.inner_text('.ffvr-row h3') == 'Nina · Desparasitação interna', 'não aparece na lista')
    p.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await p.click('.ffvr-row'); await p.wait_for_timeout(400)
    await p.click('.ffvr-del'); await p.wait_for_timeout(500)
    verificar(json.loads(await p.evaluate("k=>localStorage.getItem(k)", chave('financas-familiar:vet-reminders')) or '[]') == [], 'o lembrete não foi eliminado')


async def t_aviso_de_lembrete_mais_tarde(app):
    await app.abrir(ANIMAIS, {'financas-familiar:vet-reminders': [{'id': 1, 'pet': 'Rex', 'type': 'vacina', 'last': '2025-09-20', 'every': 12}]})
    p = app.page
    await p.wait_for_timeout(3500)
    verificar(await p.query_selector('#ff-vetbn'), 'o aviso do lembrete não apareceu')
    await p.click('#ff-vetbn .no'); await p.wait_for_timeout(600)
    # o ponto no «Mais» (lembrete nos próximos 7 dias) aparece depois de um toque, como na app atual
    verificar(await p.query_selector('.ffnav-more .ffvet-dot'), 'sem ponto no «Mais»')
    adiado = await p.evaluate("k=>+localStorage.getItem(k)", chave('financas-familiar:vet-snooze'))
    verificar(adiado > await p.evaluate("Date.now()"), '«Mais tarde» não adiou o aviso')
