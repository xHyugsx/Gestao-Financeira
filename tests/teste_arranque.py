from correr import verificar


async def t_app_abre_sem_erros(app):
    await app.abrir()
    verificar(await app.page.query_selector('.bottom-nav'), 'barra inferior não apareceu')
    verificar(await app.page.query_selector('.ffhero-ring'), 'círculo do rendimento não apareceu')


async def t_versao_igual_em_app_js_e_version_json(app):
    await app.abrir()
    v_js = await app.page.evaluate("fetch('js/app.js').then(r=>r.text()).then(t=>t.match(/ffVer=`([^`]+)`/)[1])")
    v_json = await app.page.evaluate("fetch('version.json').then(r=>r.json()).then(j=>j.version)")
    verificar(v_js == v_json, f'versões diferentes: app.js {v_js} · version.json {v_json}')


async def t_todos_os_ficheiros_do_version_json_existem(app):
    await app.abrir()
    falta = await app.page.evaluate("fetch('version.json').then(r=>r.json()).then(j=>Promise.all(j.files.map(f=>fetch(f).then(r=>r.ok?null:f)))).then(l=>l.filter(Boolean))")
    verificar(not falta, f'ficheiros em falta: {falta}')


async def t_ordem_das_paginas_na_barra(app):
    await app.abrir()
    barra = await app.page.evaluate("[...document.querySelectorAll('.bottom-nav-inner > *')].map(e=>e.classList.contains('ffnav-gap')?'+':e.textContent.trim())")
    verificar(barra == ['Principal', 'Análise', '+', 'Calendário', 'Mais'], f'barra inesperada: {barra}')
