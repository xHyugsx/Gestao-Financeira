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
    verificar((await app.saldos()).get('Principal') == '-200,00 €', 'saldo com duas rendas (agosto e setembro), não três')
    await p.click('.segmented button:text-is("Recorrentes")'); await p.wait_for_timeout(500)
    rec = await p.evaluate("""[...document.querySelectorAll('.page-current .transaction-list article')].map(a=>
      [a.querySelector('h3').textContent, a.querySelector('.ffrec-dir small').textContent])""")
    verificar(rec == [['Renda', 'Pago']], f'Recorrentes de setembro: {rec}')
    verificar(not app.erros, f'erros: {app.erros}')
