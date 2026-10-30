"""Recorrente registado à mão no mês: a app não cria a cópia automática (ficava a dobrar) e esse movimento continua a série."""
from correr import verificar

DADOS = {'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 1000}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}],
         'transactions': [
             {'id': 1, 'title': 'Renda', 'amount': -600, 'date': '2026-08-25', 'detail': '25 agosto · Habitação', 'movementType': 'expense',
              'recurring': 'com', 'recurringEvery': 1},
             {'id': 2, 'title': 'Renda', 'amount': -600, 'date': '2026-09-27', 'detail': '27 setembro · Habitação', 'movementType': 'expense'}]}


async def t_recorrente_registado_a_mao_nao_duplica(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    ms = {m['id']: m for m in await app.movimentos()}
    verificar(len(ms) == 2, f'não devia criar a renda de 25/09 (já registada a 27/09): {list(ms.values())}')
    verificar(ms[1].get('recurringDone') is True and ms[2].get('recurringEvery') == 1, f'a renda de 27/09 passa a continuar a série: {ms}')
    verificar(await app.gastos() == '600,00 €', f'setembro com uma renda, não duas: {await app.gastos()}')
    await p.click('.segmented button:text-is("Recorrentes")'); await p.wait_for_timeout(500)
    rec = await p.evaluate("""[...document.querySelectorAll('.page-current .transaction-list article')].map(a=>
      [a.querySelector('h3').textContent, a.querySelector('.ffrec-dir small').textContent])""")
    verificar(rec == [['Renda', 'Pago']], f'Recorrentes de setembro: {rec}')
    verificar(not app.erros, f'erros: {app.erros}')


COPIA = {'accounts': DADOS['accounts'], 'transactions': [
    {'id': 5, 'title': 'Renda', 'amount': -600, 'date': '2026-09-25', 'detail': '25 setembro · Habitação', 'movementType': 'expense', 'recurring': 'com', 'recurringEvery': 1},
    {'id': 6, 'title': 'Luz', 'amount': 0, 'date': '2026-09-05', 'detail': '5 setembro · Casa', 'movementType': 'expense', 'recurring': 'sem', 'recurringEvery': 1}]}


async def registar(app, titulo, valor, data):
    p = app.page
    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(500)
    await p.fill('.movement-dialog input[name=title]', titulo); await p.fill('.movement-dialog input[name=amount]', valor)
    await p.fill('.movement-dialog input[name=date]', data)
    await p.click('.movement-dialog button[type=submit]'); await p.wait_for_timeout(600)


async def t_registar_a_mao_preenche_a_copia_por_confirmar(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(COPIA)
    await registar(app, 'Luz', '43,20', '2026-09-27')
    ms = {m['id']: m for m in await app.movimentos()}
    verificar(len(ms) == 2 and ms[6]['amount'] == -43.2 and ms[6]['date'] == '2026-09-27', f'a cópia por confirmar devia ficar preenchida (sem criar outra): {list(ms.values())}')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_registar_a_mao_pergunta_se_ja_existe(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(COPIA)
    p = app.page
    await registar(app, 'Renda', '600', '2026-09-26')
    verificar('Este recorrente já está registado' in (await p.text_content('[role=dialog]') or ''), 'devia perguntar se já existe')
    await p.click('[role=dialog] button:has-text("Substituir")'); await p.wait_for_timeout(500)
    ms = {m['id']: m for m in await app.movimentos()}
    verificar(len(ms) == 2 and ms[5]['date'] == '2026-09-26' and ms[5].get('recurringEvery') == 1, f'substituir fica só um, na série: {list(ms.values())}')
    await registar(app, 'Renda', '50', '2026-09-27')
    await p.click('[role=dialog] button:has-text("Registar na mesma")'); await p.wait_for_timeout(500)
    verificar(len(await app.movimentos()) == 3, 'registar na mesma fica com os dois')
    verificar(not app.erros, f'erros: {app.erros}')
