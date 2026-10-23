"""Backup no Google Drive (com o Google e o Drive simulados): ligar, enviar a cópia protegida, substituir, avisar, restaurar e desligar."""
import json, re, urllib.parse
from correr import verificar

M = lambda i, t, v: {'id': i, 'title': t, 'amount': v, 'date': '2026-09-10', 'detail': '10 setembro · Outros', 'movementType': 'expense'}
DADOS = {'transactions': [M(1, 'Padaria', -3), M(2, 'Cinema', -12), M(3, 'Livraria', -20)]}
CLIENTE = 'teste-123.apps.googleusercontent.com'
TOKEN = 'TOKEN-TESTE'


class DriveFalso:
    """Drive mínimo em memória (só o que a app usa)."""
    def __init__(self):
        self.ficheiros, self.n, self.pedidos = {}, 0, []

    def novo(self, **f):
        self.n += 1
        f['id'] = f'f{self.n}'
        self.ficheiros[f['id']] = f
        return f

    async def tratar(self, route, request):
        u = urllib.parse.urlparse(request.url)
        q = urllib.parse.parse_qs(u.query)
        self.pedidos.append((request.method, u.path))
        if request.headers.get('authorization') != f'Bearer {TOKEN}':
            return await route.fulfill(status=401, body='{}')
        resp = lambda o, s=200: route.fulfill(status=s, content_type='application/json', body=json.dumps(o))
        if u.path == '/drive/v3/about':
            return await resp({'user': {'emailAddress': 'familia@exemplo.pt'}})
        m = re.fullmatch(r'/drive/v3/files/(\w+)', u.path)
        if m and request.method == 'GET':
            f = self.ficheiros.get(m[1])
            if not f: return await resp({}, 404)
            if q.get('alt') == ['media']: return await route.fulfill(status=200, body=f['conteudo'])
            return await resp({'id': f['id'], 'trashed': False})
        if u.path == '/drive/v3/files' and request.method == 'GET':
            filtro = q['q'][0]
            if 'folder' in filtro:
                return await resp({'files': [{'id': f['id']} for f in self.ficheiros.values() if f.get('pasta')]})
            pai = re.search(r"'(\w+)' in parents", filtro)[1]
            l = [{'id': f['id'], 'name': f['name'], 'modifiedTime': '2026-09-28T10:00:00Z'} for f in self.ficheiros.values() if pai in f.get('parents', [])]
            return await resp({'files': l})
        if u.path == '/drive/v3/files' and request.method == 'POST':
            meta = json.loads(request.post_data)
            return await resp({'id': self.novo(name=meta['name'], pasta=True)['id']})
        if u.path.startswith('/upload/drive/v3/files'):
            fronteira = request.headers['content-type'].split('boundary=')[1]
            partes = request.post_data.split(f'--{fronteira}')
            meta = json.loads(partes[1].split('\r\n\r\n', 1)[1].strip())
            conteudo = partes[2].split('\r\n\r\n', 1)[1].rstrip('\r\n')
            m = re.fullmatch(r'/upload/drive/v3/files/(\w+)', u.path)
            if m:
                f = self.ficheiros.get(m[1])
                if not f: return await resp({}, 404)
                f.update(name=meta.get('name', f['name']), conteudo=conteudo, versoes=f.get('versoes', 1) + 1)
                return await resp({'id': f['id']})
            return await resp({'id': self.novo(name=meta['name'], parents=meta['parents'], conteudo=conteudo)['id']})
        return await resp({}, 404)

    def copias(self):
        return [f for f in self.ficheiros.values() if not f.get('pasta')]


async def preparar(app, drive):
    ctx = app.page.context

    async def google(route, request):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(request.url).query)
        destino = f"{q['redirect_uri'][0]}#access_token={TOKEN}&expires_in=3600&token_type=Bearer&state={q['state'][0]}"
        await route.fulfill(status=302, headers={'Location': destino})
    await ctx.route('https://accounts.google.com/**', google)
    await ctx.route('https://www.googleapis.com/**', drive.tratar)
    await ctx.route('https://oauth2.googleapis.com/**', lambda r, q: r.fulfill(status=200, body='{}'))


async def abrir_backup(app):
    p = app.page
    await p.click('button[aria-label="Definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-more'); await p.wait_for_timeout(400)
    await p.click('.settings-list .setting-row:has-text("Backup")'); await p.wait_for_timeout(500)


async def ligar(app):
    p = app.page
    await p.fill('.ffdrive-cliente input[name=cliente]', 'nao-e-um-id')
    await p.click('.ffdrive-cliente button[type=submit]'); await p.wait_for_timeout(200)
    verificar('apps.googleusercontent.com' in (await p.text_content('.settings-message') or ''), 'devia recusar um ID inválido')
    verificar((await p.text_content('.ffdrive-retorno')).startswith('http://127.0.0.1'), 'falta o endereço de retorno a registar')
    await p.fill('.ffdrive-cliente input[name=cliente]', CLIENTE)
    await p.click('.ffdrive-cliente button[type=submit]'); await p.wait_for_timeout(300)
    async with p.expect_popup() as janela:
        await p.click('.ffdrive .setting-row:has-text("Ligar ao Google Drive")')
    popup = await janela.value
    await p.wait_for_timeout(1500)
    verificar(popup.is_closed(), 'a janela do Google devia fechar-se sozinha')
    verificar(await p.query_selector('.ffdrive-ligado'), 'devia ficar «Ligado»')
    verificar('familia@exemplo.pt' in (await p.text_content('.ffdrive') or ''), 'devia mostrar a conta')


async def enviar(app, senha, repetir=None, descarregar=True, espera_descarga=True):
    p = app.page
    if descarregar:
        await p.click('.settings-list .setting-row:has-text("Criar backup") >> nth=0')
    else:
        await p.click('.ffdrive .setting-row:has-text("Enviar agora")')
    await p.wait_for_timeout(300)
    await p.fill('.ffdrive-senha input[name=senha]', senha)
    if repetir is not None: await p.fill('.ffdrive-senha input[name=repetir]', repetir)
    if descarregar and espera_descarga:
        async with p.expect_download() as d:
            await p.click('.ffdrive-senha button[type=submit]')
        await d.value
    else:
        await p.click('.ffdrive-senha button[type=submit]')
    await p.wait_for_timeout(2500)


async def t_ligar_enviar_e_substituir(app):
    drive = DriveFalso()
    await preparar(app, drive)
    await app.abrir(DADOS)
    p = app.page
    await abrir_backup(app)
    await ligar(app)
    # 1.º backup: pede a palavra-passe duas vezes; descarrega a cópia normal e envia a protegida
    await enviar(app, 'segredo1', 'segredo1')
    copias = drive.copias()
    verificar(len(copias) == 1 and copias[0]['name'].startswith('Finanças - backup protegido ('), f'cópia no Drive: {[c["name"] for c in copias]}')
    verificar('"encrypted"' in copias[0]['conteudo'] and 'Padaria' not in copias[0]['conteudo'], 'a cópia no Drive tem de ir cifrada')
    verificar('enviada para o Google Drive' in (await p.text_content('.settings-message') or ''), 'falta a mensagem de envio')
    pasta = [f for f in drive.ficheiros.values() if f.get('pasta')]
    verificar(len(pasta) == 1 and pasta[0]['name'] == 'Finanças — backups', 'a cópia vai para a pasta da app')
    antes = copias[0]['conteudo']
    # 2.º backup: outra palavra-passe → pede para repetir; a mesma → substitui (continua um só ficheiro)
    await enviar(app, 'outra-senha', espera_descarga=False)
    verificar('Não é a palavra-passe da última cópia' in (await p.text_content('.settings-message[role=alert]') or ''), 'devia avisar da palavra-passe diferente')
    await p.click('.ffdrive-senha button:has-text("Cancelar")'); await p.wait_for_timeout(200)
    await enviar(app, 'segredo1', descarregar=False)
    copias = drive.copias()
    verificar(len(copias) == 1 and copias[0]['conteudo'] != antes and copias[0].get('versoes') == 2, 'a cópia devia ser substituída, não duplicada')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_aviso_restaurar_e_desligar(app):
    drive = DriveFalso()
    await preparar(app, drive)
    await app.abrir(DADOS)
    p = app.page
    await abrir_backup(app)
    await ligar(app)
    await enviar(app, 'segredo1', 'segredo1', descarregar=False)
    # finge que a cópia do Drive tinha 100 movimentos: a nova (3) é muito mais pequena → pergunta
    await p.evaluate("const k='financas-familiar:drive',c=JSON.parse(localStorage.getItem(k));c.movimentos=100;localStorage.setItem(k,JSON.stringify(c))")
    antes = drive.copias()[0]['conteudo']
    perguntas = []
    p.once('dialog', lambda d: (perguntas.append(d.message), __import__('asyncio').ensure_future(d.dismiss())))
    await enviar(app, 'segredo1', descarregar=False)
    verificar(perguntas and '3 movimentos' in perguntas[0] and '100' in perguntas[0], f'devia perguntar antes de substituir: {perguntas}')
    verificar(drive.copias()[0]['conteudo'] == antes, 'ao responder «não», a cópia do Drive fica como estava')
    # restaurar a partir do Drive (pede a palavra-passe e a confirmação)
    await p.click('.ffdrive .setting-row:has-text("Cópias no Drive")'); await p.wait_for_timeout(800)
    verificar(await p.locator('.ffdrive-copias article').count() == 1, 'devia listar a cópia do Drive')
    await p.click('.ffdrive-copias button:has-text("Restaurar")'); await p.wait_for_timeout(800)
    await p.fill('.ffv2-senha input[name=senha]', 'segredo1')
    p.once('dialog', lambda d: __import__('asyncio').ensure_future(d.accept()))
    await p.click('.ffv2-senha button[type=submit]'); await p.wait_for_timeout(2500)
    verificar('restaurada' in (await p.text_content('.settings-message') or ''), 'devia restaurar a cópia do Drive')
    # desligar
    await p.click('.ffdrive .setting-row:has-text("Desligar")'); await p.wait_for_timeout(400)
    verificar(not await p.query_selector('.ffdrive-ligado'), 'devia ficar desligado')
    verificar(len(drive.copias()) == 1, 'desligar não apaga a cópia do Drive')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_ligar_sem_janela_volta_a_app(app):
    drive = DriveFalso()
    await preparar(app, drive)
    await app.abrir(DADOS)
    p = app.page
    await abrir_backup(app)
    await p.fill('.ffdrive-cliente input[name=cliente]', CLIENTE)
    await p.click('.ffdrive-cliente button[type=submit]'); await p.wait_for_timeout(300)
    await p.evaluate("window.open = () => null")  # telemóvel que não deixa abrir a janela
    await p.click('.ffdrive .setting-row:has-text("Ligar ao Google Drive")')
    await p.wait_for_load_state('load'); await p.wait_for_timeout(2500)
    verificar('access_token' not in p.url, f'o endereço devia ficar limpo: {p.url}')
    await abrir_backup(app)
    verificar(await p.query_selector('.ffdrive-ligado'), 'depois de voltar do Google devia ficar ligado')
    verificar('familia@exemplo.pt' in (await p.text_content('.ffdrive') or ''), 'devia mostrar a conta')
    verificar(not app.erros, f'erros: {app.erros}')
