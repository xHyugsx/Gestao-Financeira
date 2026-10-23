"""Cabeçalho compacto ao fazer scroll e estados vazios com o robô."""
from correr import verificar

M = lambda i, d, t, v: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': 'x · Outros', 'movementType': 'expense'}
DADOS = {'transactions': [M(i, f'2026-09-{(i % 27) + 1:02d}', f'Compra {i}', -i) for i in range(1, 30)]}


async def t_cabecalho_compacto(app):
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Ver todas').click()"); await p.wait_for_timeout(400)
    verificar(not await p.query_selector('.ffcompacto.on'), 'no topo, sem barra compacta')
    await p.evaluate("document.querySelector('.app-shell').scrollTo(0, 900)"); await p.wait_for_timeout(600)
    verificar(await p.query_selector('.ffcompacto.on'), 'ao fazer scroll devia aparecer a barra compacta')
    texto = await p.text_content('.ffcompacto')
    verificar('Principal' in texto and 'setembro 2026' in texto, f'barra: {texto}')
    await p.click('.ffcompacto [aria-label="Recuar um mês"]'); await p.wait_for_timeout(500)
    verificar('agosto' in (await p.text_content('.month-switcher span') or ''), 'as setas da barra mudam o mês')
    await p.evaluate("document.querySelector('.app-shell').scrollTo(0, 0)"); await p.wait_for_timeout(600)
    verificar(not await p.query_selector('.ffcompacto.on'), 'de volta ao topo, a barra sai')
    verificar(await p.evaluate("getComputedStyle(document.querySelector('.ffcompacto')).visibility") == 'hidden', 'escondida, não se pode tocar')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_estados_vazios_com_robo(app):
    await app.abrir({'transactions': []})
    p = app.page
    verificar(await p.query_selector('.page-current .ffvazio .ffrobo'), 'Principal vazia: falta o robô')
    verificar((await p.text_content('.page-current .tx-search-empty') or '').strip() == 'Sem movimentos em setembro.', 'o texto mantém-se')
    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(800)
    verificar(await p.query_selector('.page-current .ffvazio .ffrobo'), 'Análise vazia: falta o robô')
    await p.evaluate("window.ffGoPg('calendario')"); await p.wait_for_timeout(800)
    verificar(await p.query_selector('.page-current .calendar-empty-state .ffrobo'), 'Calendário: falta o robô no dia sem movimentos')
    await p.evaluate("window.ffGoPg('combustivel')"); await p.wait_for_timeout(800)
    verificar(await p.query_selector('.page-current .vet-empty .ffrobo'), 'Combustível vazio: falta o robô')
    verificar(not app.erros, f'erros: {app.erros}')
