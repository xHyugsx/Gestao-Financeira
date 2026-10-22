"""Menus: painel «Mais» (cascata, ícones com cor, arrastar para fechar), onda do botão «+» e brilho na linha acabada de gravar."""
from correr import verificar

DADOS = {'transactions': [{'id': 1, 'title': 'Padaria', 'amount': -3, 'date': '2026-09-03', 'detail': 'x · Outros', 'movementType': 'expense'}]}

ARRASTAR = """async dy => {
  const el = document.querySelector('.ffmore'), r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + 20;
  const t = (yy) => [new Touch({identifier: 1, target: el, clientX: x, clientY: yy})];
  el.dispatchEvent(new TouchEvent('touchstart', {bubbles: true, touches: t(y), changedTouches: t(y)}));
  for (let k = 1; k <= 5; k++) el.dispatchEvent(new TouchEvent('touchmove', {bubbles: true, touches: t(y + dy * k / 5), changedTouches: t(y + dy * k / 5)}));
  el.dispatchEvent(new TouchEvent('touchend', {bubbles: true, touches: [], changedTouches: t(y + dy)}));
}"""


async def t_painel_mais(app):
    await app.abrir(DADOS)
    p = app.page
    await p.click('.nav-item:has-text("Mais")'); await p.wait_for_timeout(500)
    cores = await p.evaluate("[...document.querySelectorAll('.ffmore-it .ffmore-ic')].map(e=>getComputedStyle(e).color)")
    verificar(len(cores) == 4 and len(set(cores)) == 4, f'cada página com a sua cor: {cores}')
    atrasos = await p.evaluate("[...document.querySelectorAll('.ffmore-it')].map(e=>getComputedStyle(e).animationDelay)")
    verificar(atrasos == ['0s', '0.045s', '0.09s', '0.135s'], f'as páginas deviam entrar em cascata: {atrasos}')
    await p.evaluate(ARRASTAR, 30); await p.wait_for_timeout(400)
    verificar(await p.query_selector('.ffmore'), 'um arrasto curto não devia fechar o painel')
    verificar(await p.evaluate("document.querySelector('.ffmore').style.transform") in ('', 'none'), 'o painel devia voltar ao sítio')
    await p.evaluate(ARRASTAR, 120); await p.wait_for_timeout(500)
    verificar(not await p.query_selector('.ffmore'), 'arrastar para baixo devia fechar o painel')
    await p.click('.nav-item:has-text("Mais")'); await p.wait_for_timeout(500)
    await p.click('.ffmore-it:has-text("Resumo")'); await p.wait_for_timeout(900)
    verificar(await p.inner_text('.app-heading h1') == 'Resumo', 'tocar numa página do painel devia abri-la')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_onda_do_mais_e_brilho_ao_gravar(app):
    await app.abrir(DADOS)
    p = app.page
    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(100)
    verificar(await p.query_selector('.ffplus .ffplus-onda'), 'tocar no «+» devia soltar uma onda')
    await p.fill('.movement-dialog input[name=title]', 'Mercearia'); await p.fill('.movement-dialog input[name=amount]', '7')
    await p.click('.movement-dialog button[type=submit]'); await p.wait_for_timeout(450)
    linha = '.page-current .transaction-list article[aria-label="Editar Mercearia"]'
    verificar('ffrealce' in (await p.get_attribute(linha, 'class') or ''), 'a linha nova devia brilhar')
    await p.wait_for_timeout(2000)
    verificar('ffrealce' not in (await p.get_attribute(linha, 'class') or ''), 'o brilho devia desaparecer')
    await p.click(linha); await p.wait_for_timeout(500)
    await p.fill('[role=dialog] input[name=amount]', '8'); await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(450)
    verificar('ffrealce' in (await p.get_attribute(linha, 'class') or ''), 'a linha editada também devia brilhar')
    verificar(not app.erros, f'erros: {app.erros}')
