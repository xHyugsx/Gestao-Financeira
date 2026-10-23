"""Movimentos com data futura (agendados): só contam no saldo a partir do dia; etiqueta «Agendado»; previsão no Resumo."""
from correr import verificar

M = lambda i, d, t, v, **x: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': 'x · Outros', 'movementType': 'expense', **x}
DADOS = {'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 1000}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}],
         'transactions': [
    M(1, '2026-09-20', 'Supermercado', -50),
    M(2, '2026-09-30', 'Renda', -300, recurring='com'),
    M(3, '2026-10-05', 'Ginásio', -20)]}


async def t_agendados_nao_contam_no_saldo(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    resumo = (await p.text_content('.page-current .ffagendados-resumo') or '').strip()
    verificar('1 agendado · próximo: Renda, 30 setembro' in resumo, f'resumo dos agendados (só os deste mês): {resumo}')
    verificar(await p.evaluate("[...document.querySelectorAll('.page-current .transaction-list article h3')].map(e=>e.textContent)") == ['Supermercado'],
              'os agendados não podem tapar os movimentos recentes')
    await p.click('.page-current .ffagendados-resumo'); await p.wait_for_timeout(500)
    grupos = await p.evaluate("""[...document.querySelectorAll('.page-current .transaction-list')].map(l=>
      [...l.querySelectorAll('article')].map(a=>[a.querySelector('h3').textContent, !!a.querySelector('.ffagendado')]))""")
    verificar(grupos == [[['Renda', True]], [['Supermercado', False]]], f'grupos (agendados do mês, depois até hoje): {grupos}')
    saldos = await app.saldos()
    verificar(saldos.get('Principal') == '950,00 €', f'hoje (28/09) só conta o Supermercado: {saldos}')
    await p.click('button[aria-label="Mês seguinte"]'); await p.wait_for_timeout(600)
    verificar('Previsão para o fim de outubro' in await p.text_content('.page-current .ffsaldos-titulo'), 'falta «Previsão» no mês futuro')
    saldos = await app.saldos()
    verificar(saldos.get('Principal') == '630,00 €', f'previsão de outubro (com os agendados): {saldos}')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_recorrente_agendado_nos_recorrentes(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(400)
    await p.click('.segmented button:text-is("Recorrentes")'); await p.wait_for_timeout(500)
    rec = await p.evaluate("""[...document.querySelectorAll('.page-current .transaction-list article')].map(a=>
      [a.querySelector('h3').textContent, a.querySelector('.ffrec-dir small').textContent])""")
    verificar(rec == [['Renda', 'Agendado']], f'a renda de 30/09 ainda não saiu do saldo: {rec}')
    resumo = await p.evaluate("[...document.querySelectorAll('.page-current .summary-grid article strong')].map(e=>e.textContent.replace(/\\u00a0/g,' '))")
    verificar(resumo[:2] == ['0,00 €', '300,00 €'], f'pago / falta: {resumo}')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_calendario_dias_agendados(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('calendario')"); await p.wait_for_timeout(600)
    dia = lambda n: p.locator('.page-current .calendar-day').nth(n - 1)
    classes30 = await dia(30).get_attribute('class') or ''
    verificar('ffcal-futuro' in classes30 and 'ffcal-q' not in classes30, f'dia 30 (renda agendada): {classes30}')
    verificar('ffcal-q' in (await dia(20).get_attribute('class') or ''), 'dia 20 (já gasto) mantém a cor do mapa de calor')
    verificar('Agendado' in (await p.text_content('.page-current .ffcal-calor') or ''), 'falta «Agendado» na legenda')
    verificar('dia mais caro: 20' in (await p.text_content('.page-current .ffcal-resumo') or ''), 'o dia mais caro não pode ser um agendado')
    verificar(not app.erros, f'erros: {app.erros}')
