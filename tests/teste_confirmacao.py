"""Confirmação animada (e com som) ao guardar, alterar e eliminar um movimento."""
import json
from correr import verificar, PREFIXO

DADOS = {'transactions': [{'id': 1, 'title': 'Padaria', 'amount': -3, 'date': '2026-09-20', 'detail': '20 setembro · Alimentação', 'movementType': 'expense'}]}
# AudioContext falso: conta as notas tocadas (sem som nos testes)
FALSO = """window.ffNotas = [];
class Falso { constructor(){ this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  createOscillator(){ const o = { type: '', frequency: { value: 0 }, connect: (g) => g, start: () => window.ffNotas.push(o.frequency.value), stop(){} }; return o; }
  createGain(){ return { gain: { setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect: (d) => d }; }
  resume(){ return Promise.resolve(); } }
window.AudioContext = Falso;"""


async def estado_conf(p):
    return await p.evaluate("(()=>{const e=document.querySelector('.ffconf'); return e ? [e.className, getComputedStyle(e.querySelector('.ffconf-disco')).animationName] : null})()")


async def t_guardar_alterar_e_eliminar_com_animacao_e_som(app):
    await app.page.add_init_script(FALSO)
    await app.abrir(DADOS)
    p = app.page
    await app.novo_movimento('Mercado', '12')
    c = await estado_conf(p)
    verificar(c == ['ffconf ffconf-guardado', 'ffconf-rodar'], f'ao guardar: {c}')
    verificar(await p.evaluate('window.ffNotas') == [880, 1318.5], f'som ao guardar: {await p.evaluate("window.ffNotas")}')
    await p.wait_for_timeout(1700)
    verificar(await estado_conf(p) is None, 'a confirmação desaparece sozinha')
    await p.click('.page-current [data-id="1"]'); await p.wait_for_timeout(500)
    await p.fill('[role=dialog] input[name=amount]', '4')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(150)
    verificar(await estado_conf(p) == ['ffconf ffconf-alterado', 'ffconf-rodar-inv'], f'ao alterar: {await estado_conf(p)}')
    await p.wait_for_timeout(1600)
    await p.click('.page-current [data-id="1"]'); await p.wait_for_timeout(500)
    await p.click('[role=dialog] button:has-text("Eliminar")'); await p.wait_for_timeout(150)
    verificar(await estado_conf(p) == ['ffconf ffconf-eliminado', 'ffconf-cair'], f'ao eliminar: {await estado_conf(p)}')
    verificar((await p.evaluate('window.ffNotas'))[-2:] == [587.3, 392], 'som ao eliminar (a descer)')
    verificar(await p.evaluate("getComputedStyle(document.querySelector('.ffconf')).pointerEvents") == 'none', 'não bloqueia toques')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_sem_som_quando_desligado(app):
    await app.page.add_init_script(FALSO)
    await app.abrir({**DADOS, 'appearance': {'accent': 'cyan', 'backgroundIntensity': 70, 'fontScale': 100, 'haptics': True, 'autoHide': 'nunca', 'sounds': False}})
    p = app.page
    await app.novo_movimento('Mercado', '12')
    verificar(await estado_conf(p) is not None, 'a animação aparece na mesma')
    verificar(await p.evaluate('window.ffNotas') == [], 'com os sons desligados não toca nada')


async def t_movimento_reduzido_so_esmaece(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await app.novo_movimento('Mercado', '12')
    verificar((await estado_conf(p))[1] == 'ffconf-surgir', 'com movimento reduzido, só aparece e desaparece')
