"""Recorrentes de valor variável: «Valor por confirmar», lembrete na frase do dia, estimativa no Resumo e confirmar o valor."""
from correr import verificar

L = lambda i, d, v, **x: {'id': i, 'title': 'Luz', 'amount': v, 'date': d, 'detail': 'x · Casa', 'movementType': 'expense',
                          'recurring': 'sem', 'recurringEvery': 1, **x}
DADOS = {'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 1000}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}],
         'transactions': [L(1, '2026-07-05', -40, recurringDone=True), L(2, '2026-08-05', -46, recurringDone=True), L(3, '2026-09-05', 0)]}


async def t_valor_variavel_por_confirmar(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    linha = '.page-current .transaction-list article[aria-label="Editar Luz"]'
    verificar(await p.query_selector(f'{linha} .ffconfirmar'), 'falta a etiqueta «Valor por confirmar»')
    verificar('Falta confirmar o valor de Luz' in (await p.text_content('.ffdica') or ''), 'a frase do dia não lembra o valor por confirmar')
    verificar((await app.saldos()).get('Principal') == '914,00 €', 'o valor por confirmar não deve mexer no saldo')
    await p.click('.segmented button:text-is("Recorrentes")'); await p.wait_for_timeout(500)
    rec = await p.evaluate("""[...document.querySelectorAll('.page-current .transaction-list article')].map(a=>
      [a.querySelector('h3').textContent, a.querySelector('.ffrec-dir strong').textContent.replace(/\\u00a0/g,' '), a.querySelector('.ffrec-dir small').textContent])""")
    verificar(rec == [['Luz', '≈ 43,00 €', 'Por confirmar']], f'Recorrentes: {rec}')

    await p.evaluate("window.ffGoPg('principal')"); await p.wait_for_timeout(500)
    await p.click(linha); await p.wait_for_timeout(500)
    valor = '[role=dialog] input[name=amount]'
    verificar(await p.input_value(valor) == '', 'o campo do valor devia vir vazio')
    verificar('46,00' in (await p.text_content('[role=dialog] .ffultimo') or ''), 'falta «Da última vez: 46,00 €»')
    await p.click('[role=dialog] .ffultimo')
    verificar(await p.input_value(valor) == '46', 'tocar em «usar» não preencheu o valor')
    await p.fill(valor, '51,30'); await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(600)
    luz = [m for m in await app.movimentos() if m['id'] == 3][0]
    verificar(luz['amount'] == -51.3 and luz['recurring'] == 'sem', f'movimento confirmado: {luz}')
    verificar(not await p.query_selector(f'{linha} .ffconfirmar'), 'a etiqueta devia desaparecer depois de confirmar')
    verificar((await app.saldos()).get('Principal') == '862,70 €', 'depois de confirmar, o valor conta no saldo')
    verificar(not app.erros, f'erros: {app.erros}')
