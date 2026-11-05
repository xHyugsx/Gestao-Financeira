"""Correções do teste como utilizador novo (v2.56.0): o «+» volta a Despesa, transferências com valor, «Desfazer» à frente do aviso de backup e o Jarvis confirma registos."""
from correr import verificar

M = lambda i, d, t, v, **x: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'{int(d[8:])} setembro · Alimentação', 'movementType': 'expense', **x}


async def abrir_novo(p):
    await p.click('.ffplus'); await p.wait_for_timeout(600)


async def t_mais_volta_a_despesa_depois_de_uma_receita(app):
    await app.abrir({'profile': {'profileName': '', 'email': '', 'phone': '', 'members': [], 'salaryMonth': 'anterior'}})
    p = app.page
    await abrir_novo(p)
    await p.click('[role=dialog] .segmented button:text-is("Receita")'); await p.wait_for_timeout(200)
    await p.fill('[role=dialog] input[name=title]', 'Ordenado'); await p.fill('[role=dialog] input[name=amount]', '1500')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(900)
    await abrir_novo(p)
    rotulo = (await p.text_content('[role=dialog] button[type=submit]') or '').strip()
    titulo = await p.input_value('[role=dialog] input[name=title]')
    verificar(rotulo == 'Guardar despesa', f'o «+» devia abrir numa despesa: {rotulo!r}')
    verificar(titulo == '', f'o título da vez anterior ficou escrito: {titulo!r}')
    await p.fill('[role=dialog] input[name=title]', 'Renda'); await p.fill('[role=dialog] input[name=amount]', '600')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(900)
    renda = next(m for m in await app.movimentos() if m['title'] == 'Renda')
    verificar(renda['amount'] == -600 and renda['movementType'] == 'expense', f'a renda ficou como receita: {renda}')


async def t_transferencia_guarda_valor_e_contas(app):
    await app.abrir({})
    p = app.page
    await abrir_novo(p)
    await p.click('[role=dialog] .segmented button:text-is("Transferência")'); await p.wait_for_timeout(200)
    await p.fill('[role=dialog] input[name=title]', 'Poupança'); await p.fill('[role=dialog] input[name=amount]', '100')
    await p.click('[role=dialog] [data-campo="destination"] [data-valor="revolut"]'); await p.wait_for_timeout(100)
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(900)
    t = (await app.movimentos())[0]
    verificar(t['movementType'] == 'transfer' and t['amount'] == 0 and t['transferValue'] == 100 and t.get('toAccount') == 'revolut', f'transferência: {t}')
    linha = await p.text_content('.page-current .transaction-list article') or ''
    verificar('100,00' in linha, f'a linha devia mostrar o valor: {linha!r}')
    gastos = await app.gastos()
    verificar('0,00 €' in gastos, f'a transferência não é gasto: {gastos}')


async def t_desfazer_fica_a_frente_do_aviso_de_backup(app):
    await app.abrir({'transactions': [M(1, '2026-09-20', 'Padaria', -3), M(2, '2026-09-10', 'Cinema', -12)]}, sem_backup_aviso=False)
    p = app.page
    await p.wait_for_selector('#ff-bk.in', timeout=8000)
    await p.click('.page-current .transaction-list article[aria-label="Editar Padaria"]'); await p.wait_for_timeout(500)
    await p.click('[role=dialog] button:has-text("Eliminar")'); await p.wait_for_timeout(500)
    topo = await p.evaluate("""()=>{const b=document.querySelector('.ffdesfazer button').getBoundingClientRect();
      return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2).closest('.ffdesfazer')?'desfazer':'outro'}""")
    verificar(topo == 'desfazer', 'o aviso de backup tapa o «Desfazer»')
    await p.click('.ffdesfazer button'); await p.wait_for_timeout(500)
    verificar(len(await app.movimentos()) == 2, 'desfazer devia repor o movimento')
    await p.wait_for_timeout(300)
    verificar(await p.evaluate("getComputedStyle(document.querySelector('#ff-bk')).opacity") == '1', 'o aviso de backup devia voltar')


async def t_jarvis_confirma_antes_de_registar(app):
    await app.abrir({'transactions': [M(1, '2026-09-20', 'Padaria', -3)]})
    r = await app.jarvis('adiciona 15€ no pingo doce')
    verificar('Confirmas' in r and 'Pingo Doce' in r, f'devia pedir confirmação: {r}')
    verificar(len(await app.movimentos()) == 1, 'gravou antes de confirmar')
    r = await app.jarvis('confirmar')
    m = (await app.movimentos())[0]
    verificar(m['title'] == 'Pingo Doce' and m['amount'] == -15, f'registo: {m}')
    r = await app.jarvis('regista o salário de 1200')
    r = await app.jarvis('quanto gastei este mês?')
    verificar('Não fiz a ação anterior' in r and len(await app.movimentos()) == 2, f'outra pergunta cancela a ação: {r}')


async def t_jarvis_apaga_o_movimento_certo(app):
    await app.abrir({'transactions': [M(2, '2026-09-21', 'Supermercado', -40), M(1, '2026-09-20', 'Café', -2)]})
    r = await app.jarvis('apaga o café')
    verificar('Café' in r and 'Supermercado' not in r, f'escolheu outro movimento: {r}')
    await app.jarvis('cancelar')
    r = await app.jarvis('apaga o ginásio')
    verificar('Não encontrei' in r and 'ginásio' in r, f'devia dizer que não encontrou: {r}')
    verificar(len(await app.movimentos()) == 2, 'não devia apagar nada')
