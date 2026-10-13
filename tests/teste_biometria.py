"""Impressão digital com um sensor simulado (WebAuthn virtual do Chromium)."""
import hashlib, json
from correr import verificar, chave

PIN = hashlib.sha256(b'financas-familiar:1234').hexdigest()
REGISTO = chave('financas-familiar:bio')


async def com_sensor(app, verificado=True):
    """Sensor simulado + endereço localhost (o WebAuthn não aceita endereços IP)."""
    app.url = app.url.replace('127.0.0.1', 'localhost'); app.raiz = app.raiz.replace('127.0.0.1', 'localhost')
    cdp = await app.page.context.new_cdp_session(app.page)
    await cdp.send('WebAuthn.enable')
    await cdp.send('WebAuthn.addVirtualAuthenticator', {'options': {
        'protocol': 'ctap2', 'transport': 'internal', 'hasResidentKey': True, 'hasUserVerification': True,
        'isUserVerified': verificado, 'automaticPresenceSimulation': True}})
    return cdp


async def pin(app, digitos='1234'):
    p = app.page
    await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    for k in digitos: await p.keyboard.press(k)
    await p.wait_for_timeout(900)


async def bloqueado(app):
    return bool(await app.page.query_selector('#ff-lock'))


async def ativar(app):
    await app.abrir({'pinHash': PIN})
    await pin(app)
    verificar(await app.page.query_selector('#ff-lock.ffl-offer'), 'não perguntou se quer ativar a impressão digital')
    await app.page.click('.ffl-yes'); await app.page.wait_for_timeout(1200)
    verificar(not await bloqueado(app), 'não entrou depois de ativar')


async def t_ativar_depois_do_pin_e_entrar_com_o_dedo(app):
    await com_sensor(app)
    await ativar(app)
    reg = json.loads(await app.page.evaluate("k=>localStorage.getItem(k)", REGISTO) or 'null')
    verificar(reg and reg['pin'] == PIN and reg['id'], f'registo da impressão digital: {reg}')
    await app.page.reload(); await app.page.wait_for_timeout(1500)
    verificar(await app.page.query_selector('.ffl-key.bio'), 'a tecla da impressão digital não aparece')
    await app.page.keyboard.press('Enter'); await app.page.wait_for_timeout(1500)
    verificar(not await bloqueado(app), 'não entrou com a impressão digital')


async def t_agora_nao_nao_volta_a_perguntar(app):
    await com_sensor(app)
    await app.abrir({'pinHash': PIN})
    await pin(app)
    await app.page.click('.ffl-no'); await app.page.wait_for_timeout(800)
    verificar(not await bloqueado(app), 'não entrou depois de «Agora não»')
    await app.page.reload(); await app.page.wait_for_timeout(1500)
    await pin(app); await app.page.wait_for_timeout(400)
    verificar(not await bloqueado(app), 'voltou a perguntar depois de «Agora não»')


async def t_mudar_o_pin_desativa_a_impressao_digital(app):
    await com_sensor(app)
    outro = hashlib.sha256(b'financas-familiar:0000').hexdigest()
    await app.abrir({'pinHash': PIN}, {'financas-familiar:bio': {'id': 'AAAA', 'pin': outro}, 'financas-familiar:bio-offer': 'no'})
    verificar(not await app.page.query_selector('.ffl-key.bio'), 'mostrou a impressão digital de outro PIN')
    verificar(await app.page.evaluate("k=>localStorage.getItem(k)", REGISTO) is None, 'o registo antigo não foi desativado')
    await pin(app)
    verificar(not await bloqueado(app), 'o PIN deixou de funcionar')


async def t_dedo_falhado_abre_o_teclado(app):
    await com_sensor(app)
    await ativar(app)
    await app.page.reload(); await app.page.wait_for_timeout(1500)
    # o sensor passa a recusar (dedo não reconhecido ou cancelado)
    await app.page.evaluate("()=>{navigator.credentials.get=()=>Promise.reject(new DOMException('não','NotAllowedError'))}")
    await app.page.keyboard.press('Enter'); await app.page.wait_for_timeout(800)
    verificar(await app.page.query_selector('#ff-lock.ffl-open'), 'não abriu o teclado quando o dedo falhou')
    for k in '1234': await app.page.keyboard.press(k)
    await app.page.wait_for_timeout(1200)
    verificar(not await bloqueado(app), 'o PIN não funcionou depois do dedo falhado')
