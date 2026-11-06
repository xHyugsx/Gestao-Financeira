"""Pormenores do teste como utilizador novo (v2.62.0): valor alto, exemplo nas receitas, categoria do 1.º abastecimento,
recorrentes «A seguir» e do ordenado, e o bloqueio da versão web com o logótipo."""
import hashlib, json
from correr import verificar, PREFIXO

PIN = hashlib.sha256(b'financas-familiar:1234').hexdigest()


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}')


async def t_valor_alto_pede_confirmacao(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir({'transactions': []})
    p = app.page
    await p.click('.ffplus'); await p.wait_for_timeout(500)
    await p.fill('[role=dialog] input[name=title]', 'Teste'); await p.fill('[role=dialog] input[name=amount]', '99999999')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(400)
    verificar(await p.query_selector('[role=dialog] .ffvalor-alto'), 'não avisou do valor alto')
    verificar(not (await dados(app)).get('transactions'), 'gravou sem confirmar')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(700)
    verificar(len((await dados(app))['transactions']) == 1, 'o 2.º Guardar não gravou')
    await p.click('.ffplus'); await p.wait_for_timeout(500)
    await p.click('[role=dialog] .segmented button:text-is("Receita")'); await p.wait_for_timeout(200)
    verificar(await p.get_attribute('[role=dialog] input[name=title]', 'placeholder') == 'Ex.: Ordenado', 'exemplo das receitas')


async def t_primeiro_abastecimento_cria_a_categoria(app):
    await app.page.emulate_media(reduced_motion='reduce')
    perfil = {'profileName': '', 'email': '', 'phone': '', 'members': [], 'vehicles': [{'name': 'Carro A', 'type': 'carro'}]}
    await app.abrir({'profile': perfil, 'categories': ['Alimentação', 'Transportes'], 'transactions': []})
    p = app.page
    await p.evaluate("window.ffGoPg('combustivel')"); await p.wait_for_timeout(800)
    await p.click('[aria-label="Adicionar abastecimento"]'); await p.wait_for_timeout(500)
    await p.fill('[role=dialog] input[name=amount]', '40')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(700)
    cats = (await dados(app))['categories']
    verificar('Combustível' in cats, f'a categoria do abastecimento não entrou na lista: {cats}')


async def t_recorrente_a_seguir_e_ordenado(app):
    await app.page.emulate_media(reduced_motion='reduce')
    ant, dia = '2026-08', '29'  # nos testes, hoje é 28/09/2026: o dia 29 ainda não chegou
    mov = [{'id': 1, 'title': 'Streaming', 'amount': -10, 'date': f'{ant}-{dia}', 'detail': 'x · Lazer', 'movementType': 'expense', 'recurring': 'com', 'recurringEvery': 1},
           {'id': 2, 'title': 'Ordenado', 'amount': 1500, 'date': f'{ant}-{dia}', 'detail': 'x · Salário', 'movementType': 'income', 'recurring': 'com', 'recurringEvery': 1}]
    await app.abrir({'transactions': mov})
    p = app.page
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(700)
    await p.click('.page-current .ffchips button:text-is("Recorrentes")'); await p.wait_for_timeout(600)
    grupos = await p.evaluate("[...document.querySelectorAll('.page-current .ffrec-grupo .ffgrupo span:first-child')].map(e=>e.textContent)")
    verificar('A seguir' in grupos and 'Por pagar' not in grupos, f'o dia ainda não chegou: {grupos}')
    verificar('Receitas recorrentes' in grupos, f'o ordenado recorrente não aparece: {grupos}')


async def t_bloqueio_web_com_logotipo(app):
    await app.abrir({'pinHash': PIN})
    p = app.page
    verificar(await p.query_selector('#ff-lock .ffl-logo'), 'o bloqueio da versão web não mostra o logótipo')
    verificar(not await p.query_selector('#ff-lock .ffl-img'), 'a fotografia antiga ainda aparece')
