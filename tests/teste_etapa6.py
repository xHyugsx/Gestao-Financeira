"""Etapa 6: superfícies na cor de cada tema, barra de estado do Android na cor do tema e avisos no estilo Órbita."""
from correr import verificar

AP = lambda tema: {'appearance': {'accent': 'cyan', 'backgroundIntensity': 75, 'fontScale': 100, 'haptics': True, 'autoHide': 'off', **({'theme': tema} if tema else {})}}
SUP = "getComputedStyle(document.documentElement).getPropertyValue('--orb-sup').trim()"
BARRA = "document.querySelector('meta[name=theme-color]').content"


async def t_superficies_e_barra_de_estado_por_tema(app):
    await app.abrir(AP(None))
    p = app.page
    cosmico = await p.evaluate(SUP)
    verificar(await p.evaluate(BARRA) == '#05091F', 'barra de estado do Cósmico')
    vistos = {cosmico}
    for tema, cor in [('aurora', '#03141c'), ('dourado', '#0b0a08'), ('floresta', '#06120a')]:
        await app.abrir(AP(tema))
        sup = await p.evaluate(SUP)
        verificar(sup not in vistos, f'{tema}: os cartões deviam ter a cor do tema ({sup})')
        vistos.add(sup)
        verificar(await p.evaluate(BARRA) == cor, f'{tema}: barra de estado {await p.evaluate(BARRA)}')
    fundo = await p.evaluate("getComputedStyle(document.querySelector('.bottom-nav')).backgroundColor")
    verificar(fundo.startswith(('oklab', 'oklch', 'rgb')) and fundo != 'rgba(0, 0, 0, 0)', f'doca na cor do tema: {fundo}')


async def t_aviso_de_backup_no_estilo_orbita(app):
    movs = [{'id': i, 'title': 'X', 'amount': -1, 'date': '2026-09-01', 'detail': '1 x · Outros', 'movementType': 'expense'} for i in range(1, 6)]
    await app.abrir({**AP('floresta'), 'transactions': movs}, sem_backup_aviso=False)
    p = app.page
    await p.wait_for_selector('#ff-bk', timeout=15000)
    estilo = await p.evaluate("(()=>{const e=document.querySelector('#ff-bk'), b=e.querySelector('.yes'); return [getComputedStyle(e).borderRadius, getComputedStyle(b).backgroundImage.startsWith('linear-gradient')]})()")
    verificar(estilo[0] == '24px' and estilo[1], f'aviso arredondado e botão com o gradiente do tema: {estilo}')
