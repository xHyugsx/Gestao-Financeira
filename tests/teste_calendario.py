"""Calendário: pontos por tipo, fim de semana, mapa de calor dos gastos e dias sem despesas."""
from correr import verificar


async def t_pontos_e_fim_de_semana(app):
    await app.abrir({'transactions': [
        {'id': 1, 'title': 'Venda', 'amount': 40, 'date': '2026-09-15', 'detail': 'x', 'movementType': 'income'},
        {'id': 2, 'title': 'Loja', 'amount': -8, 'date': '2026-09-15', 'detail': 'x', 'movementType': 'expense'},
        {'id': 3, 'title': 'Renda', 'amount': -600, 'date': '2026-09-01', 'detail': 'x', 'movementType': 'expense', 'recurring': 'com'}]})
    p = app.page
    await p.evaluate("[...document.querySelectorAll('.nav-item')].find(b=>b.textContent.includes('Calendário')).click()"); await p.wait_for_timeout(1000)
    pontos = await p.evaluate("Object.fromEntries([...document.querySelectorAll('.page-current .calendar-day')].map(b=>[b.querySelector('span').textContent,[...b.querySelectorAll('.ffdots i')].map(i=>i.className.replace('ffd-',''))]).filter(x=>x[1].length))")
    verificar(pontos == {'1': ['rec'], '15': ['in', 'out']}, f'pontos: {pontos}')
    fds = await p.evaluate("[...document.querySelectorAll('.page-current .calendar-day.ffcal-we span:first-child')].slice(0,2).map(s=>s.textContent)")
    verificar(fds == ['5', '6'], f'fim de semana: {fds}')


MOV = lambda i, d, v, t='expense': {'id': i, 'title': f'M{i}', 'amount': v, 'date': f'2026-09-{d:02d}', 'detail': f'{d} setembro · Lazer', 'movementType': t}
DADOS = {'transactions': [MOV(1, 3, -100), MOV(2, 3, -20), MOV(3, 10, -30), MOV(4, 12, -2), MOV(5, 15, 800, 'income')]}


async def t_mapa_de_calor_e_dias_sem_despesas(app):
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('calendario')"); await p.wait_for_timeout(800)
    classes = await p.evaluate("Object.fromEntries([...document.querySelectorAll('.calendar-day')].map(b=>[b.querySelector('span').textContent, b.className]))")
    verificar('ffcal-q4' in classes['3'] and 'ffcal-q3' in classes['10'] and 'ffcal-q2' in classes['12'], f'níveis: {classes["3"]} | {classes["10"]} | {classes["12"]}')
    verificar('ffcal-zero' in classes['1'] and 'ffcal-zero' in classes['15'] and 'ffcal-zero' in classes['28'], 'faltam os dias sem despesas')
    verificar('ffcal-zero' not in classes['29'] and 'ffcal-q' not in classes['29'], 'dias futuros marcados')
    resumo = (await p.text_content('.ffcal-resumo')).replace('\xa0', ' ')
    verificar(resumo == '25 dias sem despesas · dia mais caro: 3 (120,00 €)', resumo)
    verificar(await p.query_selector('.ffcal-calor .ffcal-q4'), 'falta a legenda do mapa de calor')


async def t_cores_do_gasto_sem_confusao_com_os_tipos(app):
    await app.abrir({'transactions': [
        MOV(1, 3, -100), MOV(2, 10, -30), MOV(3, 12, -2), MOV(4, 15, 800, 'income'), MOV(5, 18, -50),
        {'id': 6, 'title': 'Revolut', 'amount': -40, 'date': '2026-09-20', 'detail': 'x', 'movementType': 'transfer'},
        {'id': 7, 'title': 'Renda', 'amount': -600, 'date': '2026-09-21', 'detail': 'x', 'movementType': 'expense', 'recurring': 'com'}]})
    p = app.page
    await p.evaluate("window.ffGoPg('calendario')"); await p.wait_for_timeout(1200)
    fundo = lambda n: p.evaluate(f"getComputedStyle(document.querySelector('.ffcal-calor .ffcal-q{n}')).backgroundColor")
    cores = [await fundo(n) for n in (1, 2, 3, 4)]
    rgb = [tuple(int(x) for x in c[c.index('(') + 1:].split(',')[:3]) for c in cores]
    verificar(rgb == [(34, 197, 94), (250, 204, 21), (249, 115, 22), (239, 68, 68)], f'verde → amarelo → laranja → vermelho: {cores}')
    simbolos = await p.evaluate("""[...document.querySelectorAll('.page-current .ffdots i, .ffcal-legend i')].map(i=>[i.className, getComputedStyle(i).backgroundColor, getComputedStyle(i).maskImage || getComputedStyle(i).webkitMaskImage])""")
    tipos = {s[0] for s in simbolos}
    verificar(tipos == {'ffd-in', 'ffd-out', 'ffd-rec', 'ffd-tr'}, f'símbolos dos quatro tipos: {tipos}')
    verificar(len({s[1] for s in simbolos}) == 1, f'os símbolos têm todos a mesma cor (sem verde/vermelho/amarelo): {set(s[1] for s in simbolos)}')
    verificar(all('svg' in (s[2] or '') for s in simbolos), 'os tipos distinguem-se pela forma')
    fds = await p.evaluate("getComputedStyle(document.querySelector('.page-current .calendar-day.ffcal-we:not([class*=ffcal-q])')).color")
    verificar('248, 113, 113' not in fds, f'o fim de semana já não é vermelho: {fds}')
    await p.click('.page-current .calendar-day:has(span:text-is("3"))'); await p.wait_for_timeout(300)
    escolhido = await p.evaluate("getComputedStyle(document.querySelector('.page-current .calendar-day-active')).backgroundImage")
    verificar(escolhido == 'none', f'o dia escolhido mantém a cor do gasto (sem gradiente por cima): {escolhido}')
    verificar(not app.erros, f'erros: {app.erros}')
