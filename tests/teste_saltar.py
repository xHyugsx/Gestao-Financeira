"""Apagar a última cópia de uma série recorrente: «Só este mês» (a série continua) ou «Parar a série»; as outras pedem confirmação."""
from correr import verificar

R = lambda i, d, **x: {'id': i, 'title': 'Ginásio', 'amount': -30, 'date': d, 'detail': 'x · Saúde', 'movementType': 'expense',
                       'recurring': 'com', 'recurringEvery': 1, **x}
DADOS = {'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 1000}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}],
         'transactions': [R(1, '2026-08-10', recurringDone=True), R(2, '2026-09-10')]}
LINHA = '.page-current .transaction-list article[aria-label="Editar Ginásio"]'


async def apagar_ultima(app):
    p = app.page
    await p.locator(LINHA).first.click(); await p.wait_for_timeout(500)
    await p.click('[role=dialog] button:has-text("Eliminar")'); await p.wait_for_timeout(500)
    verificar(await p.query_selector('[role=dialog] .ffapagar-opcoes'), 'falta a pergunta «Só este mês / Parar a série»')


async def t_so_este_mes(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await apagar_ultima(app)
    await p.click('[role=dialog] button:has-text("Só este mês")'); await p.wait_for_timeout(600)
    ms = {m['id']: m for m in await app.movimentos()}
    verificar(ms[2].get('skipped') is True and len(ms) == 2, f'a cópia devia ficar saltada, não apagada: {ms}')
    verificar(await p.locator(LINHA).count() == 1, 'a cópia saltada devia desaparecer da lista')
    verificar((await app.saldos()).get('Principal') == '970,00 €', 'a cópia saltada não conta no saldo')
    await p.click('.segmented button:text-is("Recorrentes")'); await p.wait_for_timeout(500)
    verificar(await p.locator('.page-current .transaction-list article h3').count() == 0, 'setembro saltado não devia aparecer nos Recorrentes')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_parar_a_serie(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await apagar_ultima(app)
    await p.click('[role=dialog] button:has-text("Parar a série")'); await p.wait_for_timeout(600)
    verificar([m['id'] for m in await app.movimentos()] == [1], 'parar a série apaga a cópia')
    # as outras (que já não criam cópias) continuam com a confirmação simples
    p.once('dialog', lambda d: d.accept())
    await p.locator(LINHA).first.click(); await p.wait_for_timeout(500)
    await p.click('[role=dialog] button:has-text("Eliminar")'); await p.wait_for_timeout(600)
    verificar(await app.movimentos() == [], 'a confirmação simples devia apagar o movimento antigo')
    verificar(not app.erros, f'erros: {app.erros}')
