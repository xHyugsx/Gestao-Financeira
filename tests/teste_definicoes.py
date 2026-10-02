"""Definições › Segurança: PIN, impressão digital, ocultar valores e bloqueio ao voltar."""
import asyncio, hashlib, json
from correr import verificar, chave, PREFIXO
from teste_biometria import com_sensor, pin

PIN = hashlib.sha256(b'financas-familiar:1234').hexdigest()
PIN_0000 = hashlib.sha256(b'financas-familiar:0000').hexdigest()


async def seguranca(app):
    p = app.page
    await p.click('button[aria-label="Definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-more'); await p.wait_for_timeout(500)
    await p.click('.setting-row:has-text("Segurança")'); await p.wait_for_timeout(500)


async def escrever_pin(app, novo, confirmar=None):
    p = app.page
    campos = p.locator('.settings-panel input[autocomplete=new-password]')
    await campos.nth(0).fill(novo); await campos.nth(1).fill(confirmar or novo)
    await p.click('.settings-panel button[type=submit]'); await p.wait_for_timeout(700)


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}')


async def mensagem(app):
    return await app.page.evaluate("document.querySelector('.settings-message')?.textContent||''")


async def t_definir_pin_pede_o_pin_ao_abrir(app):
    await app.abrir({})
    await seguranca(app)
    await escrever_pin(app, '1234')
    verificar(await mensagem(app) == 'PIN definido.', f'mensagem: {await mensagem(app)!r}')
    verificar((await dados(app)).get('pinHash') == PIN, 'o PIN não foi gravado com o formato de sempre')
    await app.page.reload(); await app.page.wait_for_timeout(1500)
    verificar(await app.page.query_selector('#ff-lock'), 'a app não pediu o PIN depois de o definir')
    await pin(app)
    verificar(not await app.page.query_selector('#ff-lock'), 'o PIN novo não abriu a app')


async def t_pins_diferentes_nao_grava(app):
    await app.abrir({})
    await seguranca(app)
    await escrever_pin(app, '1234', '4321')
    verificar(await mensagem(app) == 'Os PIN não coincidem.', f'mensagem: {await mensagem(app)!r}')
    verificar(not (await dados(app)).get('pinHash'), 'gravou um PIN que não coincide')


async def t_alterar_pin_desativa_a_impressao_digital(app):
    await com_sensor(app)
    await app.abrir({'pinHash': PIN}, {'financas-familiar:bio': {'id': 'AAAA', 'pin': PIN}, 'financas-familiar:bio-offer': 'no'})
    await app.page.evaluate("()=>{navigator.credentials.get=()=>Promise.reject(new DOMException('não','NotAllowedError'))}")
    await pin(app)
    await seguranca(app)
    await escrever_pin(app, '0000')
    verificar(await mensagem(app) == 'PIN alterado.', f'mensagem: {await mensagem(app)!r}')
    verificar((await dados(app)).get('pinHash') == PIN_0000, 'o PIN alterado não foi gravado')
    await app.page.reload(); await app.page.wait_for_timeout(1500)
    verificar(not await app.page.query_selector('.ffl-key.bio'), 'a impressão digital do PIN antigo continuou ativa')
    await pin(app, '0000')
    verificar(not await app.page.query_selector('#ff-lock'), 'o PIN alterado não abriu a app')


async def t_ativar_e_desligar_a_impressao_digital(app):
    await com_sensor(app)
    await app.abrir({'pinHash': PIN}, {'financas-familiar:bio-offer': 'no'})
    await pin(app)
    await seguranca(app)
    p = app.page
    await p.click('.ff-bio-slot [data-v=on]'); await p.wait_for_timeout(1500)
    registo = json.loads(await p.evaluate("k=>localStorage.getItem(k)", chave('financas-familiar:bio')) or 'null')
    verificar(registo and registo['pin'] == PIN, f'registo da impressão digital: {registo}')
    verificar(await p.inner_text('.ffb-msg') == 'Impressão digital ativada.', 'sem mensagem de ativada')
    await p.click('.ff-bio-slot [data-v=off]'); await p.wait_for_timeout(400)
    verificar(await p.evaluate("k=>localStorage.getItem(k)", chave('financas-familiar:bio')) is None, 'não desativou')


async def t_remover_pin_deixa_de_bloquear(app):
    await app.abrir({'pinHash': PIN}, {'financas-familiar:bio-offer': 'no'})
    await pin(app)
    await seguranca(app)
    app.page.once('dialog', lambda d: d.accept())
    await app.page.click('.settings-panel button:has-text("Remover PIN")'); await app.page.wait_for_timeout(500)
    verificar(await mensagem(app) == 'PIN removido.', f'mensagem: {await mensagem(app)!r}')
    verificar(not (await dados(app)).get('pinHash'), 'o PIN continuou gravado')
    await app.page.reload(); await app.page.wait_for_timeout(1500)
    verificar(not await app.page.query_selector('#ff-lock'), 'continuou a pedir o PIN')


async def t_opcoes_de_ocultar_e_bloquear_ficam_gravadas(app):
    await app.abrir({'pinHash': PIN}, {'financas-familiar:bio-offer': 'no'})
    await pin(app)
    await seguranca(app)
    p = app.page
    await p.click('[aria-label="Ocultar valores ao sair da app"] button:text-is("Após 1 min")'); await p.wait_for_timeout(300)
    verificar((await dados(app)).get('appearance', {}).get('autoHide') == '60', 'a opção de ocultar valores não ficou gravada')
    await p.click('.ff-autolock-slot [data-v="300"]'); await p.wait_for_timeout(300)
    verificar(await p.evaluate("k=>localStorage.getItem(k)", chave('financas-familiar:autolock')) == '300', 'o bloqueio ao voltar não ficou gravado')
    ativa = await p.evaluate("document.querySelector('.ff-autolock-slot [aria-checked=true]')?.textContent")
    verificar(ativa == 'Após 5 min', f'opção marcada: {ativa!r}')


async def t_voltar_fecha_as_definicoes(app):
    await app.abrir({})
    p = app.page
    await seguranca(app)
    await p.click('.sheet-back'); await p.wait_for_timeout(400)
    verificar(await p.query_selector('.settings-list'), '«Voltar» na Segurança não voltou à lista')
    await p.go_back(); await p.wait_for_timeout(600)
    verificar(not await p.query_selector('.settings-sheet'), 'o botão «voltar» do telemóvel não fechou as Definições')
    await p.click('button[aria-label="Definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-item:has-text("Segurança")'); await p.wait_for_timeout(500)
    await p.click('.sheet-back'); await p.wait_for_timeout(600)
    verificar(not await p.query_selector('.settings-sheet'), 'aberta pelo menu rápido, «Voltar» não fechou as Definições')


async def seccao(app, nome):
    p = app.page
    await p.click('button[aria-label="Definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-more'); await p.wait_for_timeout(500)
    await p.click(f'.setting-row:has-text("{nome}")'); await p.wait_for_timeout(500)


async def t_perfil_e_membros(app):
    await app.abrir({'profile': {'profileName': 'Família Teste', 'email': '', 'phone': '', 'members': ['Ana', 'Rui']}})
    p = app.page
    await seccao(app, 'Perfil e família')
    await p.fill('input[name=email]', 'nao-e-email'); await p.click('.settings-panel button[type=submit]'); await p.wait_for_timeout(300)
    verificar((await dados(app))['profile']['email'] == '', 'gravou um email inválido')
    await p.fill('input[name=profileName]', 'Casa Nova'); await p.fill('input[name=email]', 'casa@exemplo.pt')
    await p.click('.settings-panel button[type=submit]'); await p.wait_for_timeout(300)
    verificar(await mensagem(app) == 'Perfil guardado.', f'mensagem: {await mensagem(app)!r}')
    await p.fill('input[aria-label="Nome do membro 2"]', 'Rita'); await p.click('input[name=profileName]'); await p.wait_for_timeout(300)
    perfil = (await dados(app))['profile']
    verificar(perfil['profileName'] == 'Casa Nova' and perfil['email'] == 'casa@exemplo.pt' and perfil['members'] == ['Ana', 'Rita'], f'perfil: {perfil}')


async def t_categorias_nas_definicoes(app):
    await app.abrir({'categories': ['Lazer', 'Casa'], 'transactions': [
        {'id': 1, 'title': 'Cinema', 'amount': -8, 'date': '2026-09-12', 'detail': '12 setembro · Lazer', 'movementType': 'expense'}]})
    p = app.page
    await seccao(app, 'Categorias')
    await p.fill('input[aria-label="Categoria Lazer"]', 'Diversão'); await p.click('.inline-add input'); await p.wait_for_timeout(300)
    d = await dados(app)
    verificar(d['categories'] == ['Diversão', 'Casa'] and d['transactions'][0]['detail'] == '12 setembro · Diversão', f'renomear: {d["categories"]}')
    await p.fill('.inline-add input', 'Ginásio'); await p.click('.inline-add button'); await p.wait_for_timeout(300)
    await p.click('button[aria-label="Eliminar Casa"]'); await p.wait_for_timeout(300)
    verificar((await dados(app))['categories'] == ['Diversão', 'Ginásio'], f'criar/eliminar: {(await dados(app))["categories"]}')


async def t_contas_nova_e_eliminar(app):
    await app.abrir({})
    p = app.page
    await seccao(app, 'Contas bancárias')
    await p.click('.account-add'); await p.wait_for_timeout(400)
    contas = (await dados(app))['accounts']
    verificar(len(contas) == 3 and contas[2]['name'] == 'Nova conta', f'nova conta: {contas}')
    await p.fill(f'input[name="{contas[2]["id"]}-name"]', 'Cartão refeição')
    await p.click('.settings-panel button[type=submit]'); await p.wait_for_timeout(400)
    verificar((await dados(app))['accounts'][2]['name'] == 'Cartão refeição', 'o nome não foi gravado')
    p.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await p.click('button[aria-label="Eliminar Cartão refeição"]'); await p.wait_for_timeout(400)
    verificar(len((await dados(app))['accounts']) == 2, 'a conta não foi eliminada')


async def t_aparencia(app):
    await app.abrir({})
    p = app.page
    await seccao(app, 'Aparência')
    await p.click('.accent-options button:has-text("Nebulosa")'); await p.wait_for_timeout(300)
    await p.click('.setting-row[aria-pressed]'); await p.wait_for_timeout(300)
    a = (await dados(app))['appearance']
    verificar(a['accent'] == 'rose' and a['haptics'] is False, f'aparência: {a}')
    verificar(await p.query_selector('.cosmic-app.accent-rose'), 'o tema não mudou')


async def t_backup_csv_e_restauro(app):
    await app.abrir({'transactions': [{'id': 1, 'title': 'Cinema', 'amount': -8.5, 'date': '2026-09-12', 'detail': '12 setembro · Lazer', 'movementType': 'expense'}]},
                    {'financas-familiar:vet-reminders': [{'id': 1, 'pet': 'Rex', 'type': 'vacina', 'last': '2026-01-10', 'every': 12}]}, sem_backup_aviso=False)
    p = app.page
    await seccao(app, 'Backup')
    async with p.expect_download() as d:
        await p.click('.setting-row:has-text("Criar backup")')
    backup = json.loads(open(await (await d.value).path(), encoding='utf-8').read())
    verificar(backup['app'] == 'financas-familiar' and backup['version'] == 4 and len(backup['data']['transactions']) == 1 and len(backup['vetReminders']) == 1, f'backup: {list(backup)}')
    verificar(await p.evaluate("k=>!!localStorage.getItem(k)", chave('financas-familiar:last-backup')), 'não registou a data do backup')
    async with p.expect_download() as d:
        await p.click('.setting-row:has-text("Exportar movimentos")')
    csv = open(await (await d.value).path(), encoding='utf-8-sig').read()
    verificar(csv.splitlines()[1] == '"2026-09-12";"Cinema";"Lazer";"Despesa";"-8,50";""', f'csv: {csv!r}')
    backup['data']['transactions'].append({'id': 2, 'title': 'Restaurado', 'amount': -1, 'date': '2026-09-13', 'detail': '13 setembro · Lazer', 'movementType': 'expense'})
    p.on('dialog', lambda x: asyncio.ensure_future(x.accept()))
    await p.set_input_files('input[aria-label="Ficheiro de cópia de segurança"]', files=[{'name': 'b.json', 'mimeType': 'application/json', 'buffer': json.dumps(backup).encode()}])
    await p.wait_for_timeout(600)
    verificar([m['title'] for m in (await dados(app))['transactions']] == ['Cinema', 'Restaurado'], 'o restauro não substituiu os movimentos')
    await p.set_input_files('input[aria-label="Ficheiro de cópia de segurança"]', files=[{'name': 'x.json', 'mimeType': 'application/json', 'buffer': b'{"nada":1}'}])
    await p.wait_for_timeout(400)
    verificar('Ficheiro inválido' in await mensagem(app), f'mensagem: {await mensagem(app)!r}')


async def t_limpar_todos_os_dados(app):
    await app.abrir({'transactions': [{'id': 1, 'title': 'Cinema', 'amount': -8, 'date': '2026-09-12', 'detail': '12 setembro · Lazer', 'movementType': 'expense'}]})
    p = app.page
    await seccao(app, 'Dados')
    p.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await p.click('.settings-panel button:has-text("Limpar todos os dados locais")'); await p.wait_for_timeout(2000)
    verificar(not (await dados(app)).get('transactions'), 'os dados não foram limpos')
