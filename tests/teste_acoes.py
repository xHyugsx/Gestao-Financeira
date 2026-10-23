"""Movimentos: «Desfazer» ao apagar, ações rápidas no toque longo (editar, duplicar, apagar), valores ocultos desfocados e vibração."""
from correr import verificar

M = lambda i, d, t, v, **x: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'x · Outros', 'movementType': 'expense', **x}
DADOS = {'transactions': [M(1, '2026-09-20', 'Padaria', -3), M(2, '2026-09-10', 'Cinema', -12), M(3, '2026-09-05', 'Livraria', -20)]}
TITULOS = "[...document.querySelectorAll('.page-current .transaction-list article h3')].map(e=>e.textContent)"
LINHA = '.page-current .transaction-list article[aria-label="Editar {}"]'


async def t_apagar_com_desfazer(app):
    await app.abrir(DADOS)
    p = app.page
    dialogos = []
    p.on('dialog', lambda d: dialogos.append(d.message))
    await p.click(LINHA.format('Cinema')); await p.wait_for_timeout(500)
    await p.click('[role=dialog] button:has-text("Eliminar")'); await p.wait_for_timeout(500)
    verificar(not dialogos, f'já não pede confirmação antes: {dialogos}')
    verificar([m['id'] for m in await app.movimentos()] == [1, 3], 'o movimento devia ser apagado logo')
    aviso = (await p.text_content('.ffdesfazer') or '').strip()
    verificar('«Cinema» apagado' in aviso and 'Desfazer' in aviso, f'aviso: {aviso}')
    await p.click('.ffdesfazer button'); await p.wait_for_timeout(500)
    verificar([m['id'] for m in await app.movimentos()] == [1, 2, 3], 'desfazer devia repor o movimento no mesmo sítio')
    verificar(await p.evaluate(TITULOS) == ['Padaria', 'Cinema', 'Livraria'], 'a lista devia voltar a ter o Cinema')
    verificar(not await p.query_selector('.ffdesfazer'), 'o aviso devia fechar ao desfazer')
    # o aviso desaparece sozinho ao fim de 5 s
    await p.click(LINHA.format('Livraria')); await p.wait_for_timeout(500)
    await p.click('[role=dialog] button:has-text("Eliminar")'); await p.wait_for_timeout(5600)
    verificar(not await p.query_selector('.ffdesfazer'), 'o aviso devia desaparecer ao fim de 5 s')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_toque_longo_e_acoes_rapidas(app):
    await app.abrir(DADOS)
    p = app.page
    # toque longo: o toque que se segue não abre a edição
    await p.evaluate("""async sel => {
      const el = document.querySelector(sel), r = el.getBoundingClientRect(), x = r.x + 40, y = r.y + 20;
      const t = [new Touch({identifier: 1, target: el, clientX: x, clientY: y})];
      el.dispatchEvent(new TouchEvent('touchstart', {bubbles: true, touches: t, changedTouches: t}));
      await new Promise(r => setTimeout(r, 650));
      el.dispatchEvent(new TouchEvent('touchend', {bubbles: true, touches: [], changedTouches: t}));
      el.click();
    }""", LINHA.format('Padaria'))
    await p.wait_for_timeout(500)
    titulos = await p.evaluate("[...document.querySelectorAll('[role=dialog] h2')].map(e=>e.textContent)")
    verificar(titulos == ['Padaria'], f'devia abrir só as ações rápidas: {titulos}')
    botoes = await p.evaluate("[...document.querySelectorAll('.ffacoes-lista button')].map(b=>b.textContent)")
    verificar(botoes == ['Editar', 'Duplicar para hoje', 'Apagar'], f'ações: {botoes}')
    await p.click('.ffacoes-lista button:has-text("Duplicar")'); await p.wait_for_timeout(600)
    ms = await app.movimentos()
    copia = ms[0]
    verificar(len(ms) == 4 and copia['title'] == 'Padaria' and copia['date'] == '2026-09-28' and copia['id'] != 1, f'cópia de hoje: {copia}')
    verificar('duplicado para hoje' in (await p.text_content('.ffdesfazer') or ''), 'falta o aviso da cópia')
    await p.click('.ffdesfazer button'); await p.wait_for_timeout(400)
    verificar(len(await app.movimentos()) == 3, 'desfazer devia tirar a cópia')
    # botão direito / toque longo do Android (contextmenu) → Editar
    await p.locator(LINHA.format('Livraria')).dispatch_event('contextmenu'); await p.wait_for_timeout(500)
    await p.click('.ffacoes-lista button:has-text("Editar")'); await p.wait_for_timeout(700)
    verificar(await p.evaluate("[...document.querySelectorAll('[role=dialog] h2')].map(e=>e.textContent)") == ['Editar movimento'], 'devia abrir a edição')
    verificar(await p.input_value('[role=dialog] input[name=title]') == 'Livraria', 'editar o movimento certo')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_valores_ocultos_desfocados(app):
    await app.abrir(DADOS)
    p = app.page
    await p.click('[aria-label="Ocultar valores"]'); await p.wait_for_timeout(500)
    ocultos = await p.evaluate("[...document.querySelectorAll('.ffoculto')].map(e=>e.textContent)")
    verificar(len(ocultos) >= 4 and all('••••••' in t and not any(c.isdigit() for c in t) for t in ocultos), f'valores desfocados sem números reais: {ocultos}')
    verificar(await p.evaluate("getComputedStyle(document.querySelector('.ffoculto')).webkitTextFillColor") == 'rgba(0, 0, 0, 0)', 'falta o desfocado')
    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(900)
    verificar(await p.query_selector('.page-current .ffoculto'), 'também nas outras páginas')
    await p.click('[aria-label="Mostrar valores"]'); await p.wait_for_timeout(400)
    verificar(not await p.query_selector('.ffoculto'), 'ao mostrar os valores, sai o desfocado')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_vibracao_curta(app):
    await app.page.add_init_script("window.ffVib = []; navigator.vibrate = (p) => { window.ffVib.push(p); return true; };")
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(900)
    await p.evaluate("window.ffVib = []")
    await p.click('.page-current .segmented button:text-is("Receitas")'); await p.wait_for_timeout(200)
    await p.click('button[aria-label="Mês anterior"]'); await p.wait_for_timeout(200)
    verificar(await p.evaluate("window.ffVib") == [8, 8], f'vibração curta ao trocar de separador e de mês: {await p.evaluate("window.ffVib")}')
    await p.click('.page-current .segmented button:text-is("Receitas")'); await p.wait_for_timeout(200)
    verificar(await p.evaluate("window.ffVib.length") == 2, 'tocar na opção já escolhida não vibra')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_sem_vibracao_quando_desligada(app):
    await app.page.add_init_script("window.ffVib = []; navigator.vibrate = (p) => { window.ffVib.push(p); return true; };")
    await app.abrir({**DADOS, 'appearance': {'haptics': False}})
    p = app.page
    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(900)
    await p.click('.page-current .segmented button:text-is("Receitas")'); await p.wait_for_timeout(200)
    await p.click('button[aria-label="Mês anterior"]'); await p.wait_for_timeout(200)
    verificar(await p.evaluate("window.ffVib") == [], f'com a vibração desligada não vibra: {await p.evaluate("window.ffVib")}')
