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
