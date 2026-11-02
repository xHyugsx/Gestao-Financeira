"""Correções pedidas pelo dono (só na app nova): recorrentes com periodicidade, ordem alfabética, cores das
categorias, «Poupança Conjunta», categoria como lista no «Editar movimento», transações por data, mudar o nome."""
import json
from correr import verificar, PREFIXO

MOV = lambda i, t, d, cat='Alimentação', v=-10, **x: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'{int(d[8:])} setembro · {cat}', 'movementType': 'expense', **x}
BASE = {'categories': ['Transportes', 'Alimentação', 'Lazer', 'Habitação'], 'transactions': [
    MOV(1, 'Antigo', '2026-09-02'), MOV(2, 'Recente', '2026-09-20', 'Lazer'), MOV(3, 'Meio', '2026-09-10')]}


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}')


async def novo(app):
    await app.page.click('[aria-label="Adicionar movimento"]'); await app.page.wait_for_timeout(500)


async def opcoes(app, seletor):
    return await app.page.evaluate("s=>[...document.querySelectorAll(s+' option')].map(o=>o.textContent)", seletor)


async def t_recorrente_com_periodicidade_cria_as_copias(app):
    await app.abrir({})
    p = app.page
    await novo(app)
    await p.fill('[role=dialog] input[name=title]', 'Renda'); await p.fill('[role=dialog] input[name=amount]', '600')
    await p.fill('[role=dialog] input[name=date]', '2026-06-10')
    caixa = p.locator('[role=dialog] label.checkbox-row', has_text='Recorrente')
    verificar((await caixa.inner_text()).strip() == 'Recorrente', f'rótulo: {await caixa.inner_text()!r}')
    await caixa.locator('input').check(); await p.wait_for_timeout(200)
    verificar(await opcoes(app, '[role=dialog] select[name=recurringEvery]') == ['Mensal', 'Bimestral', 'Trimestral', 'Anual', 'Mensal · dia do salário'], 'periodicidades')
    await p.select_option('[role=dialog] select[name=recurringEvery]', '1')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(800)
    datas = sorted(m['date'] for m in (await dados(app))['transactions'])
    verificar(datas == ['2026-06-10', '2026-07-10', '2026-08-10', '2026-09-10'], f'cópias criadas: {datas}')
    copia = next(m for m in (await dados(app))['transactions'] if m['date'] == '2026-09-10')
    verificar(copia['detail'] == '10 setembro · Alimentação' and copia['amount'] == -600 and copia['recurringEvery'] == 1, f'cópia: {copia}')
    await p.reload(); await p.wait_for_timeout(1500)
    verificar(len((await dados(app))['transactions']) == 4, 'ao reabrir criou cópias repetidas')


async def t_desmarcar_recorrente_para_a_serie(app):
    serie = [MOV(1, 'Ginásio', '2026-08-28', v=-30, recurring='com', recurringEvery=1)]
    await app.abrir({'transactions': serie})
    p = app.page
    verificar(len((await dados(app))['transactions']) == 2, 'não criou a cópia de setembro')
    await p.evaluate("document.querySelector('[aria-label=\"Editar Ginásio\"]').click()"); await p.wait_for_timeout(500)
    await p.locator('[role=dialog] label.checkbox-row', has_text='Recorrente').locator('input').uncheck()
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(500)
    ultima = next(m for m in (await dados(app))['transactions'] if m['date'] == '2026-09-28')
    verificar('recurring' not in ultima and 'recurringEvery' not in ultima, f'a série não parou: {ultima}')


async def t_categorias_por_ordem_alfabetica(app):
    await app.abrir(BASE)
    await novo(app)
    esperado = ['Alimentação', 'Habitação', 'Lazer', 'Transportes']
    await app.page.click('[role=dialog] .ffcat-escolha-abrir'); await app.page.wait_for_timeout(200)
    lista = await app.page.evaluate("[...document.querySelectorAll('[role=dialog] .ffcat-painel-grupo [data-valor]')].map(b=>b.dataset.valor)")
    verificar(lista == esperado, f'lista do novo movimento: {lista}')


async def t_editar_movimento_escolhe_a_categoria_da_lista(app):
    await app.abrir(BASE)
    p = app.page
    await p.evaluate("document.querySelector('[aria-label=\"Editar Recente\"]').click()"); await p.wait_for_timeout(500)
    verificar(await p.input_value('[role=dialog] input[name=category]') == 'Lazer', 'não mostra a categoria atual')
    await p.click('[role=dialog] .ffcat-escolha-abrir'); await p.wait_for_timeout(200)
    lista = await p.evaluate("[...document.querySelectorAll('[role=dialog] .ffcat-painel-grupo [data-valor]')].map(b=>b.dataset.valor)")
    verificar(lista == ['Alimentação', 'Habitação', 'Lazer', 'Transportes'], f'lista do editar: {lista}')
    await app.escolher('category', 'Habitação', '[role=dialog]')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(500)
    m = next(m for m in (await dados(app))['transactions'] if m['title'] == 'Recente')
    verificar(m['detail'] == '20 setembro · Habitação', f'categoria gravada: {m["detail"]}')


async def t_transacoes_recentes_pela_data(app):
    await app.abrir(BASE)
    titulos = await app.page.evaluate("[...document.querySelectorAll('.transaction-list h3')].map(e=>e.textContent)")
    verificar(titulos == ['Recente', 'Meio', 'Antigo'], f'ordem: {titulos}')


async def t_poupanca_conjunta_nao_soma_a_revolut(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir({})
    p = app.page
    await novo(app)
    await p.fill('[role=dialog] input[name=title]', 'Cofre'); await p.fill('[role=dialog] input[name=amount]', '50')
    await p.locator('[role=dialog] label.checkbox-row', has_text='Transferência para Revolut').locator('input').check(); await p.wait_for_timeout(200)
    verificar('Poupança Conjunta' in await opcoes(app, '[role=dialog] select[name=revolutHolder]'), 'falta «Poupança Conjunta»')
    await p.select_option('[role=dialog] select[name=revolutHolder]', 'Poupança Conjunta')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(800)
    cofre = next(m for m in (await dados(app))['transactions'] if m['title'] == 'Cofre')
    verificar(cofre['revolut']['holder'] == 'Poupança Conjunta' and cofre['transferValue'] == 50, f'transferência para a Poupança Conjunta: {cofre}')


async def t_categoria_nova_recebe_cor_que_ninguem_usa(app):
    await app.abrir({})
    p = app.page
    await p.evaluate("window.ffGoPg('categorias')"); await p.wait_for_timeout(800)
    for nome in ('Ginásio', 'Farmácia', 'Livros'):
        await p.click('.page-current [aria-label="Nova categoria"]'); await p.wait_for_timeout(400)
        await p.fill('[role=dialog] input[aria-label="Nome da categoria"]', nome)
        await p.click('[role=dialog] button:text-is("Criar")'); await p.wait_for_timeout(500)
    cores = (await dados(app)).get('categoryColors', {})
    base = {'blue', 'green', 'orange', 'pink', 'violet', 'red', 'yellow', 'cyan'}
    verificar(len(cores) == 3 and len(set(cores.values())) == 3 and not set(cores.values()) & base, f'cores: {cores}')
    tons = await p.evaluate("['Ginásio','Farmácia','Livros'].map(n=>document.querySelector(`.page-current [aria-label='Editar categoria ${n}'] .ffcat-ic`).style.getPropertyValue('--c'))")
    verificar(len(set(tons)) == 3 and all(t.startswith('oklch') for t in tons), f'a cor não aparece: {tons}')


async def t_mudar_o_nome_de_uma_categoria(app):
    await app.abrir(BASE)
    p = app.page
    await p.evaluate("window.ffGoPg('categorias')"); await p.wait_for_timeout(800)
    await p.click('.page-current [aria-label="Editar categoria Alimentação"]'); await p.wait_for_timeout(400)
    await p.fill('[role=dialog] input[aria-label="Nome da categoria"]', 'lazer')
    await p.click('[role=dialog] button:text-is("Guardar")'); await p.wait_for_timeout(300)
    verificar(await p.inner_text('[role=dialog] [role=alert]') == 'Essa categoria já existe.', 'aceitou um nome repetido')
    await p.fill('[role=dialog] input[aria-label="Nome da categoria"]', 'Supermercado')
    await p.click('[role=dialog] button:text-is("Guardar")'); await p.wait_for_timeout(500)
    d = await dados(app)
    verificar('Supermercado' in d['categories'] and 'Alimentação' not in d['categories'], f'categorias: {d["categories"]}')
    detalhes = sorted(m['detail'] for m in d['transactions'])
    verificar(detalhes == ['10 setembro · Supermercado', '2 setembro · Supermercado', '20 setembro · Lazer'], f'movimentos: {detalhes}')


async def t_contas_so_com_nomes(app):
    contas = [{'id': 'principal', 'name': 'Principal', 'balance': 0}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0},
              {'id': 'ed', 'name': 'Cartão refeição', 'balance': 146, 'createdAt': '2026-06', 'lowAt': 20, 'adjDays': {'2026-09-01': -4}}]
    await app.abrir({'accounts': contas, 'transactions': [MOV(1, 'Almoço', '2026-09-10', v=-20, account='ed')]})
    p = app.page
    await p.click('button[aria-label="Jarvis e definições"]'); await p.wait_for_timeout(400)
    await p.click('.set-menu-item:has-text("Contas bancárias")'); await p.wait_for_timeout(500)
    verificar(not await p.query_selector('.settings-panel input[name$="-balance"], .settings-panel input[name$="-low"]'), 'as contas já não têm saldo nem aviso de saldo baixo')
    await p.fill('input[name="ed-name"]', 'Edenred'); await p.click('.settings-panel button[type=submit]'); await p.wait_for_timeout(400)
    conta = next(c for c in (await dados(app))['accounts'] if c['id'] == 'ed')
    verificar(conta == {**contas[2], 'name': 'Edenred'}, f'só o nome muda (o resto fica guardado como estava): {conta}')
