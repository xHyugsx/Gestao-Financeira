from correr import verificar


async def t_criar_movimento_com_nota(app):
    await app.abrir()
    await app.novo_movimento('Supermercado', '20,00', 'Compras da semana')
    m = await app.movimentos()
    verificar(len(m) == 1 and m[0]['amount'] == -20 and m[0].get('note') == 'Compras da semana', f'movimento mal gravado: {m}')


async def t_pesquisa_encontra_pela_nota(app):
    await app.abrir({'transactions': [
        {'id': 1, 'title': 'Loja A', 'amount': -10, 'date': '2026-09-10', 'detail': '10 setembro · Lazer', 'movementType': 'expense', 'note': 'presente de anos'},
        {'id': 2, 'title': 'Loja B', 'amount': -5, 'date': '2026-09-11', 'detail': '11 setembro · Lazer', 'movementType': 'expense'}]})
    p = app.page
    await p.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Ver todas').click()"); await p.wait_for_timeout(400)
    await p.fill('.tx-search input', 'anos'); await p.wait_for_timeout(300)
    t = await p.evaluate("[...document.querySelectorAll('.transaction-list h3')].map(e=>e.textContent)")
    verificar(t == ['Loja A'], f'pesquisa devolveu {t}')


async def t_filtro_por_conta(app):
    await app.abrir({'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 0}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}, {'id': 'ed', 'name': 'Cartão refeição', 'balance': 50}],
                     'transactions': [{'id': 1, 'title': 'Almoço', 'amount': -8, 'date': '2026-09-10', 'detail': '10 setembro · Alimentação', 'movementType': 'expense', 'account': 'ed'},
                                      {'id': 2, 'title': 'Loja', 'amount': -5, 'date': '2026-09-11', 'detail': '11 setembro · Lazer', 'movementType': 'expense'}]})
    p = app.page
    await p.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Ver todas').click()"); await p.wait_for_timeout(400)
    await p.locator('.ffacc-row button', has_text='Cartão refeição').click(); await p.wait_for_timeout(300)
    t = await p.evaluate("[...document.querySelectorAll('.transaction-list h3')].map(e=>e.textContent)")
    verificar(t == ['Almoço'], f'filtro devolveu {t}')
