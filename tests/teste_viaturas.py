"""Combustível por viatura: viaturas no perfil, viatura/combustível/quem fez no registo e carros somados à parte da mota."""
import json
from correr import verificar, PREFIXO

A = lambda i, d, v, **x: {'id': i, 'title': 'Combustível', 'amount': v, 'date': d, 'detail': '1 x · Combustível', 'movementType': 'expense', 'kind': 'car', **x}
PERFIL = {'profileName': '', 'email': '', 'phone': '', 'members': ['Pessoa A', 'Pessoa B'],
          'vehicles': [{'name': 'Carro A', 'type': 'carro'}, {'name': 'Carro B', 'type': 'carro'}, {'name': 'Mota X', 'type': 'mota'}]}  # nomes fictícios
DADOS = {'profile': PERFIL, 'categories': ['Combustível', 'Transportes', 'Alimentação'], 'transactions': [
    A(1, '2026-09-02', -60, vehicle='Carro A', fuel='gasoleo'), A(2, '2026-09-10', -45, vehicle='Carro B', fuel='gasolina'),
    A(3, '2026-09-12', -12, vehicle='Mota X', fuel='gasolina'), A(4, '2026-09-15', -30), A(5, '2026-08-20', -50, vehicle='Carro A', fuel='gasoleo')]}


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}')


async def t_carros_somados_a_parte_da_mota(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('combustivel')"); await p.wait_for_timeout(800)
    txt = lambda s: p.evaluate(f"[...document.querySelectorAll('.page-current {s}')].map(e=>e.innerText.replace(/\\s+/g,' ').trim())")
    verificar((await txt('.fffuel-total-carros')) == ['105,00 €'], f'carros em setembro (60 + 45), sem a mota: {await txt(".fffuel-total-carros")}')
    verificar((await txt('.fffuel-linhas p')) == ['Carro A 60,00 €', 'Carro B 45,00 €'], await txt('.fffuel-linhas p'))
    verificar('Em 2026 155,00 €' in (await txt('.fffuel-carros .ffmedias'))[0], f'carros no ano: {await txt(".fffuel-carros .ffmedias")}')
    mota = (await txt('.fffuel-mota'))[0]
    verificar(mota.startswith('MOTA X 12,00 €'), f'mota à parte: {mota}')
    sem = (await txt('.fffuel-sem'))[0]
    verificar(sem.startswith('SEM VIATURA 30,00 €'), f'abastecimento antigo sem viatura: {sem}')
    verificar('Carro A · Gasóleo' in await p.inner_text('.page-current .fuel-view .transaction-list'), 'etiqueta da viatura e do combustível na lista')


async def t_registar_abastecimento_com_viatura(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir({**DADOS, 'transactions': DADOS['transactions'] + [{'id': 9, 'title': 'Pão', 'amount': -2, 'date': '2026-09-20', 'detail': 'x · Alimentação', 'movementType': 'expense', 'person': 'Pessoa B'}]})
    p = app.page
    await p.evaluate("window.ffGoPg('combustivel')"); await p.wait_for_timeout(800)
    await p.click('[aria-label="Adicionar abastecimento"]'); await p.wait_for_timeout(500)
    escolhas = [await p.input_value(f'[role=dialog] select[name={n}]') for n in ('vehicle', 'fuel', 'person')]
    verificar(escolhas == ['Mota X', 'gasolina', 'Pessoa B'], f'pré-escolhe a última viatura, o seu combustível e a última pessoa: {escolhas}')
    await p.select_option('[role=dialog] select[name=vehicle]', 'Carro A')
    verificar(await p.input_value('[role=dialog] select[name=fuel]') == 'gasoleo', 'ao trocar de viatura, o combustível dessa viatura')
    await p.select_option('[role=dialog] select[name=person]', 'Pessoa A')
    await p.fill('[role=dialog] input[name=amount]', '50')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(500)
    m = (await dados(app))['transactions'][0]
    verificar([m.get('vehicle'), m.get('fuel'), m.get('person'), m['amount']] == ['Carro A', 'gasoleo', 'Pessoa A', -50], f'abastecimento: {m}')
    verificar((await p.inner_text('.page-current .fffuel-total-carros')).replace('\xa0', ' ') == '155,00 €', 'soma aos carros')


async def t_viatura_no_mais_e_na_edicao(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(500)
    await p.select_option('.movement-dialog select[name=category]', 'Transportes'); await p.wait_for_timeout(200)
    verificar(not await p.query_selector('.movement-dialog select[name=vehicle]'), 'sem viatura fora do combustível')
    await p.select_option('.movement-dialog select[name=category]', 'Combustível'); await p.wait_for_timeout(200)
    await p.fill('.movement-dialog input[name=title]', 'Galp'); await p.fill('.movement-dialog input[name=amount]', '20')
    await p.select_option('.movement-dialog select[name=vehicle]', 'Carro B'); await p.wait_for_timeout(100)
    verificar(await p.input_value('.movement-dialog select[name=fuel]') == 'gasolina', 'combustível do Carro B')
    await p.click('.movement-dialog button[type=submit]'); await p.wait_for_timeout(700)
    m = (await dados(app))['transactions'][0]
    verificar([m.get('vehicle'), m.get('fuel')] == ['Carro B', 'gasolina'], f'pelo «+»: {m}')
    # editar um abastecimento antigo para lhe escolher a viatura
    await p.evaluate("window.ffGoPg('combustivel')"); await p.wait_for_timeout(800)
    await p.click('.page-current .fuel-view .transaction-list [data-id="4"]')
    await p.wait_for_timeout(500)
    verificar(await p.input_value('[role=dialog] select[name=vehicle]') == '', 'o antigo começa sem viatura')
    await p.select_option('[role=dialog] select[name=vehicle]', 'Mota X'); await p.wait_for_timeout(100)
    verificar(await p.input_value('[role=dialog] select[name=fuel]') == 'gasolina', 'combustível da mota')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(600)
    d = {x['id']: x for x in (await dados(app))['transactions']}
    verificar([d[4].get('vehicle'), d[4].get('fuel')] == ['Mota X', 'gasolina'], f'editado: {d[4]}')
    verificar(not await p.query_selector('.page-current .fffuel-sem'), 'sem abastecimentos sem viatura, o bloco desaparece')


async def t_viaturas_no_perfil(app):
    await app.abrir({**DADOS, 'profile': {**PERFIL, 'vehicles': [{'name': 'Carro A', 'type': 'carro'}]}})
    p = app.page
    await p.click('button[aria-label="Jarvis e definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-item:has-text("Perfil e família")'); await p.wait_for_timeout(500)
    await p.fill('[aria-label="Nome da viatura 1"]', 'Carro Novo')
    await p.click('.ffv2-viaturas button:has-text("Nova viatura")')
    await p.fill('[aria-label="Nome da viatura 2"]', 'Mota Y'); await p.select_option('[aria-label="Tipo da viatura 2"]', 'mota')
    await p.click('.ffv2-viaturas button:has-text("Guardar viaturas")'); await p.wait_for_timeout(500)
    d = await dados(app)
    verificar(d['profile']['vehicles'] == [{'name': 'Carro Novo', 'type': 'carro'}, {'name': 'Mota Y', 'type': 'mota'}], f'perfil: {d["profile"]}')
    verificar(sorted(x['id'] for x in d['transactions'] if x.get('vehicle') == 'Carro Novo') == [1, 5], 'mudar o nome atualiza os abastecimentos')
    verificar(not app.erros, f'erros: {app.erros}')
