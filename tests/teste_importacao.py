"""Importação de extratos na app nova (Definições › Importação) e regras pessoais guardadas no telemóvel."""
import json, tempfile
from correr import verificar, PREFIXO

MANUAL = {'transactions': [{'id': 1, 'title': 'Mercado', 'amount': -12.3, 'date': '2026-09-20', 'detail': '20 setembro · Alimentação', 'movementType': 'expense'}]}
CAB = 'Consultar saldos e movimentos à ordem - 28-09-2026\nSaldo contabilístico ;1.000,00 EUR\nData mov. ;Data-valor ;Descrição ;Montante ;\n'
PESSOAL = CAB + ''.join(f'{d}-09-2026;{d}-09-2026;{t} ;{v};\n' for d, t, v in [
    ('25', 'TRF EMPRESA FICTICIA LDA', '1.500,00'), ('20', 'PRESTACAO FICTICIA', '-100,00'),
    ('15', 'TFI PESSOA FICTICIA', '-200,00'), ('10', 'CORRETORA FICTICIA', '-50,00'), ('05', 'COMPRA CONTINENTE', '-20,00')])


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}')


async def seccao(app):
    p = app.page
    await p.click('button[aria-label="Definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-more'); await p.wait_for_timeout(400)
    await p.click('.settings-list .setting-row:has-text("Importação")'); await p.wait_for_timeout(400)


async def importar(app, ficheiro):
    await app.page.set_input_files('input[aria-label="Ficheiro do extrato"]', ficheiro); await app.page.wait_for_timeout(1500)


def csv(texto):
    f = tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, encoding='utf-8'); f.write(texto); f.close()
    return f.name


async def resumo(app):
    return await app.page.evaluate("document.querySelector('.ffst-hd>p')?.textContent||''")


async def t_importar_pelas_definicoes_e_desfazer(app):
    await app.abrir(MANUAL)
    await seccao(app)
    await importar(app, 'tests/dados/extrato_ficticio.xlsx')
    p = app.page
    verificar((await resumo(app)).startswith('12 movimentos'), f'resumo: {await resumo(app)}')
    verificar('Nada é gravado' in await p.inner_text('.settings-message'), 'falta a mensagem da revisão')
    dup = await p.evaluate("[...document.querySelectorAll('.ffst-row')].filter(r=>/Possível duplicado/.test(r.textContent)).map(r=>r.classList.contains('off'))")
    verificar(dup == [True], f'duplicado: {dup}')
    contas = (await dados(app)).get('accounts')
    await p.click('.ffst-go'); await p.wait_for_timeout(900)
    d = await dados(app); imp = [m for m in d['transactions'] if m.get('importBatch')]
    verificar(len(imp) == 9 and all(m.get('affectsBalance') is False for m in imp), f'importados: {len(imp)}')
    verificar(d.get('accounts') == contas, 'a importação mexeu nas contas')
    verificar('Importação concluída' in await p.inner_text('.settings-message'), 'falta a mensagem de conclusão')
    p.once('dialog', lambda dl: dl.accept())
    await p.click('.setting-row:has-text("Desfazer a última importação")'); await p.wait_for_timeout(500)
    verificar(len((await dados(app))['transactions']) == 1, 'não desfez')
    verificar('anulada' in await p.inner_text('.settings-message'), 'falta a mensagem de anulação')
    verificar(await p.is_disabled('.setting-row:has-text("Desfazer a última importação")'), 'desfazer continua ativo')


async def t_csv_e_reimportar_ignora_ja_importados(app):
    await app.abrir(MANUAL)
    await seccao(app)
    await importar(app, 'tests/dados/extrato_ficticio.csv')
    verificar((await resumo(app)).startswith('12 movimentos'), await resumo(app))
    await app.page.click('.ffst-go'); await app.page.wait_for_timeout(900)
    await importar(app, 'tests/dados/extrato_ficticio.csv')
    verificar('9 já importados antes' in await resumo(app), await resumo(app))


async def t_regras_pessoais(app):
    await app.abrir({})
    await seccao(app)
    p = app.page
    for i, (texto, acao, pessoa) in enumerate([('Empresa Fictícia', 'salario', 'Ana'), ('prestacao ficticia', 'ignorar', ''),
                                              ('TFI PESSOA FICTICIA', 'transferir', ''), ('CORRETORA', 'investimento', '')], 1):
        await p.click('.ffv2-regras button:has-text("Nova regra")')
        await p.fill(f'[aria-label="Texto da regra {i}"]', texto)
        await p.select_option(f'[aria-label="Ação da regra {i}"]', acao)
        if pessoa: await p.fill(f'[aria-label="Pessoa da regra {i}"]', pessoa)
    await p.click('.ffv2-regras button[type=submit]'); await p.wait_for_timeout(300)
    regras = (await dados(app))['importConfig']['rules']
    verificar(len(regras) == 4 and regras[0] == {'contem': 'Empresa Fictícia', 'acao': 'salario', 'pessoa': 'Ana'}, f'regras: {regras}')
    verificar(len((await p.evaluate("window.ffBk.payload()"))['data']['importConfig']['rules']) == 4, 'o backup não tem as regras')
    await importar(app, csv(PESSOAL))
    await p.click('.ffst-tabs [data-t=all]'); await p.wait_for_timeout(200)
    linhas = await p.evaluate("Object.fromEntries([...document.querySelectorAll('.ffst-row')].map(r=>[r.querySelector('.ffst-tt').textContent,r.querySelector('.ffst-sub').textContent]))")
    verificar('Salário de Ana' in linhas['Empresa Ficticia Lda'], f'salário: {linhas}')
    verificar('Ignorado' in linhas['Prestacao Ficticia'], f'ignorar: {linhas}')
    verificar('O que é isto?' in linhas['Pessoa Ficticia'], f'transferir: {linhas}')
    verificar('Recorrente' in linhas['Corretora Ficticia'], f'investimento: {linhas}')
    await p.select_option('.ffst-row select[data-a]', 'Poupança'); await p.wait_for_timeout(200)
    await p.click('.ffst-go'); await p.wait_for_timeout(900)
    d = await dados(app)
    verificar(d['salaries']['2026']['Ana'][8] == 1500, f'salários: {d["salaries"]}')
    inv = next(m for m in d['transactions'] if m['title'] == 'Corretora Ficticia')
    verificar(inv['detail'] == '10 setembro · Investimentos' and inv['recurring'] == 'com', f'investimento: {inv}')
    verificar(not any(m['title'] == 'Prestacao Ficticia' for m in d['transactions']), 'importou um ignorado')


async def t_duplicado_de_um_recorrente(app):
    serie = [{'id': 1, 'title': 'Supermercado', 'amount': -20, 'date': '2026-08-06', 'detail': '6 agosto · Alimentação', 'movementType': 'expense', 'recurring': 'com', 'recurringEvery': 1}]
    await app.abrir({'transactions': serie})
    await seccao(app)
    await importar(app, csv(PESSOAL))
    tag = await app.page.evaluate("[...document.querySelectorAll('.ffst-row')].find(r=>/Continente/.test(r.textContent)).className+' '+[...document.querySelectorAll('.ffst-row')].find(r=>/Continente/.test(r.textContent)).textContent")
    verificar('off' in tag and 'Possível duplicado' in tag, f'a cópia do recorrente não foi vista como duplicado: {tag}')


async def t_acertar_saldo_pelo_extrato(app):
    contas = [{'id': 'principal', 'name': 'Principal', 'balance': 800}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}]
    await app.abrir({'accounts': contas})
    await seccao(app)
    await importar(app, 'tests/dados/extrato_ficticio.csv')
    p = app.page
    await p.check('.ffst-bal'); await p.click('.ffst-go'); await p.wait_for_timeout(900)
    principal = (await dados(app))['accounts'][0]
    verificar(principal['balance'] == 1000 and principal['adjDays'] == {'2026-09-28': 200}, f'conta: {principal}')
    p.once('dialog', lambda dl: dl.accept())
    await p.click('.setting-row:has-text("Desfazer a última importação")'); await p.wait_for_timeout(500)
    verificar((await dados(app))['accounts'][0] == contas[0], f'não repôs a conta: {(await dados(app))["accounts"][0]}')
