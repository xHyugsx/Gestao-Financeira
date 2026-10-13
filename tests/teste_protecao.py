"""Proteção dos dados: armazenamento persistente (o Android não apaga os dados) e backup protegido com palavra-passe."""
import json, pathlib, tempfile
from correr import verificar, PREFIXO

MOV = lambda i, t, v: {'id': i, 'title': t, 'amount': v, 'date': '2026-09-20', 'detail': '20 setembro · Alimentação', 'movementType': 'expense'}
DADOS = {'transactions': [MOV(1, 'Mercado Fictício', -12.3), MOV(2, 'Padaria Fictícia', -3.4)]}


async def definicoes(app, linha):
    p = app.page
    await p.click('button[aria-label="Definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-more'); await p.wait_for_timeout(400)
    await p.click(f'.settings-list .setting-row:has-text("{linha}")'); await p.wait_for_timeout(400)


async def movimentos(app):
    return [m['title'] for m in json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}').get('transactions', [])]


async def t_backup_protegido_cria_e_restaura(app):
    await app.abrir(DADOS)
    p = app.page
    await definicoes(app, 'Backup')
    await p.click('.setting-row:has-text("Criar backup protegido")'); await p.wait_for_timeout(200)
    await p.fill('.ffv2-senha [name=senha]', 'segredo1'); await p.fill('.ffv2-senha [name=repetir]', 'segredo2')
    await p.click('.ffv2-senha button[type=submit]'); await p.wait_for_timeout(200)
    verificar(await p.inner_text('[role=alert]') == 'As palavras-passe não coincidem.', 'aceitou palavras-passe diferentes')
    await p.fill('.ffv2-senha [name=repetir]', 'segredo1')
    async with p.expect_download(timeout=15000) as d:
        await p.click('.ffv2-senha button[type=submit]')
    download = await d.value
    caminho = pathlib.Path(tempfile.mkdtemp()) / download.suggested_filename
    await download.save_as(caminho)
    texto = caminho.read_text(encoding='utf-8')
    verificar(download.suggested_filename.endswith('-protegido.json') and '"encrypted"' in texto, f'ficheiro: {download.suggested_filename}')
    verificar('Mercado' not in texto and 'Padaria' not in texto, 'o backup protegido tem os dados legíveis')
    verificar('protegida descarregada' in await p.inner_text('.settings-message'), 'falta a mensagem')

    await app.abrir({'transactions': [MOV(9, 'Outro', -1)]})
    await definicoes(app, 'Backup')
    await p.set_input_files('input[aria-label="Ficheiro de cópia de segurança"]', str(caminho)); await p.wait_for_timeout(500)
    await p.fill('.ffv2-senha [name=senha]', 'errada1'); await p.click('.ffv2-senha button[type=submit]'); await p.wait_for_timeout(2500)
    verificar(await p.inner_text('[role=alert]') == 'Palavra-passe errada.', 'aceitou a palavra-passe errada')
    verificar(await movimentos(app) == ['Outro'], 'mudou os dados com a palavra-passe errada')
    p.once('dialog', lambda dl: dl.accept())
    await p.fill('.ffv2-senha [name=senha]', 'segredo1'); await p.click('.ffv2-senha button[type=submit]'); await p.wait_for_timeout(2500)
    verificar(sorted(await movimentos(app)) == ['Mercado Fictício', 'Padaria Fictícia'], f'não restaurou: {await movimentos(app)}')
    verificar('restaurada com sucesso' in await p.inner_text('.settings-message'), 'falta a mensagem de restauro')

    await p.go_back(); await p.wait_for_timeout(500)
    await p.click('.jarvis-fab'); await p.wait_for_timeout(400)
    await p.set_input_files('.jarvis-attach input', str(caminho)); await p.wait_for_timeout(1200)
    r = await p.evaluate("[...document.querySelectorAll('.jarvis-msg-ai')].pop().textContent")
    verificar('protegido com palavra-passe' in r, r)


async def t_backup_normal_continua_igual(app):
    await app.abrir(DADOS)
    p = app.page
    await definicoes(app, 'Backup')
    async with p.expect_download(timeout=15000) as d:
        await p.click('.setting-row:has-text("Criar backup"):not(:has-text("protegido"))')
    caminho = pathlib.Path(tempfile.mkdtemp()) / 'b.json'
    await (await d.value).save_as(caminho)
    b = json.loads(caminho.read_text(encoding='utf-8'))
    verificar(b['app'] == 'financas-familiar' and len(b['data']['transactions']) == 2 and 'encrypted' not in b, f'backup normal: {list(b)}')


PERSIST = "(v)=>{Object.defineProperty(navigator,'storage',{value:{persisted:async()=>false,persist:async()=>{window.__pediu=true;return v},estimate:async()=>({usage:0,quota:1e9})}})}"


async def t_pede_armazenamento_persistente(app):
    p = app.page
    await p.add_init_script(f"({PERSIST})(true)")
    await app.abrir(DADOS)
    verificar(await p.evaluate('window.__pediu === true'), 'não pediu armazenamento persistente')
    await definicoes(app, 'Dados')
    verificar((await p.inner_text('.ffv2-protecao strong')) == 'Ativa', 'não mostra a proteção ativa')


async def t_avisa_quando_o_armazenamento_nao_e_persistente(app):
    p = app.page
    await p.add_init_script(f"({PERSIST})(false)")
    await app.abrir(DADOS)
    await definicoes(app, 'Dados')
    verificar((await p.inner_text('.ffv2-protecao strong')) == 'Não ativa', 'devia mostrar «Não ativa»')
    verificar('pode apagar os dados' in await p.inner_text('.settings-panel'), 'falta o aviso')
