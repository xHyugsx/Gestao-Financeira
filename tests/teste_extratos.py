from correr import verificar

MANUAL = {'transactions': [{'id': 1, 'title': 'Mercado', 'amount': -12.3, 'date': '2026-09-20', 'detail': '20 setembro · Alimentação', 'movementType': 'expense'}]}


async def anexar(app, ficheiro):
    p = app.page
    await p.click('.jarvis-fab'); await p.wait_for_timeout(400)
    await p.set_input_files('.jarvis-attach input', ficheiro); await p.wait_for_timeout(1500)


async def t_le_xlsx_e_abre_revisao(app):
    await app.abrir(MANUAL)
    await anexar(app, 'tests/dados/extrato_ficticio.xlsx')
    resumo = await app.page.evaluate("document.querySelector('.ffst-hd>p')?.textContent||''")
    verificar(resumo.startswith('12 movimentos'), f'resumo inesperado: {resumo}')


async def t_le_csv(app):
    await app.abrir()
    await anexar(app, 'tests/dados/extrato_ficticio.csv')
    resumo = await app.page.evaluate("document.querySelector('.ffst-hd>p')?.textContent||''")
    verificar(resumo.startswith('12 movimentos'), f'resumo inesperado: {resumo}')


async def t_duplicado_fica_desmarcado(app):
    await app.abrir(MANUAL)
    await anexar(app, 'tests/dados/extrato_ficticio.xlsx')
    d = await app.page.evaluate("[...document.querySelectorAll('.ffst-row')].filter(r=>/Possível duplicado/.test(r.textContent)).map(r=>r.classList.contains('off'))")
    verificar(d == [True], f'duplicado não detetado: {d}')


async def t_importar_nao_mexe_no_saldo_e_desfazer(app):
    await app.abrir(MANUAL)
    await anexar(app, 'tests/dados/extrato_ficticio.xlsx')
    p = app.page
    antes = await p.evaluate("window.ffImpApi.get().acc[0].cur")
    await p.click('.ffst-go'); await p.wait_for_timeout(900)
    m = await app.movimentos(); imp = [x for x in m if x.get('importBatch')]
    verificar(len(imp) == 9, f'importou {len(imp)} (esperado 9)')
    verificar(all(x.get('affectsBalance') is False for x in imp), 'movimentos importados alteram o saldo')
    verificar(await p.evaluate("window.ffImpApi.get().acc[0].cur") == antes, 'saldo mudou com a importação')
    r = await app.jarvis('desfazer importação')
    verificar('anulada' in r and len(await app.movimentos()) == 1, r)


async def t_reimportar_ignora_ja_importados(app):
    await app.abrir(MANUAL)
    await anexar(app, 'tests/dados/extrato_ficticio.xlsx')
    await app.page.click('.ffst-go'); await app.page.wait_for_timeout(900)
    await app.page.set_input_files('.jarvis-attach input', 'tests/dados/extrato_ficticio.xlsx'); await app.page.wait_for_timeout(1500)
    resumo = await app.page.evaluate("document.querySelector('.ffst-hd>p').textContent")
    verificar('9 já importados antes' in resumo, resumo)
