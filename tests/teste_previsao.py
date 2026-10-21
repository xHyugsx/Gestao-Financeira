"""Previsão do saldo de um mês futuro: inclui os recorrentes que a app ainda vai criar (com a nota do total previsto)."""
from correr import verificar

DADOS = {'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 1000}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}],
         'transactions': [{'id': 1, 'title': 'Renda', 'amount': -600, 'date': '2026-09-25', 'detail': '25 setembro · Habitação',
                           'movementType': 'expense', 'recurring': 'com', 'recurringEvery': 1}]}


async def t_previsao_com_recorrentes(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    verificar((await app.saldos()).get('Principal') == '400,00 €', 'hoje (28/09): só a renda de setembro')
    verificar(not await p.query_selector('.page-current .ffprevistos'), 'o mês atual não tem previsão')
    await p.click('button[aria-label="Mês seguinte"]'); await p.wait_for_timeout(600)
    verificar((await app.saldos()).get('Principal') == '-200,00 €', 'previsão de outubro: falta a renda de 25/10')
    nota = (await p.text_content('.page-current .ffprevistos') or '').replace(' ', ' ')
    verificar('1 recorrente previsto até ao fim de outubro (≈ 600,00 €)' in nota, f'nota: {nota}')
    await p.click('button[aria-label="Mês seguinte"]'); await p.wait_for_timeout(600)
    verificar((await app.saldos()).get('Principal') == '-800,00 €', 'previsão de novembro: rendas de outubro e novembro')
    verificar(len(await app.movimentos()) == 1, 'a previsão não pode gravar movimentos')
    verificar(not app.erros, f'erros: {app.erros}')
