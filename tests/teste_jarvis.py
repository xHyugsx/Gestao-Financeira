from correr import verificar

DADOS = {'transactions': [
    {'id': 1, 'title': 'Continente', 'amount': -120.5, 'date': '2026-08-03', 'detail': '3 agosto · Alimentação', 'movementType': 'expense'},
    {'id': 2, 'title': 'Galp', 'amount': -60, 'date': '2026-08-10', 'detail': '10 agosto · Combustível', 'movementType': 'expense'},
    {'id': 3, 'title': 'Continente', 'amount': -54.3, 'date': '2026-08-24', 'detail': '24 agosto · Alimentação', 'movementType': 'expense'},
    {'id': 4, 'title': 'Continente', 'amount': -80, 'date': '2026-07-12', 'detail': '12 julho · Alimentação', 'movementType': 'expense'},
    {'id': 5, 'title': 'Farmácia', 'amount': -12, 'date': '2026-09-14', 'detail': '14 setembro · Saúde', 'movementType': 'expense', 'note': 'receita do médico'}]}


async def t_gastos_de_outro_mes(app):
    await app.abrir(DADOS)
    r = await app.jarvis('Quanto gastei em agosto?')
    verificar('agosto' in r and '234,80' in r, r)


async def t_seguimento_mantem_o_tema(app):
    await app.abrir(DADOS)
    await app.jarvis('Quanto gastei no Continente em agosto?')
    r = await app.jarvis('E em julho?')
    verificar('Continente em julho' in r and '80,00' in r, r)


async def t_comparacao(app):
    await app.abrir(DADOS)
    r = await app.jarvis('Compara agosto com julho')
    verificar('mais' in r and 'agosto' in r and 'julho' in r, r)


async def t_maior_despesa(app):
    await app.abrir(DADOS)
    r = await app.jarvis('Qual foi a maior despesa de agosto?')
    verificar('Continente' in r and '120,50' in r, r)


async def t_erros_de_escrita(app):
    await app.abrir(DADOS)
    r = await app.jarvis('qto gastei em agosot?')
    verificar('234,80' in r and 'entendi' in r, r)


async def t_nota_de_um_movimento(app):
    await app.abrir(DADOS)
    r = await app.jarvis('Qual era a nota da Farmácia?')
    verificar('receita do médico' in r, r)


async def t_editar_com_confirmacao(app):
    await app.abrir(DADOS)
    r = await app.jarvis('Altera o valor da Galp para 65,90')
    verificar('Confirmas' in r, r)
    await app.page.click('.ffjv-act .ok'); await app.page.wait_for_timeout(700)
    galp = [m for m in await app.movimentos() if m['title'] == 'Galp'][0]
    verificar(galp['amount'] == -65.9, f'valor não mudou: {galp}')


async def t_cancelar_nao_altera(app):
    await app.abrir(DADOS)
    await app.jarvis('Remove a Galp')
    await app.page.click('.ffjv-act .no'); await app.page.wait_for_timeout(600)
    verificar(any(m['title'] == 'Galp' for m in await app.movimentos()), 'apagou apesar de cancelar')


async def t_limpar_conversa_sem_confirmacao(app):
    await app.abrir(DADOS)
    await app.jarvis('Quanto gastei em agosto?')
    await app.page.click('[aria-label="Limpar conversa"]'); await app.page.wait_for_timeout(300)
    n = await app.page.evaluate("document.querySelectorAll('.jarvis-msg').length")
    verificar(n == 1, f'conversa não foi limpa ({n} mensagens)')


async def t_recibo_le_ticket_refeicao(app):
    await app.abrir()
    p = app.page
    await p.click('.jarvis-fab'); await p.wait_for_timeout(400)
    await p.set_input_files('.jarvis-attach input', 'tests/dados/recibo_ficticio.txt'); await p.wait_for_timeout(1200)
    r = await p.evaluate("[...document.querySelectorAll('.jarvis-msg-ai')].pop().textContent")
    verificar('1234,56' in r.replace('.', '').replace(' ', '') and '117,60' in r and '712,17' not in r, r)
