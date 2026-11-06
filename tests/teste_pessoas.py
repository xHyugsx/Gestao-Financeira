"""Quem fez a despesa: campo no «Novo movimento» e no «Editar movimento», etiqueta na lista e gastos por pessoa na Análise."""
import json
from correr import verificar, PREFIXO

PERFIL = {'profileName': 'Família', 'email': '', 'phone': '', 'members': ['Pessoa A', 'Pessoa B']}
MOV = {'id': 1, 'title': 'Padaria', 'amount': -4, 'date': '2026-09-20', 'detail': '20 setembro · Alimentação', 'movementType': 'expense', 'person': 'Pessoa B'}


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO))


async def t_quem_fez_a_despesa(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir({'profile': PERFIL, 'transactions': [MOV]})
    p = app.page
    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(500)
    verificar(await p.input_value('[role=dialog] input[name=person]') == 'Pessoa B', 'não pré-escolheu a pessoa da última despesa')
    opcoes = await p.evaluate("[...document.querySelectorAll('[role=dialog] [data-campo=person] [data-valor]')].map(o=>o.textContent)")
    verificar(opcoes == ['Pessoa A', 'Pessoa B', '—'], f'opções: {opcoes}')
    await p.fill('[role=dialog] input[name=title]', 'Mercado'); await p.fill('[role=dialog] input[name=amount]', '25')
    await app.escolher('person', 'Pessoa A', '[role=dialog]')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(700)
    novo = next(m for m in (await dados(app))['transactions'] if m['title'] == 'Mercado')
    verificar(novo.get('person') == 'Pessoa A', f'pessoa gravada: {novo}')
    etiquetas = await p.evaluate("[...document.querySelectorAll('.transaction-list .ffpessoa')].map(e=>e.textContent)")
    verificar('Pessoa A' in etiquetas and 'Pessoa B' in etiquetas, f'etiquetas: {etiquetas}')

    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(500)
    verificar(await p.input_value('[role=dialog] input[name=person]') == 'Pessoa A', 'não lembrou a última pessoa')
    await p.click('[role=dialog] .segmented button:text-is("Receita")'); await p.wait_for_timeout(200)
    # nas receitas de salário (a categoria por omissão) aparece «Quem recebe», não «Quem fez» (v2.57.0/v2.59.0)
    verificar(await p.get_attribute('[role=dialog] [data-campo=\"person\"]', 'aria-label') == 'Quem recebe', 'nas receitas, «Quem fez» não aparece')
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)

    await p.click('article[aria-label="Editar Padaria"]'); await p.wait_for_timeout(500)
    verificar(await p.input_value('[role=dialog] input[name=person]') == 'Pessoa B', 'a edição não mostra a pessoa')
    await app.escolher('person', '', '[role=dialog]')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(600)
    padaria = next(m for m in (await dados(app))['transactions'] if m['title'] == 'Padaria')
    verificar('person' not in padaria, f'não apagou a pessoa: {padaria}')

    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(1000)
    linhas = await p.evaluate("""[...document.querySelectorAll('.ffpessoas .chart-legend > div')].map(d=>[...d.children].slice(1,3).map(e=>e.textContent.replace(/\\u00a0/g,' ')))""")
    verificar(linhas == [['Pessoa A', '25,00 €'], ['Sem pessoa', '4,00 €']], f'gastos por pessoa: {linhas}')


async def t_sem_pessoas_nao_mostra_o_campo(app):
    await app.abrir({'transactions': []})
    p = app.page
    await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(500)
    verificar(not await p.query_selector('[role=dialog] [data-campo=\"person\"]'), 'campo sem pessoas no perfil')
