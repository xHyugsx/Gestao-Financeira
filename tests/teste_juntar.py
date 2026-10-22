"""Juntar os movimentos de outro telemóvel a partir do backup dele: só entram os novos, os saldos não mudam e pode desfazer-se."""
import datetime, json, pathlib, tempfile
from correr import verificar, PREFIXO
from teste_protecao import definicoes, movimentos

HOJE = datetime.date(2026, 9, 28)  # a mesma data do relógio do navegador nos testes (correr.py › DATA_FIXA)
DIA = HOJE.isoformat()
MOV = lambda i, t, v, **x: {'id': i, 'title': t, 'amount': v, 'date': DIA, 'detail': f'{HOJE.day} setembro · Alimentação', 'movementType': 'expense', **x}
CONTAS = [{'id': 'principal', 'name': 'Principal', 'balance': 500}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 100}]
AQUI = {'transactions': [MOV(1, 'Mercado Fictício', -12.3)], 'accounts': CONTAS}
OUTRO = {'transactions': [MOV(1, 'Mercado Fictício', -12.3), MOV(7, 'Farmácia Fictícia', -8, detail=f'{HOJE.day} setembro · Farmácia'),
                          MOV(8, 'Conjunta Fictícia', -20, account='revolut'), {'id': 9, 'title': 'Prémio Fictício', 'amount': 40, 'date': DIA,
                          'detail': f'{HOJE.day} setembro · Outras receitas', 'movementType': 'income', 'affectsBalance': True}],
         'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 3}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 4}]}


def ficheiro(conteudo, nome='backup-outro.json'):
    c = pathlib.Path(tempfile.mkdtemp()) / nome
    c.write_text(json.dumps(conteudo), encoding='utf-8')
    return str(c)


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO))


async def juntar(app, caminho, aceitar=True):
    """`aceitar=None`: não se espera pedido de confirmação."""
    p = app.page
    if aceitar is not None: p.once('dialog', lambda d: d.accept() if aceitar else d.dismiss())
    await p.set_input_files('input[aria-label="Backup do outro telemóvel"]', caminho); await p.wait_for_timeout(800)


async def t_juntar_traz_so_os_novos_sem_mexer_nos_saldos(app):
    await app.abrir(AQUI)
    p = app.page
    saldos = await app.saldos()
    await p.evaluate("window.ffGoPg('principal')"); await p.wait_for_timeout(400)
    await definicoes(app, 'Backup')
    verificar(not await p.query_selector('.setting-row:has-text("Desfazer a última junção")'), 'desfazer aparece sem junções')
    caminho = ficheiro({'app': 'financas-familiar', 'version': 4, 'data': OUTRO, 'jarvisThreads': [], 'vetReminders': []})
    await juntar(app, caminho, aceitar=False)
    verificar(await movimentos(app) == ['Mercado Fictício'], 'juntou sem confirmação')
    await juntar(app, caminho)
    verificar(sorted(await movimentos(app)) == ['Conjunta Fictícia', 'Farmácia Fictícia', 'Mercado Fictício', 'Prémio Fictício'], f'movimentos: {await movimentos(app)}')
    verificar('Juntados 3 movimentos novos' in await p.inner_text('.settings-message'), await p.inner_text('.settings-message'))
    d = await dados(app)
    verificar(d['accounts'] == CONTAS, f'as contas mudaram: {d["accounts"]}')
    verificar('Farmácia' in d['categories'], 'falta a categoria nova')
    juntados = [m for m in d['transactions'] if m['id'] != 1]
    verificar(all(m['affectsBalance'] is False and m['mergeBatch'].startswith('juntar-') for m in juntados), juntados)

    await juntar(app, caminho, aceitar=None)
    verificar('Não há movimentos novos para juntar (4 já existiam aqui)' in await p.inner_text('.settings-message'), await p.inner_text('.settings-message'))
    verificar(len(await movimentos(app)) == 4, 'duplicou movimentos')

    await p.go_back(); await p.wait_for_timeout(600)
    verificar(await p.evaluate("[...document.querySelectorAll('.transaction-list h3')].map(e=>e.textContent).includes('Farmácia Fictícia')"), 'a lista não mostra o movimento juntado')
    verificar(await app.saldos() == saldos, f'os saldos mudaram: {saldos} → {await app.saldos()}')

    await definicoes(app, 'Backup')
    p.once('dialog', lambda d: d.accept())
    await p.click('.setting-row:has-text("Desfazer a última junção")'); await p.wait_for_timeout(500)
    verificar(await movimentos(app) == ['Mercado Fictício'], f'não desfez: {await movimentos(app)}')
    verificar(not await p.query_selector('.setting-row:has-text("Desfazer a última junção")'), 'desfazer continua visível')


async def t_juntar_backup_protegido_e_ficheiros_invalidos(app):
    await app.abrir(AQUI)
    p = app.page
    await definicoes(app, 'Backup')
    await juntar(app, ficheiro({'qualquer': 1}), aceitar=None)
    verificar('Ficheiro inválido' in await p.inner_text('.settings-message'), 'aceitou um ficheiro inválido')
    # backup protegido criado pela própria app com os dados do «outro telemóvel»
    await app.abrir(OUTRO)
    await definicoes(app, 'Backup')
    await p.click('.setting-row:has-text("Criar backup protegido")'); await p.wait_for_timeout(200)
    await p.fill('.ffv2-senha [name=senha]', 'segredo1'); await p.fill('.ffv2-senha [name=repetir]', 'segredo1')
    async with p.expect_download(timeout=15000) as d:
        await p.click('.ffv2-senha button[type=submit]')
    caminho = pathlib.Path(tempfile.mkdtemp()) / 'outro-protegido.json'
    await (await d.value).save_as(caminho)

    await app.abrir(AQUI)
    await definicoes(app, 'Backup')
    await p.set_input_files('input[aria-label="Backup do outro telemóvel"]', str(caminho)); await p.wait_for_timeout(500)
    verificar('Juntar movimentos' in await p.inner_text('.ffv2-senha button[type=submit]'), 'o formulário da palavra-passe não é o da junção')
    await p.fill('.ffv2-senha [name=senha]', 'errada1'); await p.click('.ffv2-senha button[type=submit]'); await p.wait_for_timeout(2500)
    verificar(await p.inner_text('[role=alert]') == 'Palavra-passe errada.', 'aceitou a palavra-passe errada')
    p.once('dialog', lambda dl: dl.accept())
    await p.fill('.ffv2-senha [name=senha]', 'segredo1'); await p.click('.ffv2-senha button[type=submit]'); await p.wait_for_timeout(2500)
    verificar(len(await movimentos(app)) == 4, f'não juntou: {await movimentos(app)}')
    verificar(not await p.query_selector('.ffv2-senha'), 'o formulário da palavra-passe ficou aberto')
