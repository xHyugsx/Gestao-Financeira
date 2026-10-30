"""Despesas anuais: só os próximos 12 meses, «por pagar» / «em atraso», registar o pagamento ou renovar, e previsão dos gastos."""
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
    r = (await app.jarvis('Previsão dos gastos em novembro')).replace('\u00a0', ' ')
    verificar(r == 'Previsão dos gastos em novembro: ≈ 420,00 € (420,00 € de recorrentes e despesas anuais previstos).', f'seguro do carro: {r}')
    r = (await app.jarvis('Previsão dos gastos em outubro')).replace('\u00a0', ' ')
    verificar(r == 'Ainda não há gastos previstos para outubro.', r)
    verificar(not app.erros, f'erros: {app.erros}')



async def t_anual_paga_por_fora(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(500)
    await p.fill('.movement-dialog input[name=title]', 'Seguro casa'); await p.fill('.movement-dialog input[name=amount]', '310')
    await p.click('.movement-dialog button[type=submit]'); await p.wait_for_timeout(800)
    anuais = await p.evaluate("P=>JSON.parse(localStorage.getItem(P+'v3')).annualExpenses.map(e=>[e.name,e.year])", 'financas-familiar:')
    verificar(['Seguro casa', 2027] in anuais, f'pago pelo «+», o seguro da casa devia passar para 2027: {anuais}')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_anual_de_valor_variavel(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir({**DADOS, 'transactions': [{'id': 1, 'title': 'Seguro saúde', 'amount': -240, 'date': '2025-12-03', 'detail': '3 dezembro · Saúde', 'movementType': 'expense'}]})
    p = app.page
    await abrir_anuais(app)
    await p.fill('.page-current form input[name=name]', 'Água anual')
    verificar(await p.get_attribute('.page-current form input[name=value]', 'required') is not None, 'sem «variável», o valor é obrigatório')
    await p.check('.page-current form input[name=variable]')
    await p.fill('.page-current form input[name=month]', '2026-12')
    await p.click('.page-current form button[type=submit]'); await p.wait_for_timeout(500)
    await p.fill('.page-current form input[name=name]', 'Seguro saúde'); await p.check('.page-current form input[name=variable]')
    await p.fill('.page-current form input[name=value]', '200'); await p.fill('.page-current form input[name=month]', '2026-12')
    await p.click('.page-current form button[type=submit]'); await p.wait_for_timeout(500)
    d = await app.page.evaluate("P=>JSON.parse(localStorage.getItem(P+'v3')).annualExpenses.filter(e=>e.variable)", 'financas-familiar:')
    verificar([(e['name'], e['value'], e['month'], e['year']) for e in d] == [('Água anual', 0, 12, 2026), ('Seguro saúde', 200, 12, 2026)], f'guardadas: {d}')
    linha = lambda n: p.evaluate(f"""(()=>{{const a=[...document.querySelectorAll('.page-current .transaction-list article')].find(x=>x.querySelector('h3').textContent==='{n}');
      return [a.querySelector('.ffanual-variavel')?.textContent||'', a.querySelector('strong').textContent.replace(/\\u00a0/g,' ')]}})()""")
    verificar(await linha('Água anual') == ['Valor a definir', '—'], f'sem estimativa: {await linha("Água anual")}')
    verificar(await linha('Seguro saúde') == ['Valor a definir', '≈ −240,00 €'], f'estimativa pelo último pagamento: {await linha("Seguro saúde")}')
    verificar(await p.evaluate(RESUMO) == ['960,00 €', '80,00 €'], f'total com a estimativa (300 + 420 + 240): {await p.evaluate(RESUMO)}')
    await p.click('.page-current button[aria-label="Passar a valor fixo: Seguro saúde"]'); await p.wait_for_timeout(300)
    verificar(await linha('Seguro saúde') == ['', '−240,00 €'], f'passa a fixo com a estimativa: {await linha("Seguro saúde")}')
    await p.click('.page-current button[aria-label="Passar a valor variável: Seguro saúde"]'); await p.wait_for_timeout(300)
    verificar((await linha('Seguro saúde'))[0] == 'Valor a definir', 'volta a variável')
    verificar(not app.erros, f'erros: {app.erros}')
