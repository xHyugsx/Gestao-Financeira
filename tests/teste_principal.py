"""Página Principal (só o rendimento no círculo, que muda no dia do ordenado; sem caixas das contas; frase do dia) e gastos por conta na Análise."""
from correr import verificar

SAL = {'2026': {'Pessoa A': [1500] * 12, 'Pessoa B': [1000] * 12}}
MOV = lambda i, t, v, d, cat, **x: {'id': i, 'title': t, 'amount': v, 'date': f'2026-09-{d:02d}', 'detail': f'{d} setembro · {cat}',
                                     'movementType': 'expense' if v < 0 else 'income', **x}
CONTAS = [{'id': 'principal', 'name': 'Principal', 'balance': 1000}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 200},
          {'id': 'ed', 'name': 'Cartão refeição', 'balance': 90}]
DADOS = {'salaries': SAL, 'accounts': CONTAS, 'transactions': [
    MOV(1, 'Renda', -600, 1, 'Habitação'), MOV(2, 'Poupança mensal', -300, 2, 'Poupança'), MOV(3, 'Mercado', -100, 20, 'Alimentação'),
    MOV(4, 'Reembolso', 50, 10, 'Reembolsos'), MOV(5, 'Almoço', -30, 21, 'Alimentação', account='ed'),
    MOV(6, 'Farmácia', -20, 22, 'Saúde', account='revolut'), {**MOV(7, 'Mercado', -80, 5, 'Alimentação', account='revolut'), 'date': '2026-08-05'}]}
TEXTO = lambda s: f"(document.querySelector('{s}')?.textContent||'').replace(/\\u00a0/g,' ')"


async def t_circulo_so_com_o_rendimento_sem_caixas(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    # 28/09/2026 é o dia do ordenado (3.º dia útil a contar do fim do mês) e os salários de setembro já estão registados
    verificar(await p.evaluate(TEXTO('.ffhero-ring p')) == 'Rendimento de outubro', await p.evaluate(TEXTO('.ffhero-ring p')))
    verificar(await p.evaluate(TEXTO('.ffhero-ring strong')) == '2500,00 €', f'rendimento: {await p.evaluate(TEXTO(".ffhero-ring strong"))}')
    verificar(not await p.query_selector('.ffhero-arco, .ffhero-legenda, .ffhero-sub'), 'o círculo ainda mostra o disponível')
    cor = await p.evaluate("getComputedStyle(document.querySelector('.ffhero-ring strong')).color")
    verificar(cor == 'rgb(244, 241, 255)', f'o valor do rendimento tem cor de subida/descida: {cor}')
    verificar('amount-positive' in await p.evaluate("document.querySelector('.ffhero-ring span').className"), 'a percentagem perdeu a cor')
    verificar(not await p.query_selector('.balance-panel, .current-panel, .account-extra-panel'), 'as caixas das contas voltaram à página principal')


async def t_frase_do_dia(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    verificar(await p.evaluate(TEXTO('.ffdica p')), 'falta a frase do dia')
    await p.click('button[aria-label="Ocultar valores"]'); await p.wait_for_timeout(300)
    verificar(not await p.query_selector('.ffdica'), 'a frase do dia aparece com os valores ocultos')
    await p.click('button[aria-label="Mostrar valores"]'); await p.click('[aria-label="Mês anterior"]'); await p.wait_for_timeout(400)
    verificar(not await p.query_selector('.ffdica'), 'frase do dia num mês passado')


async def t_sem_saldos_das_contas(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    for pagina in ('principal', 'resumo', 'analise'):
        await p.evaluate(f"window.ffGoPg('{pagina}')"); await p.wait_for_timeout(700)
        texto = await p.inner_text('.page-current')
        verificar('Saldo' not in texto.replace('Saldo antes de', ''), f'{pagina} ainda mostra saldos: {texto[:200]}')
    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(500)
    verificar('saldo' not in (await p.inner_text('[role=dialog]')).lower(), 'o novo movimento ainda fala do saldo')
    verificar(await p.query_selector('[role=dialog] select[name=account]'), 'a escolha da conta tem de continuar')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_analise_mostra_gastos_por_conta(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(1200)
    linhas = await p.evaluate("""[...document.querySelectorAll('.ffcontas .chart-legend > div')].map(d=>[...d.children].slice(1,5).map(e=>e.textContent.replace(/\\u00a0/g,' ')))""")
    verificar(linhas == [['Principal', '1000,00 €', '95,2%', ''], ['Cartão refeição', '30,00 €', '2,9%', ''], ['Revolut Conjunta', '20,00 €', '1,9%', '↓ 75%']],
              f'gastos por conta: {linhas}')
    await p.click('.segmented button:text-is("Receitas")'); await p.wait_for_timeout(300)
    verificar(not await p.query_selector('.ffcontas'), 'gastos por conta no separador das receitas')


async def t_evolucao_mostra_os_meses_todos_numa_linha(app):
    """O gráfico «Evolução de gastos» tinha espaço para 9 meses: a partir de outubro os meses saltavam para outra linha."""
    await app.page.clock.set_system_time('2026-12-15T12:00:00Z')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(1000)
    topos = await p.evaluate("[...document.querySelectorAll('.page-current .bar-chart > div')].map(d=>Math.round(d.getBoundingClientRect().top))")
    verificar(len(topos) == 12 and len(set(topos)) == 1, f'meses fora da linha: {topos}')


async def t_circulo_muda_no_dia_do_ordenado(app):
    await app.page.emulate_media(reduced_motion='reduce')
    sal = {'2026': {'Pessoa A': [1500] * 8 + [1800, 0, 0, 0], 'Pessoa B': [1000] * 12}}
    await app.page.clock.set_system_time('2026-09-27T11:00:00Z')
    await app.abrir({'salaries': sal})
    p = app.page
    rotulo = lambda: p.evaluate(TEXTO('.ffhero-ring p'))
    valor = lambda: p.evaluate(TEXTO('.ffhero-ring strong'))
    verificar(await rotulo() == 'Rendimento mensal' and await valor() == '2500,00 €', f'na véspera, o rendimento de setembro: {await rotulo()} {await valor()}')
    await p.clock.set_system_time('2026-09-28T08:00:00Z')
    await p.reload(); await p.wait_for_timeout(1800)
    verificar(await rotulo() == 'Rendimento de outubro' and await valor() == '2800,00 €', f'no dia do ordenado, o de outubro: {await rotulo()} {await valor()}')
    await p.click('[aria-label="Mês anterior"]'); await p.wait_for_timeout(500)
    verificar(await rotulo() == 'Rendimento mensal' and await valor() == '2500,00 €', f'agosto continua igual: {await rotulo()} {await valor()}')
    verificar(not app.erros, f'erros: {app.erros}')
