"""v2.57.0: quando se recebe o salário (rendimento do mês certo), «Quem recebe» atualiza a tabela de Salários e «Esqueci-me do PIN»."""
import asyncio, hashlib, json
from correr import verificar, PREFIXO

PIN = hashlib.sha256(b'financas-familiar:1234').hexdigest()
RENDIMENTO = "document.querySelector('.ffhero-txt strong').textContent.replace(/\\u00a0/g,' ')"


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}')


async def receita_salario(p, valor, data=None):
    await p.click('.ffplus'); await p.wait_for_timeout(600)
    await p.click('[role=dialog] .segmented button:text-is("Receita")'); await p.wait_for_timeout(200)
    await p.click('[role=dialog] .ffcat-escolha-abrir'); await p.wait_for_timeout(300)
    await p.click('[role=dialog] [data-campo="category"] [data-valor="Salário"] >> nth=0'); await p.wait_for_timeout(200)
    await p.fill('[role=dialog] input[name=title]', 'Ordenado'); await p.fill('[role=dialog] input[name=amount]', valor)
    if data: await p.fill('[role=dialog] input[type=date]', data)


async def t_primeiro_salario_pergunta_quando_se_recebe(app):
    await app.abrir({})
    p = app.page
    await receita_salario(p, '1500', '2026-09-01')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(1500)
    titulo = await p.text_content('[role=dialog] h2') or ''
    verificar('Quando recebes o salário' in titulo, f'devia perguntar quando se recebe: {titulo!r}')
    await p.click('[role=dialog] button:text-is("No início do mês")'); await p.wait_for_timeout(600)
    verificar((await dados(app))['profile'].get('salaryMonth') == 'proprio', 'a escolha não ficou guardada')
    verificar(await p.evaluate(RENDIMENTO) == '1500,00 €', f'rendimento de setembro: {await p.evaluate(RENDIMENTO)}')
    # o segundo salário já não pergunta
    await receita_salario(p, '1500', '2026-10-01')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(1500)
    verificar(not await p.query_selector('.ffpergunta-salario'), 'voltou a perguntar')


async def t_quem_ja_tem_salarios_nao_e_perguntado(app):
    await app.abrir({'salaries': {'2026': {'Ana': [0, 0, 0, 0, 0, 0, 0, 2000, 0, 0, 0, 0]}}})
    p = app.page
    verificar(await p.evaluate(RENDIMENTO) == '2000,00 €', f'regra de sempre (salários do mês anterior): {await p.evaluate(RENDIMENTO)}')
    await receita_salario(p, '2100')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(1500)
    verificar(not await p.query_selector('.ffpergunta-salario'), 'não devia perguntar a quem já tem salários')


async def t_quem_recebe_atualiza_a_tabela(app):
    await app.abrir({'profile': {'profileName': 'Casa', 'email': '', 'phone': '', 'members': ['Ana', 'Rui'], 'salaryMonth': 'anterior'}})
    p = app.page
    await receita_salario(p, '1400')
    await p.click('[role=dialog] [data-campo="person"] [data-valor="Rui"]')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(1000)
    d = await dados(app)
    verificar(d['salaries']['2026']['Rui'][8] == 1400 and d['transactions'][0]['person'] == 'Rui', f'tabela: {d["salaries"]}')
    await p.click('.page-current .transaction-list article[aria-label="Editar Ordenado"]'); await p.wait_for_timeout(500)
    verificar(await p.query_selector('[role=dialog] [data-campo="person"]'), 'a edição devia mostrar «Quem recebe»')
    await p.fill('[role=dialog] input[name=amount]', '1450'); await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(900)
    verificar((await dados(app))['salaries']['2026']['Rui'][8] == 1450, 'editar não atualizou a tabela')
    await p.click('.page-current .transaction-list article[aria-label="Editar Ordenado"]'); await p.wait_for_timeout(500)
    await p.click('[role=dialog] button:has-text("Eliminar")'); await p.wait_for_timeout(600)
    verificar((await dados(app))['salaries']['2026']['Rui'][8] == 0, 'apagar não tirou da tabela')
    await p.click('.ffdesfazer button'); await p.wait_for_timeout(500)
    verificar((await dados(app))['salaries']['2026']['Rui'][8] == 1450, 'desfazer devia repor na tabela')


async def t_esqueci_me_do_pin_apaga_e_restaura_sem_pin(app):
    tx = [{'id': 1, 'title': 'Cinema', 'amount': -8, 'date': '2026-09-12', 'detail': '12 setembro · Lazer', 'movementType': 'expense'}]
    await app.abrir({'pinHash': PIN, 'transactions': tx})
    p = app.page
    verificar(await p.query_selector('#ff-lock'), 'devia pedir o PIN')
    await p.keyboard.press('Enter'); await p.wait_for_timeout(400)
    await p.click('.ffl-esqueci'); await p.wait_for_timeout(500)
    sim = p.locator('.ffl-reset-sim')
    verificar(await sim.is_disabled(), 'apagar devia esperar por «APAGAR»')
    await p.fill('.ffl-reset-in', 'apaga'); verificar(await sim.is_disabled(), 'aceitou outra palavra')
    await p.fill('.ffl-reset-in', 'apagar'); await p.wait_for_timeout(100)
    await sim.click(); await p.wait_for_timeout(2500)
    verificar(not await p.query_selector('#ff-lock'), 'depois de apagar não devia pedir o PIN')
    verificar(not (await dados(app)).get('transactions'), 'os dados deviam ter sido apagados')
    titulo = await p.text_content('[role=dialog] h2') or ''
    verificar('foram apagados' in titulo, f'devia propor restaurar: {titulo!r}')
    await p.click('[role=dialog] button:text-is("Restaurar backup")'); await p.wait_for_timeout(700)
    backup = {'app': 'financas-familiar', 'version': 4, 'data': {'transactions': tx, 'pinHash': PIN}}
    p.on('dialog', lambda x: asyncio.ensure_future(x.accept()))
    await p.set_input_files('input[aria-label="Ficheiro de cópia de segurança"]', files=[{'name': 'b.json', 'mimeType': 'application/json', 'buffer': json.dumps(backup).encode()}])
    await p.wait_for_timeout(800)
    d = await dados(app)
    verificar([m['title'] for m in d['transactions']] == ['Cinema'] and not d.get('pinHash'), f'restauro: {d.get("pinHash")!r}')
    await p.reload(); await p.wait_for_timeout(1800)
    verificar(not await p.query_selector('#ff-lock'), 'a cópia restaurada não devia ter PIN')
