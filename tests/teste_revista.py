"""Resumo › Ano em revista: ecrãs ao estilo «stories» com os números do ano."""
from correr import verificar

MOV = lambda i, d, t, v, cat='Lazer': {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'1 x · {cat}', 'movementType': 'expense' if v < 0 else 'income'}
DADOS = {'transactions': [
    MOV(1, '2026-03-10', 'Mercado', -100, 'Alimentação'), MOV(2, '2026-03-12', 'Renda', -600, 'Habitação'),
    MOV(3, '2026-05-02', 'Mercado', -80, 'Alimentação'), MOV(4, '2026-05-03', 'Poupança', -200, 'Poupança'),
    MOV(5, '2026-05-20', 'Salário', 2000, 'Salário'), MOV(6, '2026-09-01', 'Mercado', -50, 'Alimentação')]}


async def t_ano_em_revista(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(500)
    await p.click('.ffrev-abrir'); await p.wait_for_timeout(500)
    ecras = []
    for _ in range(12):
        ecra = await p.get_attribute('.ffrev-ecra', 'data-ecra')
        ecras.append(ecra)
        if ecra == 'gasto':
            verificar('830,00' in (await p.text_content('.ffrev-ecra')).replace('\xa0', ' '), 'gasto do ano errado')
        if ecra == 'fim': break
        await p.click('.ffrev-palco', position={'x': 300, 'y': 300}); await p.wait_for_timeout(150)
    verificar(ecras == ['capa', 'gasto', 'meses', 'categorias', 'sitios', 'poupanca', 'dias', 'fim'], f'ecrãs: {ecras}')
    await p.click('.ffrev-palco', position={'x': 20, 'y': 300}); await p.wait_for_timeout(150)
    verificar(await p.get_attribute('.ffrev-ecra', 'data-ecra') == 'dias', 'tocar à esquerda não recuou')
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    verificar(not await p.query_selector('.ffrev'), 'Esc não fechou')
