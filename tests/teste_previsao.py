"""Jarvis sem saldos (v2.36.0): perguntas sobre contas dão os gastos por conta; previsão dos gastos de um mês futuro."""
from correr import verificar

M = lambda i, t, v, d, **x: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'{int(d[8:])} x · Outros', 'movementType': 'expense', **x}
DADOS = {'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 1000}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}],
         'transactions': [M(1, 'Renda', -600, '2026-09-25', recurring='com', recurringEvery=1), M(2, 'Cinema', -30, '2026-09-12', account='revolut'),
                          M(3, 'Ginásio', -20, '2026-10-05')],
         'annualExpenses': [{'id': 1, 'name': 'Seguro carro', 'value': 420, 'month': 11, 'year': 2026}]}


async def t_contas_dao_os_gastos_por_conta(app):
    await app.abrir(DADOS)
    r = (await app.jarvis('Gastos por conta')).replace(' ', ' ')
    verificar(r == 'Gastos por conta em setembro: Principal: 600,00 € · Revolut Conjunta: 30,00 €.', r)
    r = (await app.jarvis('Saldo das contas')).replace(' ', ' ')
    verificar(r.startswith('A app já não mostra os saldos das contas. Gastos por conta em setembro:') and '1000' not in r, r)
    r = (await app.jarvis('saldo em agosto')).replace(' ', ' ')
    verificar(r == 'A app já não mostra os saldos das contas. Não há gastos registados em agosto.', r)
    verificar(not app.erros, f'erros: {app.erros}')


async def t_previsao_dos_gastos(app):
    await app.abrir(DADOS)
    r = (await app.jarvis('Previsão dos gastos em outubro')).replace(' ', ' ')
    verificar(r == 'Previsão dos gastos em outubro: ≈ 620,00 € (20,00 € já registados ou agendados e 600,00 € de recorrentes e despesas anuais previstos).', r)
    r = (await app.jarvis('Previsão dos gastos em novembro')).replace(' ', ' ')
    verificar(r == 'Previsão dos gastos em novembro: ≈ 1020,00 € (1020,00 € de recorrentes e despesas anuais previstos).', r)
    verificar(len(await app.movimentos()) == 3, 'a previsão não pode gravar movimentos')
    verificar(not app.erros, f'erros: {app.erros}')
