"""Resumo › Recorrentes: pago e por pagar no mês, subida de preço, custo anual e abrir o movimento."""
from correr import verificar

R = lambda i, d, t, v, **x: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': 'x', 'movementType': 'expense', 'recurring': 'com', **x}
DADOS = {'transactions': [
    R(1, '2026-08-01', 'Renda', -600), R(2, '2026-09-01', 'Renda', -600),
    R(3, '2026-08-10', 'Streaming', -10), R(4, '2026-09-10', 'Streaming', -12),
    R(5, '2026-08-30', 'Internet', -40),
    R(6, '2026-06-15', 'Seguro', -90, recurringEvery=3)]}


async def t_recorrentes_do_mes(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(400)
    await p.click('.segmented button:text-is("Recorrentes")'); await p.wait_for_timeout(500)
    linhas = await p.evaluate("""[...document.querySelectorAll('.page-current .transaction-list article')].map(a=>
      [a.querySelector('h3').textContent, a.querySelector('.ffrec-dir small').textContent])""")
    # o Seguro tem periodicidade: a app cria sozinha a cópia de 15 de setembro, por isso aparece como pago
    verificar(linhas == [['Renda', 'Pago'], ['Streaming', 'Pago'], ['Seguro', 'Pago'], ['Internet', 'Por pagar']], f'linhas: {linhas}')
    resumo = await p.evaluate("[...document.querySelectorAll('.page-current .summary-grid article strong')].map(e=>e.textContent.replace(/\\u00a0/g,' '))")
    verificar(resumo[:2] == ['702,00 €', '40,00 €'], f'pago / falta: {resumo}')
    verificar(resumo[2] == '8184,00 €', f'anual (600×12 + 12×12 + 40×12 + 90×4): {resumo}')
    verificar('20%' in await p.text_content('.page-current .ffrec-subiu'), 'falta a subida de preço do Streaming')
    await p.click('.page-current article[aria-label="Editar Renda"]'); await p.wait_for_timeout(500)
    verificar(await p.query_selector('[role=dialog] input[name=title]'), 'tocar num recorrente não abriu o movimento')
