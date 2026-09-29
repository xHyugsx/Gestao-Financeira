"""Definições › Segurança: PIN, impressão digital, ocultar valores e bloqueio ao voltar."""
import hashlib, json
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
