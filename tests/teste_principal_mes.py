"""Principal: a lista mostra só os movimentos do mês escolhido (por omissão, o mês atual), também em «Ver todas» e na pesquisa."""
from correr import verificar

M = lambda i, d, t, v: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': 'x · Outros', 'movementType': 'expense'}
DADOS = {'transactions': [M(1, '2026-09-03', 'Padaria', -3), M(2, '2026-09-20', 'Supermercado', -50), M(3, '2026-08-25', 'Livraria', -20),
                          M(4, '2026-09-30', 'Renda', -300), M(5, '2026-10-05', 'Ginásio', -20)]}
TITULOS = "[...document.querySelectorAll('.page-current .transaction-list article h3')].map(e=>e.textContent)"


async def t_so_os_movimentos_do_mes(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    verificar(await p.evaluate(TITULOS) == ['Supermercado', 'Padaria'], f'setembro (mês atual): {await p.evaluate(TITULOS)}')
    resumo = (await p.text_content('.page-current .ffagendados-resumo') or '').strip()
    verificar('1 agendado · próximo: Renda, 30 setembro' in resumo, f'só os agendados deste mês: {resumo}')

    await p.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Ver todas').click()"); await p.wait_for_timeout(400)
    verificar(await p.evaluate(TITULOS) == ['Renda', 'Supermercado', 'Padaria'], f'«Ver todas» só com setembro: {await p.evaluate(TITULOS)}')
    await p.fill('.page-current .tx-search input', 'Livraria'); await p.wait_for_timeout(300)
    vazio = (await p.text_content('.page-current .tx-search-empty') or '').strip()
    verificar(vazio == 'Sem resultados para «Livraria» em setembro.', f'a pesquisa procura só no mês: {vazio}')
    await p.fill('.page-current .tx-search input', ''); await p.wait_for_timeout(200)
    await p.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Ver menos').click()"); await p.wait_for_timeout(300)

    await p.click('button[aria-label="Mês anterior"]'); await p.wait_for_timeout(500)
    verificar(await p.evaluate(TITULOS) == ['Livraria'], f'agosto: {await p.evaluate(TITULOS)}')
    verificar(not await p.query_selector('.page-current .ffagendados-resumo'), 'agosto não tem agendados')
    await p.click('button[aria-label="Mês anterior"]'); await p.wait_for_timeout(500)
    vazio = (await p.text_content('.page-current .tx-search-empty') or '').strip()
    verificar(vazio == 'Sem movimentos em julho.', f'mês sem movimentos: {vazio}')

    for _ in range(3):
        await p.click('button[aria-label="Mês seguinte"]'); await p.wait_for_timeout(400)
    verificar(await p.evaluate(TITULOS) == [], f'outubro ainda não tem movimentos feitos: {await p.evaluate(TITULOS)}')
    resumo = (await p.text_content('.page-current .ffagendados-resumo') or '').strip()
    verificar('1 agendado · próximo: Ginásio, 5 outubro' in resumo, f'agendados de outubro: {resumo}')
    verificar(not app.erros, f'erros: {app.erros}')
