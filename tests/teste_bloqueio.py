import hashlib
from correr import verificar

PIN = hashlib.sha256(b'financas-familiar:1234').hexdigest()


async def desbloquear(app, pin):
    p = app.page
    await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    for k in pin: await p.keyboard.press(k)
    await p.wait_for_timeout(1300)


async def t_pin_errado_nao_entra(app):
    await app.abrir({'pinHash': PIN})
    await desbloquear(app, '9999')
    verificar(await app.page.query_selector('#ff-lock'), 'entrou com PIN errado')


async def t_pin_certo_entra(app):
    await app.abrir({'pinHash': PIN})
    await desbloquear(app, '1234')
    verificar(not await app.page.query_selector('#ff-lock'), 'não entrou com o PIN certo')


async def t_bloqueio_automatico_logo(app):
    await app.abrir({'pinHash': PIN}, {'financas-familiar:autolock': 'now'})
    await desbloquear(app, '1234')
    p = app.page
    for estado in ['hidden', 'visible']:
        await p.evaluate("s=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>s});document.dispatchEvent(new Event('visibilitychange'))}", estado)
        await p.wait_for_timeout(300)
    await p.wait_for_timeout(600)
    verificar(await p.query_selector('#ff-lock'), 'não voltou a bloquear ao regressar à app')


async def t_sem_pin_abre_direto(app):
    await app.abrir()
    verificar(not await app.page.query_selector('#ff-lock'), 'pediu PIN sem haver PIN')


async def sensor_virtual(app):
    """Sensor de impressão digital virtual do Chromium (WebAuthn), que confirma o utilizador sozinho."""
    cdp = await app.page.context.new_cdp_session(app.page)
    await cdp.send('WebAuthn.enable')
    r = await cdp.send('WebAuthn.addVirtualAuthenticator', {'options': {
        'protocol': 'ctap2', 'transport': 'internal', 'hasResidentKey': False, 'hasUserVerification': True,
        'isUserVerified': True, 'automaticPresenceSimulation': True}})
    return cdp, r['authenticatorId']


DESLIZAR_E_MEDIR = """() => new Promise((res) => {
  const t0 = performance.now(); let espera = false;
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  const ver = () => {
    const l = document.getElementById('ff-lock');
    if (l && (l.classList.contains('ffl-bio') || getComputedStyle(l.querySelector('.ffl-wait') || l).opacity === '1' && l.querySelector('.ffl-wait'))) espera = true;
    if (!l || l.classList.contains('ffl-open')) return res({ espera, aberto: !l, teclado: !!l, ms: Math.round(performance.now() - t0) });
    if (performance.now() - t0 > 5000) return res({ espera, aberto: false, teclado: false, ms: -1 });
    requestAnimationFrame(ver);
  };
  ver();
})"""


async def t_impressao_digital_abre_a_app_sem_ecra_de_espera(app):
    p = app.page
    url = app.url.replace('127.0.0.1', 'localhost')  # o WebAuthn não aceita endereços IP
    await p.goto(url); await p.wait_for_timeout(1500)
    await p.evaluate("h=>{localStorage.clear();localStorage.setItem('financas-familiar:v3',JSON.stringify({pinHash:h}));localStorage.setItem('financas-familiar:last-backup',new Date().toISOString())}", PIN)
    await p.goto(url); await p.wait_for_timeout(1500)
    cdp, aut = await sensor_virtual(app)
    await desbloquear(app, '1234')
    verificar(await p.query_selector('#ff-lock.ffl-offer'), 'não ofereceu a impressão digital')
    await p.click('.ffl-yes'); await p.wait_for_timeout(1200)
    verificar(await p.evaluate("!!localStorage.getItem('financas-familiar:bio')"), 'a impressão digital não ficou registada')

    await p.reload(); await p.wait_for_timeout(1500)
    r = await p.evaluate(DESLIZAR_E_MEDIR)
    verificar(r['aberto'] and not r['espera'], f'ecrã de espera da impressão digital ou não abriu: {r}')
    verificar(0 <= r['ms'] < 400, f'a app demorou a abrir depois da impressão digital: {r}')

    await p.reload(); await p.wait_for_timeout(1500)
    await cdp.send('WebAuthn.setUserVerified', {'authenticatorId': aut, 'isUserVerified': False})
    r = await p.evaluate(DESLIZAR_E_MEDIR)
    verificar(r['teclado'] and not r['espera'], f'sem confirmação do sensor devia mostrar o teclado do PIN: {r}')
