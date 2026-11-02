"""Etapa 5: Combustível (cartão do mês e 6 meses), Veterinário (cuidados com os dias, filtro, ficha) e Definições em grupos."""
import json
from correr import verificar

A = lambda i, d, v, **x: {'id': i, 'title': 'Combustível', 'amount': v, 'date': d, 'detail': '1 x · Combustível', 'movementType': 'expense', **x}
VET = lambda i, d, t, v, pet, cat: {'id': 100 + i, 'title': t, 'amount': v, 'date': d, 'detail': f'1 x · {cat}', 'movementType': 'expense', 'pet': pet, 'vetCategory': cat}
PERFIL = {'profileName': 'Família', 'email': '', 'phone': '', 'members': ['Pessoa A', 'Pessoa B'], 'pets': [{'name': 'Rex', 'sex': 'm'}, {'name': 'Nina', 'sex': 'f'}],
          'vehicles': [{'name': 'Carro A', 'type': 'carro'}, {'name': 'Mota X', 'type': 'mota'}]}  # nomes fictícios
DADOS = {'profile': PERFIL, 'transactions': [A(1, '2026-09-02', -60, vehicle='Carro A'), A(2, '2026-09-12', -12, vehicle='Mota X'), A(3, '2026-08-20', -50, vehicle='Carro A'),
         VET(1, '2026-09-05', 'Consulta', -45, 'Rex', 'Consultas'), VET(2, '2026-09-18', 'Vacina', -32, 'Nina', 'Vacinas')]}
LEMBRETES = {'financas-familiar:vet-reminders': json.dumps([{'id': 1, 'pet': 'Rex', 'type': 'vacina', 'last': '2025-10-03', 'every': 12}]), 'financas-familiar:vet-snooze': '9999999999999'}


async def t_combustivel_cartao_e_seis_meses(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('combustivel')"); await p.wait_for_timeout(800)
    verificar((await p.inner_text('.page-current .fffuel-total')).replace('\xa0', ' ') == '72,00 €', 'gasto do mês no cartão principal')
    verificar('2 abastecimentos' in await p.inner_text('.page-current .fffuel-mes'), 'número de abastecimentos no cartão')
    barras = await p.evaluate("[...document.querySelectorAll('.page-current .fffuel-barras > div')].map(d=>[d.querySelector('small').textContent, d.className, d.querySelectorAll('i').length])")
    verificar([b[0] for b in barras] == ['abr', 'mai', 'jun', 'jul', 'ago', 'set'] and barras[-1][1] == 'on', f'6 meses até ao escolhido: {barras}')
    verificar(barras[-1][2] == 2, f'em setembro, carros e mota na mesma barra: {barras[-1]}')


async def t_veterinario_cuidados_filtro_e_ficha(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS, LEMBRETES)
    p = app.page
    await p.evaluate("window.ffGoPg('veterinario')"); await p.wait_for_timeout(900)
    dias = (await p.inner_text('.ffvr-row .ffvr-dias')).replace('\n', ' ').lower()
    verificar(dias == '5 dias', f'contagem dos dias do cuidado: {dias!r}')
    await p.click('.page-current .ffvet-filtro button:has-text("Nina")'); await p.wait_for_timeout(300)
    titulos = await p.evaluate("[...document.querySelectorAll('.page-current .vet-month-list .transaction-list h3')].map(h=>h.textContent)")
    verificar(titulos == ['Vacina'], f'filtro por animal: {titulos}')
    await p.click('.page-current .pet-card-open >> nth=0'); await p.wait_for_timeout(500)
    verificar(await p.inner_text('.page-current .ffvet-hero h2') == 'Rex', 'ficha com a fotografia em grande')
    proximo = (await p.inner_text('.page-current .ffvet-proximo')).replace('\n', ' ').lower()
    verificar('5 dias' in proximo, f'próximo cuidado na ficha: {proximo}')


async def t_definicoes_em_grupos(app):
    await app.abrir(DADOS)
    p = app.page
    await p.click('button[aria-label="Jarvis e definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-more'); await p.wait_for_timeout(600)
    perfil = (await p.inner_text('.ffdef-perfil')).replace('\n', ' ')
    verificar(perfil.startswith('F Família 2 membros · 2 animais · 2 viaturas'), f'cartão do perfil: {perfil}')
    verificar(await p.locator('.ffdef-grupo').count() == 3, 'três grupos')
    verificar(await p.inner_text('.setting-row:has-text("Backup") .ffdef-estado') == 'Em dia', 'estado do backup à vista')
    await p.click('.settings-list .setting-row:has-text("Aparência")'); await p.wait_for_timeout(400)
    verificar(await p.locator('.fftema .fftema-tela').count() == 6, 'temas em miniaturas do ecrã')
