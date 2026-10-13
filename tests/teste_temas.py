"""Temas (Definições › Aparência › Tema): aplicam-se à app, ficam gravados e não mexem no ecrã de bloqueio."""
import hashlib, json
from correr import verificar, PREFIXO

PIN = hashlib.sha256(b'financas-familiar:1234').hexdigest()
TEMA = "document.documentElement.dataset.tema || ''"


async def aparencia(app):
    p = app.page
    await p.click('button[aria-label="Definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-more'); await p.wait_for_timeout(400)
    await p.click('.settings-list .setting-row:has-text("Aparência")'); await p.wait_for_timeout(400)


async def t_escolher_tema(app):
    await app.abrir({'transactions': []})
    p = app.page
    await aparencia(app)
    nomes = await p.evaluate("[...document.querySelectorAll('.fftema strong')].map(e=>e.textContent)")
    verificar(nomes == ['Cósmico', 'Aurora', 'Pôr do sol', 'Noite dourada'], f'temas: {nomes}')
    verificar(await p.query_selector('.accent-options'), 'no Cósmico devia aparecer a cor de destaque')
    await p.click('.fftema-aurora'); await p.wait_for_timeout(400)
    verificar(await p.evaluate(TEMA) == 'aurora', 'o tema não foi aplicado')
    verificar(not await p.query_selector('.accent-options'), 'a cor de destaque só serve o tema Cósmico')
    dados = json.loads(await p.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO))
    verificar(dados['appearance'].get('theme') == 'aurora', f"não gravou: {dados['appearance']}")
    fonte = await p.evaluate("getComputedStyle(document.body).fontFamily")
    verificar('Outfit' in fonte, f'letra: {fonte}')
    verificar(await p.evaluate("document.fonts.load('16px Outfit').then(l=>l.length>0)"), 'a letra Outfit não carregou')
    await p.reload(); await p.wait_for_timeout(1500)
    verificar(await p.evaluate(TEMA) == 'aurora', 'o tema não ficou depois de reabrir')
    await aparencia(app)
    await p.click('.fftema-cosmico'); await p.wait_for_timeout(300)
    verificar(await p.evaluate(TEMA) == '', 'o Cósmico devia ser o aspeto original')


async def t_ecra_de_bloqueio_nao_muda(app):
    await app.abrir({'pinHash': PIN, 'appearance': {'accent': 'violet', 'backgroundIntensity': 75, 'fontScale': 100, 'haptics': True, 'autoHide': 'now', 'theme': 'dourado'}})
    p = app.page
    verificar(await p.query_selector('#ff-lock') and await p.evaluate(TEMA) == '', 'o ecrã de bloqueio ficou com o tema')
    await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    for k in '1234': await p.keyboard.press(k)
    await p.wait_for_timeout(1300)
    verificar(not await p.query_selector('#ff-lock') and await p.evaluate(TEMA) == 'dourado', 'depois de desbloquear o tema devia aplicar-se')
