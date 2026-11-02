"""Resumo (reformulação «Órbita», Etapa 3): o mês em números, o que se destaca, Fecho do Mês e Salários."""
from correr import verificar

M = lambda i, d, t, v, det, tipo='expense': {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': det, 'movementType': tipo}
DADOS = {
    'profile': {'members': ['Pessoa A', 'Pessoa B']},
    'salaries': {'2026': {'Pessoa A': [1000] * 8 + [0] * 4, 'Pessoa B': [800] * 8 + [0] * 4}},
    'transactions': [
        M(1, '2026-08-05', 'Mercado', -100, '5 agosto · Alimentação'), M(2, '2026-08-20', 'Renda', -500, '20 agosto · Casa'),
        M(3, '2026-09-02', 'Mercado', -250, '2 setembro · Alimentação'), M(4, '2026-09-03', 'Renda', -500, '3 setembro · Casa'),
        M(5, '2026-09-04', 'Salário Pessoa A', 1000, '4 setembro · Salário', 'income'), M(6, '2026-09-05', 'Reembolso', 50, '5 setembro · Reembolsos', 'income'),
        M(7, '2026-09-10', 'Gasolina', -60, '10 setembro · Combustível')]}
TEXTO = lambda sel: f"[...document.querySelectorAll('.page-current {sel}')].map(e=>e.innerText.replace(/\\u00a0/g,' ').replace(/\\s+/g,' ').trim())"


async def t_resumo_do_mes_e_destaques(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(800)
    verificar(await app.gastos() == '810,00 €', f'gastos de setembro: {await app.gastos()}')
    linha = (await p.evaluate(TEXTO('.ffres-linha')))[0]
    verificar(linha == '↑ 35% vs agosto 62% em Casa', f'comparação e maior categoria: {linha}')
    ideias = await p.evaluate(TEXTO('.ffideia p'))
    verificar(ideias[0] == 'Os gastos aumentaram 35% face a agosto — sobretudo em Alimentação (+150%).', ideias)
    verificar(ideias[1] == 'A maior categoria é Casa: 500,00 € (62% dos gastos).', ideias)
    verificar(ideias[2].startswith('25 dias sem despesas — o melhor foram 18 seguidos'), ideias)
    verificar(await p.locator('.page-current .ffrev-abrir .ffrev-stories i').count() == 5, 'falta a faixa do Ano em revista')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_fecho_do_mes_em_cascata(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(800)
    await p.click('.page-current .ffchips button:text-is("Fecho do Mês")'); await p.wait_for_timeout(600)
    saldo = (await p.evaluate(TEXTO('.fffecho-saldo')))[0]
    verificar(saldo == '240,00 €', f'1000 + 50 − 810: {saldo}')
    verificar('mês positivo' in (await p.evaluate(TEXTO('.fffecho-sub')))[0], 'devia dizer «mês positivo»')
    passos = await p.evaluate(TEXTO('.ffcascata > div'))
    verificar(passos == ['1000,00 € Rendimento', '+50,00 € Outras receitas', '−810,00 € Despesas', '240,00 € Resultado'], f'cascata: {passos}')
    # rendimento 1000 > despesas 810 > resultado 240 > outras 50
    alturas = await p.evaluate("[...document.querySelectorAll('.page-current .ffcascata-area i')].map(i=>Math.round(i.getBoundingClientRect().height))")
    verificar(alturas[0] > alturas[2] > alturas[3] > alturas[1], f'alturas: {alturas}')
    lista = await p.evaluate(TEXTO('.fffecho-lista > div'))
    verificar(lista == ['Despesas 810,00 €', '↳ das quais combustível 60,00 €', 'Poupança 0,00 €', 'Investimentos 0,00 €'], f'para onde foi: {lista}')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_salarios_por_pessoa(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(800)
    await p.click('.page-current .ffchips button:text-is("Salários")'); await p.wait_for_timeout(600)
    verificar((await p.evaluate(TEXTO('.ffsal-total')))[0] == '14 400,00 €', await p.evaluate(TEXTO('.ffsal-total')))
    verificar((await p.evaluate(TEXTO('.ffsal-media')))[0] == '1800,00 €', f'média dos meses com salário (14 400 / 8): {await p.evaluate(TEXTO(".ffsal-media"))}')
    pessoas = await p.evaluate(TEXTO('.ffsal-pessoa'))
    verificar(pessoas == ['PESSOA A 8000,00 €', 'PESSOA B 6400,00 €'], f'cartões: {pessoas}')
    cores = await p.evaluate("[...document.querySelectorAll('.page-current .ffsal-pessoa')].map(e=>e.style.getPropertyValue('--c'))")
    verificar(cores == ['oklch(68% .16 250)', 'oklch(76% .15 350)'], f'1.º azul, 2.º cor-de-rosa: {cores}')
    verificar(await p.locator('.page-current .ffsal-pessoa:first-child .ffsal-spark i.ffsal-zero').count() == 4, 'meses sem salário em cinzento')
    verificar((await p.evaluate(TEXTO('tr.ffsal-atual th')))[0] == 'Setembro', 'o mês escolhido fica realçado na tabela')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_valores_seguem_o_periodo(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(800)
    await p.click('.page-current .segmented button:text-is("Últimos 3 meses")'); await p.wait_for_timeout(500)
    verificar((await p.evaluate(TEXTO('.ffres-mes .ffbloco-rot')))[0].lower() == 'julho a setembro em números', await p.evaluate(TEXTO('.ffres-mes .ffbloco-rot')))
    verificar(await app.gastos() == '1410,00 €', f'agosto + setembro: {await app.gastos()}')
    verificar((await p.evaluate(TEXTO('.ffres-receitas')))[0] == '1050,00 €', 'receitas dos 3 meses')
    verificar(await p.locator('.page-current .ffres-linha .ffhero-var').count() == 0, 'sem gastos nos 3 meses antes, não há comparação')
    ideias = await p.evaluate(TEXTO('.ffideia p'))
    verificar(ideias[0] == 'A maior categoria é Casa: 1000,00 € (71% dos gastos).', ideias)
    verificar(ideias[1].startswith('85 dias sem despesas — o melhor foram 35 seguidos'), f'julho (31) + agosto (29) + setembro até hoje (25); 1/07 a 4/08 seguidos: {ideias}')
    await p.click('.page-current .segmented button:text-is("Este ano")'); await p.wait_for_timeout(500)
    verificar((await p.evaluate(TEXTO('.ffres-mes .ffbloco-rot')))[0].lower() == '2026 até setembro em números', await p.evaluate(TEXTO('.ffres-mes .ffbloco-rot')))
    verificar(await app.gastos() == '1410,00 €', f'janeiro a setembro: {await app.gastos()}')
    await p.click('.page-current .segmented button:text-is("Este mês")'); await p.wait_for_timeout(500)
    verificar(await app.gastos() == '810,00 €', 'de volta ao mês')
    verificar(not app.erros, f'erros: {app.erros}')
