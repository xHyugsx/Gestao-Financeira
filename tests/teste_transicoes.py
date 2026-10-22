"""Transições: pílula dos separadores, página a deslizar ao mudar de mês, listas e calendário em cascata (e nada disto com movimento reduzido)."""
from correr import verificar

M = lambda i, d, t, v: {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': 'x · Outros', 'movementType': 'expense'}
DADOS = {'transactions': [M(1, '2026-09-03', 'Padaria', -3), M(2, '2026-09-10', 'Cinema', -12), M(3, '2026-08-08', 'Livraria', -20)]}
ANIMACOES = "document.getAnimations().map(a=>a.animationName||a.effect?.target?.className||'waapi')"


async def t_pilula_desliza_entre_opcoes(app):
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('analise')"); await p.wait_for_timeout(800)
    pilula = '.page-current .segmented .ffseg-pilula'
    verificar(await p.evaluate(f"getComputedStyle(document.querySelector('{pilula}')).getPropertyValue('--col').trim()") == '0', 'a pílula devia começar em «Gastos»')
    x0 = await p.evaluate(f"document.querySelector('{pilula}').getBoundingClientRect().x")
    await p.click('.page-current .segmented button:text-is("Diário")'); await p.wait_for_timeout(600)
    caixa = await p.evaluate(f"""(()=>{{const r=document.querySelector('{pilula}').getBoundingClientRect(),
      b=[...document.querySelectorAll('.page-current .segmented button')].find(e=>e.textContent==='Diário').getBoundingClientRect();
      return [r.x, Math.abs(r.x-b.x)<1.5 && Math.abs(r.width-b.width)<1.5]}})()""")
    verificar(caixa[0] > x0 and caixa[1], f'a pílula devia ficar por baixo de «Diário»: {caixa}')
    cor = await p.evaluate("getComputedStyle(document.querySelector('.page-current .segmented .segment-active')).color")
    verificar(cor != await p.evaluate("getComputedStyle(document.querySelector('.page-current .segmented button:not(.segment-active)')).color"), 'a opção escolhida devia ter outra cor de letra')
    # Resumo: separadores em duas linhas
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(800)
    await p.click('.page-current .segmented button:text-is("Despesas anuais")'); await p.wait_for_timeout(600)
    ok = await p.evaluate("""(()=>{const r=document.querySelector('.page-current .ffseg-pilula').getBoundingClientRect(),
      b=document.querySelector('.page-current .segmented .segment-active').getBoundingClientRect();
      return Math.abs(r.x-b.x)<1.5 && Math.abs(r.y-b.y)<1.5 && Math.abs(r.width-b.width)<1.5 && Math.abs(r.height-b.height)<1.5})()""")
    verificar(ok, 'em duas linhas, a pílula devia ficar por baixo da opção escolhida')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_mudar_de_mes_desliza_e_calendario_em_cascata(app):
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('calendario')"); await p.wait_for_timeout(1200)
    nome = await p.evaluate("getComputedStyle(document.querySelector('.page-current .calendar-day')).animationName")
    verificar(nome == 'ffcal-entrar', f'os dias deviam entrar em cascata: {nome}')
    await p.evaluate("window.ffTeste = document.querySelector('.page-current .calendar-grid')")
    await p.click('button[aria-label="Mês anterior"]'); await p.wait_for_timeout(60)
    anim = await p.evaluate(ANIMACOES)
    verificar(len([a for a in anim if a == 'ffcal-entrar']) >= 28, f'o calendário devia voltar a entrar em cascata: {len(anim)}')
    verificar(len([a for a in anim if a == 'waapi' or 'detail-view' in str(a)]) >= 1, f'a página devia deslizar: {anim[:5]}')
    verificar(await p.evaluate("window.ffTeste !== document.querySelector('.page-current .calendar-grid')"), 'a grelha do mês novo devia ser outra')
    await p.wait_for_timeout(900)
    verificar('agosto' in (await p.text_content('.month-switcher span') or ''), 'não mudou para agosto')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_listas_em_cascata(app):
    await app.abrir(DADOS)
    p = app.page
    atrasos = await p.evaluate("[...document.querySelectorAll('.page-current .transaction-list > article')].map(a=>[getComputedStyle(a).animationName, getComputedStyle(a).animationDelay])")
    verificar(atrasos[:2] == [['fflinha-entrar', '0s'], ['fflinha-entrar', '0.035s']], f'as linhas deviam entrar em cascata: {atrasos}')


async def t_movimento_reduzido_sem_animacoes(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('calendario')"); await p.wait_for_timeout(800)
    await p.click('button[aria-label="Mês anterior"]'); await p.wait_for_timeout(60)
    anim = await p.evaluate(ANIMACOES)
    verificar(not [a for a in anim if a in ('ffcal-entrar', 'fflinha-entrar', 'waapi') or 'detail-view' in str(a)], f'com movimento reduzido não há transições: {anim}')
