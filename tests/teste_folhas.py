"""Janelas de registo como folha inferior: sobe do fundo, pega para arrastar e fechar, por cima do teclado; as confirmações continuam ao centro."""
from correr import verificar

DADOS = {'transactions': [{'id': 1, 'title': 'Padaria', 'amount': -3, 'date': '2026-09-03', 'detail': 'x · Outros', 'movementType': 'expense'}]}

ARRASTAR = """async dy => {
  const el = document.querySelector('.fffolha-pega'), r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
  const t = (yy) => [new Touch({identifier: 1, target: el, clientX: x, clientY: yy})];
  el.dispatchEvent(new TouchEvent('touchstart', {bubbles: true, touches: t(y), changedTouches: t(y)}));
  for (let k = 1; k <= 5; k++) el.dispatchEvent(new TouchEvent('touchmove', {bubbles: true, touches: t(y + dy * k / 5), changedTouches: t(y + dy * k / 5)}));
  el.dispatchEvent(new TouchEvent('touchend', {bubbles: true, touches: [], changedTouches: t(y + dy)}));
}"""


async def t_novo_movimento_em_folha(app):
    await app.abrir(DADOS)
    p = app.page
    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(600)
    caixa = await p.evaluate("(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return [Math.round(r.bottom), Math.round(r.width), innerHeight, innerWidth]})()")
    verificar(caixa[0] == caixa[2] and caixa[1] == caixa[3], f'a folha devia encostar ao fundo e ocupar a largura: {caixa}')
    verificar(await p.query_selector('[role=dialog] .fffolha-pega'), 'falta a pega da folha')
    await p.evaluate(ARRASTAR, 40); await p.wait_for_timeout(400)
    verificar(await p.query_selector('[role=dialog]'), 'um arrasto curto não devia fechar')
    await p.evaluate(ARRASTAR, 160); await p.wait_for_timeout(600)
    verificar(not await p.query_selector('[role=dialog]'), 'arrastar a pega para baixo devia fechar a folha')
    await app.novo_movimento('Mercearia', '7')
    verificar(any(m['title'] == 'Mercearia' for m in await app.movimentos()), 'gravar na folha devia funcionar como antes')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_editar_em_folha_e_confirmacoes_ao_centro(app):
    await app.abrir({'transactions': [{'id': 1, 'title': 'Luz', 'amount': -40, 'date': '2026-09-05', 'detail': 'x · Casa', 'movementType': 'expense', 'recurring': 'com', 'recurringEvery': 1}]})
    p = app.page
    await p.click('.page-current article[aria-label="Editar Luz"]'); await p.wait_for_timeout(600)
    verificar('fffolha' in (await p.get_attribute('[role=dialog]', 'class') or ''), 'editar devia abrir em folha')
    await p.click('[role=dialog] button:has-text("Eliminar")'); await p.wait_for_timeout(700)
    classes = await p.get_attribute('[role=dialog]', 'class') or ''
    verificar('ffapagar-serie' in classes and 'fffolha' not in classes, f'a pergunta sobre a série fica ao centro: {classes}')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_folha_por_cima_do_teclado(app):
    await app.abrir(DADOS)
    p = app.page
    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(600)
    # simula o teclado: o ecrã visível encolhe 300 px
    await p.evaluate("""(()=>{const v=window.visualViewport;Object.defineProperty(v,'height',{configurable:true,get:()=>innerHeight-300});v.dispatchEvent(new Event('resize'))})()""")
    await p.wait_for_timeout(200)
    fundo = await p.evaluate("Math.round(document.querySelector('[role=dialog]').getBoundingClientRect().bottom)")
    verificar(fundo == 844 - 300, f'a folha devia ficar por cima do teclado: {fundo}')
