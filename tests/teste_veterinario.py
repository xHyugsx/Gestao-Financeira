from correr import verificar

LEMBRETES = [{'id': 1, 'pet': 'Rex', 'type': 'vacina', 'last': '2025-10-03', 'every': 12},
             {'id': 2, 'pet': 'Nina', 'type': 'externa', 'last': '2026-08-26', 'every': 1}]


async def t_lista_e_estados(app):
    await app.abrir(None, {'financas-familiar:vet-reminders': LEMBRETES, 'financas-familiar:vet-snooze': '9999999999999'})
    await app.page.evaluate("window.ffGoPg('veterinario')"); await app.page.wait_for_timeout(1000)
    linhas = await app.page.evaluate("[...document.querySelectorAll('.ffvr-row')].map(r=>r.className.split(' ')[1]+' '+r.querySelector('h3').textContent)")
    verificar(linhas == ['late Nina · Desparasitação externa', 'soon Rex · Vacina anual'], f'{linhas}')


async def t_feito_recalcula_a_data(app):
    await app.abrir(None, {'financas-familiar:vet-reminders': LEMBRETES, 'financas-familiar:vet-snooze': '9999999999999'})
    await app.page.evaluate("window.ffGoPg('veterinario')"); await app.page.wait_for_timeout(1000)
    await app.page.click('.ffvr-row.late .ffvr-done'); await app.page.wait_for_timeout(400)
    ultimo = await app.page.evaluate("window.ffVet.all().find(r=>r.id===2).last")
    verificar(ultimo == '2026-09-28', f'última data = {ultimo}')


async def t_jarvis_responde_sobre_lembretes(app):
    await app.abrir(None, {'financas-familiar:vet-reminders': LEMBRETES, 'financas-familiar:vet-snooze': '9999999999999'})
    r = await app.jarvis('Tenho algum lembrete em atraso?')
    verificar('Nina' in r and 'atraso' in r, r)
