"""Análise: gráfico circular em SVG (tocar destaca a fatia), cores distintas, setas agrupadas, barras com valor e médias neutras."""
from correr import verificar

M = lambda i, d, t, v, cat: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'x · {cat}', 'movementType': 'expense'}
DADOS = {'categories': ['Alimentação', 'Lazer', 'Restaurantes', 'Casa', 'Saúde', 'Educação'],
         'categoryColors': {'Lazer': 'violet', 'Restaurantes': 'violet'},
         'transactions': [
    M(1, '2026-09-03', 'Continente', -300, 'Alimentação'), M(2, '2026-09-10', 'Cinema', -100, 'Lazer'),
    M(3, '2026-09-12', 'Jantar', -80, 'Restaurantes'), M(4, '2026-09-15', 'Renda', -500, 'Casa'),
    M(5, '2026-09-20', 'Farmácia', -12, 'Saúde'), M(6, '2026-09-21', 'Livro', -8, 'Educação'),
    M(7, '2026-08-08', 'Continente', -250, 'Alimentação')]}


async def abrir_analise(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    await app.page.evaluate("window.ffGoPg('analise')"); await app.page.wait_for_timeout(700)


async def t_donut_destaca_a_fatia_tocada(app):
    await abrir_analise(app)
    p = app.page
    fatias = await p.evaluate("[...document.querySelectorAll('.page-current .ffdonut path')].map(e=>e.getAttribute('fill'))")
    verificar(len(fatias) == 6, f'uma fatia por categoria com gastos: {fatias}')
    verificar(len(set(fatias)) == 6, f'as fatias não podem repetir cores: {fatias}')
    centro = lambda: p.evaluate("document.querySelector('.page-current .donut > div').innerText.replace(/\\u00a0/g,' ')")
    verificar('1000,00 €' in await centro(), 'o centro devia mostrar o total')
    await p.locator('.page-current .ffdonut path').nth(1).dispatch_event('click'); await p.wait_for_timeout(300)
    texto = await centro()
    verificar('300,00 €' in texto and 'Alimentação' in texto and '30%' in texto, f'centro com a fatia tocada: {texto}')
    verificar(await p.locator('.page-current .ffdonut-legenda .ffdestaque').inner_text() != '', 'a legenda devia destacar a mesma categoria')
    await p.click('.page-current .ffdonut-legenda > div:has-text("Lazer")'); await p.wait_for_timeout(300)
    verificar('Lazer' in await centro(), 'tocar na legenda devia destacar a categoria')
    await p.click('.page-current .ffdonut-legenda > div:has-text("Lazer")'); await p.wait_for_timeout(300)
    verificar('1000,00 €' in await centro(), 'tocar de novo devia voltar ao total')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_legenda_ao_lado_junta_as_fatias_pequenas(app):
    await abrir_analise(app)
    textos = await app.page.evaluate("[...document.querySelectorAll('.page-current .ffdonut-lado li')].map(e=>e.innerText.replace(/\\s+/g,' '))")
    verificar(not await app.page.query_selector('.page-current .donut-callouts'), 'as setas do circular saíram (legenda ao lado)')
    verificar(any(t.startswith('Outras') for t in textos) and not any(t.startswith(('Saúde', 'Educação')) for t in textos), f'Saúde e Educação (<5%) deviam ir para «Outras»: {textos}')
    verificar('Outras 2%' in textos, f'«Outras» com 2%: {textos}')


async def t_barras_mostram_o_valor_e_medias_neutras(app):
    await abrir_analise(app)
    p = app.page
    barras = p.locator('.page-current .bar-chart > div')
    verificar('ffbarra-atual' in (await barras.nth(8).get_attribute('class') or ''), 'setembro (mês escolhido) devia estar realçado')
    await barras.nth(7).click(); await p.wait_for_timeout(200)
    valor = (await p.inner_text('.page-current .ffbarra-valor')).replace('\xa0', ' ')
    verificar(valor == '250,00 €', f'valor de agosto: {valor}')
    await barras.nth(7).click(); await p.wait_for_timeout(200)
    verificar(not await p.query_selector('.page-current .ffbarra-valor'), 'tocar de novo devia esconder o valor')
    cor = await p.evaluate("""[...document.querySelectorAll('.page-current .ffmedias strong')].map(e=>getComputedStyle(e).color)""")
    neutra = await p.evaluate("getComputedStyle(document.querySelector('.page-current .ffmedias p').closest('main')).color")
    verificar(len(cor) == 2 and all(c == neutra for c in cor), f'médias na cor do texto: {cor} vs {neutra}')
    await p.click('.page-current .segmented button:text-is("Diário")'); await p.wait_for_timeout(300)
    await p.locator('.page-current .bar-chart > div').nth(14).click(); await p.wait_for_timeout(200)
    valor = (await p.inner_text('.page-current .ffbarra-valor')).replace('\xa0', ' ')
    verificar(valor == '15 set · 500,00 €', f'valor do dia 15: {valor}')
    verificar('ffbarra-atual' in (await p.locator('.page-current .bar-chart > div').nth(27).get_attribute('class') or ''), 'hoje (28) devia estar realçado')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_diario_com_calor_e_barra_cortada(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir({'transactions': [M(1, '2026-09-01', 'Renda', -600, 'Casa'), M(2, '2026-09-05', 'Mercado', -40, 'Alimentação'), M(3, '2026-09-09', 'Café', -20, 'Lazer')]})
    p = app.page
    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(700)
    await p.click('.page-current .segmented button:text-is("Diário")'); await p.wait_for_timeout(400)
    classes = await p.evaluate("[...document.querySelectorAll('.page-current .bar-chart > div')].map(d=>d.className)")
    verificar('ffbarra-cortada' in classes[0] and 'ffbarra-q' in classes[0], f'dia 1 muito acima dos outros: barra cortada e com cor: {classes[0]}')
    verificar('ffbarra-cortada' not in classes[4] and 'ffbarra-q' in classes[4] and 'ffbarra-q' not in classes[1], f'outros dias: {classes[4]} | {classes[1]}')
    altura = await p.evaluate("document.querySelector('.page-current .bar-chart > div:nth-child(5) > i').style.height")
    verificar(float(altura.rstrip('%')) > 50, f'com o corte, o dia 5 deixa de ficar raso: {altura}')
    resumos = await p.evaluate("[...document.querySelectorAll('.page-current .ffresumos-dia .ffbloco-rot')].map(e=>e.textContent)")
    verificar(resumos == ['Média diária', 'Sem o dia 1'], f'resumos: {resumos}')
    dias = await p.evaluate("[...document.querySelectorAll('.page-current .ffdias-analise .ffdia b')].map(e=>e.textContent)")
    verificar(dias == ['Quarta, 9', 'Sábado, 5', 'Terça, 1'], f'dias com o ponto: {dias}')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_contas_numa_barra_dividida(app):
    await abrir_analise(app)
    verificar(await app.page.locator('.page-current .ffresumo-mes').count() == 1, 'falta o cartão-resumo do mês')
    verificar('vs agosto' in (await app.page.text_content('.page-current .ffresumo-mes .ffhero-var') or ''), 'comparação com o mês anterior no cartão')
    verificar(not await app.page.query_selector('.page-current .ffcontas') or await app.page.locator('.page-current .ffcontas .ffpilha i').count() >= 1, 'barra dividida das contas')
