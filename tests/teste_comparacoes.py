"""Análise: comparação com o mês anterior; Calendário: total da semana e do dia."""
from correr import verificar

M = lambda i, d, t, v, cat='Outros', tipo='expense': {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'x · {cat}', 'movementType': tipo}
DADOS = {'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 1000}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}],
         'categories': ['Alimentação', 'Lazer', 'Saúde'],
         'transactions': [
    M(1, '2026-07-05', 'Super', -100, 'Alimentação'), M(2, '2026-08-10', 'Super', -80, 'Alimentação'), M(3, '2026-08-12', 'Cinema', -40, 'Lazer'),
    M(4, '2026-09-01', 'Super', -120, 'Alimentação'), M(5, '2026-09-02', 'Cinema', -20, 'Lazer'), M(6, '2026-09-08', 'Farmácia', -15, 'Saúde'),
    M(7, '2026-08-25', 'Vencimento', 900, 'Salário', 'income')]}


async def t_comparacao_com_mes_anterior(app):
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(900)
    linhas = await p.evaluate("""[...document.querySelectorAll('.page-current .ffdonut-legenda > div')].map(d=>[d.children[1].textContent, d.querySelector('.ffcomp-var').textContent, d.querySelector('.ffcomp-var').className.includes('amount-negative')])""")
    verificar(linhas == [['Alimentação', '↑ 50%', True], ['Lazer', '↓ 50%', False], ['Saúde', 'novo', False]], f'variações face a agosto: {linhas}')
    barras = await p.evaluate("[...document.querySelectorAll('.page-current .ffdonut-legenda .ffcomp')].map(i=>[parseFloat(i.querySelector('s').style.transform.slice(7)), parseFloat(i.querySelector('b').style.transform.slice(7))])")
    verificar(abs(barras[0][0] - 2 / 3) < 0.001 and barras[0][1] == 1, f'barra fantasma de agosto (80 de 120): {barras[0]}')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_total_da_semana_e_do_dia(app):
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('calendario')"); await p.wait_for_timeout(1000)
    totais = await p.evaluate("[...document.querySelectorAll('.page-current .ffcal-semana')].map(e=>e.textContent.replace(/\\u00a0/g,' '))")
    verificar(totais[:3] == ['140 €', '15 €', '—'], f'totais das semanas de setembro: {totais}')
    verificar(len(totais) == 5, f'5 semanas em setembro de 2026: {totais}')
    await p.click('.page-current .calendar-day:has(span:text-is("1"))'); await p.wait_for_timeout(300)
    cabeca = (await p.text_content('.page-current .calendar-movements .eyebrow') or '').replace('\xa0', ' ')
    verificar(cabeca == '1 de setembro · gasto 120,00 €', f'total do dia escolhido: {cabeca}')
    verificar(not app.erros, f'erros: {app.erros}')
