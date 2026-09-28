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
