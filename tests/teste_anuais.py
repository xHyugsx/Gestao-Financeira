"""Despesas anuais: só os próximos 12 meses, «por pagar» / «em atraso», registar o pagamento ou renovar, e previsão do saldo."""
from correr import verificar

A = lambda i, n, v, m, a: {'id': i, 'name': n, 'value': v, 'month': m, 'year': a}
DADOS = {'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 1000}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}],
         'transactions': [],
         'annualExpenses': [A(1, 'IUC', 150, 3, 2026), A(2, 'Seguro casa', 300, 9, 2026), A(3, 'Seguro carro', 420, 11, 2026), A(4, 'Revisão', 200, 4, 2028)]}
LER = """[...document.querySelectorAll('.page-current .transaction-list article')].map(a=>
  [a.querySelector('h3').textContent, a.querySelector('.ffanual-estado')?.textContent || '', !!a.querySelector('.ffanual-acoes')])"""
RESUMO = "[...document.querySelectorAll('.page-current .summary-grid article strong')].map(e=>e.textContent.replace(/\\u00a0/g,' '))"


async def abrir_anuais(app):
    p = app.page
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(400)
    await p.click('.segmented button:text-is("Despesas anuais")'); await p.wait_for_timeout(500)


async def t_anuais_estados_total_e_acoes(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await abrir_anuais(app)
    linhas = await p.evaluate(LER)
    verificar(linhas == [['IUC', 'Em atraso', True], ['Seguro casa', 'Por pagar', True], ['Seguro carro', '', False], ['Revisão', '', False]], f'linhas: {linhas}')
    verificar((await p.evaluate(RESUMO))[:2] == ['720,00 €', '60,00 €'], 'só os próximos 12 meses (300 + 420) e reserva de 60 €')

    await p.click('.page-current article:has(h3:text-is("Seguro casa")) button:has-text("Registar pagamento")'); await p.wait_for_timeout(600)
    verificar(await p.input_value('[role=dialog] input[name=title]') == 'Seguro casa', 'devia abrir o movimento do pagamento para acertar')
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    ms = await app.movimentos()
    verificar(len(ms) == 1 and ms[0]['amount'] == -300 and ms[0]['date'] == '2026-09-28', f'pagamento registado hoje: {ms}')
    await p.click('.page-current article:has(h3:text-is("IUC")) button:has-text("Renovar sem registar")'); await p.wait_for_timeout(500)
    anuais = await p.evaluate("P=>JSON.parse(localStorage.getItem(P+'v3')).annualExpenses.map(e=>[e.name,e.month,e.year])", 'financas-familiar:')
    verificar(anuais == [['IUC', 3, 2027], ['Seguro casa', 9, 2027], ['Seguro carro', 11, 2026], ['Revisão', 4, 2028]], f'renovadas para o ano seguinte: {anuais}')
    verificar(len(await app.movimentos()) == 1, 'renovar sem registar não cria movimento')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_anuais_na_previsao(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.click('button[aria-label="Mês seguinte"]'); await p.click('button[aria-label="Mês seguinte"]'); await p.wait_for_timeout(800)
    saldos = await app.saldos()
    verificar(saldos.get('Principal') == '280,00 €', f'previsão de novembro: seguro da casa (por pagar) e do carro: {saldos}')
    nota = (await p.text_content('.page-current .ffprevistos') or '').replace(' ', ' ')
    verificar('2 despesas anuais previstas até ao fim de novembro (≈ 720,00 €)' in nota, f'nota: {nota}')
    verificar(not app.erros, f'erros: {app.erros}')
