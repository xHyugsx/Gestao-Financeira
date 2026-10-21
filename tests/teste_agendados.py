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
    etiquetas = await p.evaluate("""Object.fromEntries([...document.querySelectorAll('.page-current .transaction-list article')]
      .map(a=>[a.querySelector('h3').textContent, !!a.querySelector('.ffagendado')]))""")
    verificar(etiquetas.get('Renda') is True and etiquetas.get('Supermercado') is False, f'etiqueta «Agendado»: {etiquetas}')
    saldos = await app.saldos()
    verificar(saldos.get('Principal') == '950,00 €', f'hoje (28/09) só conta o Supermercado: {saldos}')
    await p.click('button[aria-label="Mês seguinte"]'); await p.wait_for_timeout(600)
    verificar('Previsão para o fim de outubro' in await p.text_content('.page-current .ffsaldos-titulo'), 'falta «Previsão» no mês futuro')
    saldos = await app.saldos()
    verificar(saldos.get('Principal') == '630,00 €', f'previsão de outubro (com os agendados): {saldos}')
    verificar(not app.erros, f'erros: {app.erros}')
