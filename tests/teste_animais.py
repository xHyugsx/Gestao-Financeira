"""Animais da família vêm dos dados ou do perfil (sem nomes no código); mudar o nome atualiza despesas, fotos e lembretes."""
import json
from correr import verificar, PREFIXO

MOV = lambda i, t, d, pet: {'id': i, 'title': t, 'amount': -20, 'date': d, 'detail': f'{int(d[8:])} setembro · Veterinário', 'movementType': 'expense', 'pet': pet}
DADOS = {'transactions': [MOV(1, 'Vacina', '2026-09-03', 'Rex'), MOV(2, 'Consulta', '2026-09-12', 'Nina')]}
LEMBRETES = {'financas-familiar:vet-reminders': json.dumps([{'id': 1, 'pet': 'Nina', 'type': 'vacina', 'last': '2026-01-10', 'every': 12}]),
             'financas-familiar:vet-snooze': '9999999999999'}


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}')


async def t_animais_deduzidos_dos_dados(app):
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('veterinario')"); await p.wait_for_timeout(800)
    nomes = await p.evaluate("[...document.querySelectorAll('.page-current .pet-card strong')].map(e=>e.textContent)")
    verificar(nomes == ['Rex', 'Nina'], f'animais: {nomes}')
    avatares = await p.evaluate("[...document.querySelectorAll('.page-current .vet-avatar')].map(e=>e.className.split('vet-avatar-')[1]+':'+e.textContent)")
    verificar(sorted(avatares) == ['lola:♀️', 'sam:♂️'], f'avatares: {avatares}')


async def t_mudar_o_nome_de_um_animal(app):
    await app.abrir(DADOS, LEMBRETES)
    p = app.page
    await p.click('button[aria-label="Definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-item:has-text("Perfil e família")'); await p.wait_for_timeout(500)
    verificar(await p.input_value('[aria-label="Nome do animal 1"]') == 'Nina' and await p.input_value('[aria-label="Sexo do animal 1"]') == 'm',
              'devia começar pelos animais dos lembretes')
    await p.fill('[aria-label="Nome do animal 1"]', 'Luna'); await p.select_option('[aria-label="Sexo do animal 1"]', 'f')
    await p.select_option('[aria-label="Sexo do animal 2"]', 'm')
    await p.click('.ffv2-animais button:has-text("Guardar animais")'); await p.wait_for_timeout(500)
    d = await dados(app)
    verificar(d['profile']['pets'] == [{'name': 'Luna', 'sex': 'f'}, {'name': 'Rex', 'sex': 'm'}], f'perfil: {d["profile"]}')
    verificar(sorted(m['pet'] for m in d['transactions']) == ['Luna', 'Rex'], f'despesas: {d["transactions"]}')
    lembretes = json.loads(await p.evaluate("P=>localStorage.getItem(P+'vet-reminders')", PREFIXO))
    verificar(lembretes[0]['pet'] == 'Luna', f'lembretes: {lembretes}')
    await p.go_back(); await p.wait_for_timeout(500)
    r = await app.jarvis('Quando é a próxima vacina da Luna?')
    verificar('da Luna' in r, r)
