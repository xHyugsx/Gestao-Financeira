"""v2.59.0 — erros da 2.ª ronda como utilizador novo: categoria pelo título, médias e comparações justas, avisos fora das folhas e Jarvis."""
import hashlib
from correr import verificar

M = lambda i, d, t, v, c='Alimentação', **x: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'{int(d[8:])} · {c}', 'movementType': 'expense' if v < 0 else 'income', **x}
TEXTO = lambda sel: f"(document.querySelector('{sel}')?.textContent||'').replace(/\\u00a0/g,' ')"


async def t_categoria_sugerida_pelo_titulo(app):
    await app.abrir({})
    p = app.page
    await p.click('.ffplus'); await p.wait_for_timeout(600)
    for titulo, cat in [('Renda', 'Habitação'), ('Farmácia', 'Saúde'), ('Spotify', 'Lazer'), ('Pingo Doce', 'Alimentação')]:
        await p.fill('[role=dialog] input[name=title]', titulo); await p.wait_for_timeout(150)
        valor = await p.input_value('[role=dialog] input[name=category]')
        verificar(valor == cat, f'«{titulo}» devia sugerir {cat}: {valor}')
    await p.click('[role=dialog] .segmented button:text-is("Receita")'); await p.wait_for_timeout(200)
    await p.fill('[role=dialog] input[name=title]', 'Bónus'); await p.wait_for_timeout(150)
    verificar(await p.input_value('[role=dialog] input[name=category]') == 'Salário', 'uma receita começa em Salário (não em Investimentos)')
    verificar('Recorrente' in (await p.text_content('[role=dialog] .ffdica-linha') or ''), 'no salário, a dica para o tornar recorrente')


async def t_medias_e_comparacoes_justas(app):
    # hoje = 28 de setembro (correr.py); o primeiro movimento é de agosto
    await app.abrir({'transactions': [M(1, '2026-08-05', 'A', -100), M(2, '2026-08-30', 'B', -300), M(3, '2026-09-10', 'C', -150)]})
    p = app.page
    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(900)
    medias = await p.evaluate(TEXTO('.page-current .ffmedias'))
    verificar('Média mensal 275,00 €' in medias, f'a média só desde agosto: {medias}')
    verificar('Média diária 5,36 €' in medias, f'média diária pelos 28 dias passados: {medias}')
    var = await p.evaluate(TEXTO('.page-current .ffresumo-mes .ffhero-var'))
    verificar('↑ 50' in var and 'vs 1 a 28 de agosto' in var, f'compara com 1 a 28 de agosto (100 €): {var}')


async def t_aviso_veterinario_fora_das_folhas(app):
    await app.abrir({'profile': {'profileName': '', 'email': '', 'phone': '', 'members': [], 'pets': [{'name': 'Bobi', 'sex': 'm'}]}},
                    extra={'financas-familiar:vet-reminders': [{'id': 'v1', 'pet': 'Bobi', 'type': 'vacina', 'last': '2025-08-01', 'every': 12}]})
    p = app.page
    await p.wait_for_selector('#ff-vetbn', timeout=9000)
    await p.click('.ffplus'); await p.wait_for_timeout(700)
    verificar(await p.evaluate("getComputedStyle(document.querySelector('#ff-vetbn')).opacity") == '0', 'o lembrete devia sair da frente da folha')
    await p.keyboard.press('Escape'); await p.wait_for_timeout(1500)
    verificar(await p.evaluate("getComputedStyle(document.querySelector('#ff-vetbn')).opacity") == '1', 'e voltar ao fechar a folha')


async def t_jarvis_frases_do_dia_a_dia(app):
    await app.abrir({'transactions': [M(1, '2026-09-28', 'Pão', -12), M(2, '2026-09-21', 'Mercado', -40), M(3, '2026-09-02', 'Renda', -450, 'Habitação', recurring='com')]})
    r = await app.jarvis('quanto gastei esta semana?')
    verificar('Esta semana' in r and '12,00 €' in r.replace(' ', ' '), f'semana: {r}')
    verificar('Posso responder' in await app.jarvis('ajuda'), 'ajuda')
    r = await app.jarvis('em que gasto mais?')
    verificar('Habitação' in r, f'maior categoria: {r}')
    r = await app.jarvis('quais são as despesas fixas?')
    verificar('fixas' in r and '450' in r, f'fixas: {r}')
    r = await app.jarvis('gastei 8 euros no café')
    verificar('Vou registar a despesa «Café»' in r and 'Confirmas' in r, f'«gastei» regista com confirmação: {r}')
    await app.jarvis('cancelar')
    verificar('Definições › Backup' in await app.jarvis('como faço um backup?'), 'como fazer backup')


async def t_pin_errado_avisa_e_app_vazia(app):
    await app.abrir({'pinHash': hashlib.sha256(b'financas-familiar:1234').hexdigest()})
    p = app.page
    await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    for k in '9999': await p.keyboard.press(k)
    await p.wait_for_timeout(500)
    verificar('PIN errado' in (await p.text_content('.ffl-pad h2') or ''), 'PIN errado devia avisar')
    await app.abrir({})
    frase = await p.evaluate(TEXTO('.page-current .ffdica'))
    verificar('seguidos sem despesas' not in frase, f'numa app vazia não há «dias sem despesas»: {frase}')


async def t_sem_salarios_o_cartao_fica_pequeno(app):
    """v2.60.0 (P3): sem nenhum salário, o cartão do rendimento fica pequeno e explica o que fazer; com salários, volta ao normal."""
    await app.abrir({'transactions': [M(1, '2026-09-20', 'Pão', -2)]})
    p = app.page
    verificar(await p.query_selector('.ffhero.ffhero-compacto') and not await p.query_selector('.ffhero-valor'), 'sem salários: cartão pequeno, sem «0,00 €»')
    verificar('Regista-o' in (await p.text_content('.ffhero-falta') or ''), 'devia dizer onde registar o salário')
    await app.abrir({'transactions': [M(1, '2026-08-28', 'Ordenado', 1200, 'Salário')]})
    verificar(not await p.query_selector('.ffhero-compacto') and '1200,00' in (await p.text_content('.ffhero-valor') or ''), 'com salário, o cartão normal')
