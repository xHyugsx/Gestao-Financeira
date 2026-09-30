"""Versão de teste em /v2/: dados isolados, menu de cópia/limpeza e bibliotecas offline."""
import json, pathlib
from correr import verificar, Pendente

DADOS = json.loads(pathlib.Path('tests/dados/dados_versao_antiga.json').read_text(encoding='utf-8'))
REAIS = {'financas-familiar:v3': DADOS,
         'financas-familiar:vet-reminders': [{'id': 1, 'pet': 'Sam', 'type': 'vacina', 'last': '2026-01-10', 'every': 12}],
         'financas-familiar:last-backup': '2026-09-27T10:00:00.000Z',
         'financas-familiar:bio': {'id': 'credencial-ficticia', 'pin': 'hash-ficticio'}}
LER_REAIS = "Object.fromEntries(window.ffV2.chaves().filter(k=>k.startsWith('financas-familiar:')).map(k=>[k,window.ffV2.ler(k)]))"
LER_V2 = "Object.fromEntries(window.ffV2.chaves().filter(k=>k.startsWith('financas-v2:')).map(k=>[k,window.ffV2.ler(k)]))"


async def abrir_v2(app, reais=REAIS, v2=None):
    """Grava dados «reais» na raiz (a mesma origem do telemóvel) e abre a /v2/."""
    p = app.page
    await p.goto(app.raiz); await app.esperar_sw()
    await p.evaluate("""([r,v])=>{localStorage.clear();for(const [k,x] of Object.entries({...r,...v}))
      localStorage.setItem(k,typeof x==='string'?x:JSON.stringify(x))}""", [reais, v2 or {}])
    await p.goto(app.raiz + 'v2/'); await app.esperar_sw(); await p.wait_for_timeout(1200)
    return await p.evaluate(LER_REAIS)


async def titulos(app):
    return await app.page.evaluate("[...document.querySelectorAll('.transaction-list h3')].map(e=>e.textContent)")


async def menu(app, *botoes):
    p = app.page
    await p.click('#ffv2-tag'); await p.wait_for_timeout(200)
    for b in botoes:
        await p.click(f'#ffv2-menu button:text-is("{b}")'); await p.wait_for_timeout(200)


async def t_v2_nao_toca_nos_dados_reais(app):
    antes = await abrir_v2(app)
    verificar('Talho' not in await titulos(app), 'a V2 mostrou os dados reais')
    await app.page.click('[aria-label="Ocultar valores"]'); await app.page.wait_for_timeout(300)
    depois = await app.page.evaluate(LER_REAIS)
    verificar(depois == antes, 'a V2 alterou chaves reais')
    v2 = json.loads((await app.page.evaluate(LER_V2)).get('financas-v2:v3', '{}'))
    verificar(v2.get('hideValues') is True, 'a alteração não ficou gravada na V2')


async def t_copiar_dados_da_versao_atual(app):
    antes = await abrir_v2(app)
    await menu(app, 'Copiar dados da versão atual', 'Confirmar'); await app.page.wait_for_timeout(2500)
    verificar((await titulos(app))[:2] == ['Talho', 'Padaria'], f'dados não copiados: {await titulos(app)}')
    v2 = await app.page.evaluate(LER_V2)
    copia, original = json.loads(v2['financas-v2:v3']), json.loads(antes['financas-familiar:v3'])
    verificar(copia['transactions'] == original['transactions'] and copia['salaries'] == original['salaries'], 'cópia diferente do original')
    verificar('financas-v2:vet-reminders' in v2, 'lembretes não copiados')
    verificar('financas-v2:bio' not in v2, 'a impressão digital foi copiada')
    verificar(await app.page.evaluate(LER_REAIS) == antes, 'a cópia alterou os dados reais')


async def t_apagar_dados_da_v2(app):
    so_v2 = {'transactions': [{'id': 9, 'title': 'Só na V2', 'amount': -1, 'date': '2026-09-20', 'detail': '20 setembro · Outros', 'movementType': 'expense'}]}
    antes = await abrir_v2(app, v2={'financas-v2:v3': so_v2, 'financas-v2:autolock': 'off'})
    verificar('Só na V2' in await titulos(app), 'a V2 não mostrou os seus dados')
    await menu(app, 'Apagar dados da V2', 'Confirmar'); await app.page.wait_for_timeout(2500)
    v2 = await app.page.evaluate(LER_V2)  # ao reabrir, a app grava de novo o estado inicial (vazio)
    verificar('financas-v2:autolock' not in v2 and 'Só na V2' not in await titulos(app), 'ficaram dados na V2')
    verificar(await app.page.evaluate(LER_REAIS) == antes, 'apagou dados reais')


async def t_faixa_e_instalacao_so_na_v2(app):
    p = app.page
    await p.goto(app.raiz); await app.esperar_sw()
    verificar(not await p.query_selector('#ffv2-tag') and await p.title() == 'Finanças', 'a raiz mudou')
    await p.goto(app.raiz + 'v2/'); await app.esperar_sw()
    verificar(await p.query_selector('#ffv2-tag') and await p.title() == 'Finanças V2', 'faixa ou título da V2 em falta')
    m = await p.evaluate("fetch('manifest.webmanifest').then(r=>r.json())")
    verificar(m['name'] == 'Finanças V2' and m['id'] == './', f'manifesto da V2: {m}')


async def t_menu_mostra_a_versao_instalada(app):
    await abrir_v2(app)
    await menu(app)
    esperada = json.loads(pathlib.Path('app/versao.json').read_text(encoding='utf-8'))['versao']
    texto = await app.page.inner_text('#ffv2-menu .v')
    verificar(texto == f'Versão {esperada}', f'versão no menu: {texto!r}')


def pdf_de_texto(linhas):
    """PDF mínimo (Helvetica, WinAnsi) com uma linha de texto por item."""
    esc = lambda t: t.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
    corpo = 'BT /F1 11 Tf 40 800 Td 14 TL ' + ' '.join(f'({esc(l)}) Tj T*' for l in linhas) + ' ET'
    stream = corpo.encode('cp1252')
    objs = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            b'<< /Length %d >>\nstream\n' % len(stream) + stream + b'\nendstream',
            b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']
    out, pos = bytearray(b'%PDF-1.4\n'), []
    for i, o in enumerate(objs, 1):
        pos.append(len(out)); out += b'%d 0 obj\n' % i + o + b'\nendobj\n'
    xref = len(out)
    out += b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1) + b''.join(b'%010d 00000 n \n' % p for p in pos)
    out += b'trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n' % (len(objs) + 1, xref)
    return bytes(out)


PERFIL = {'profileName': '', 'email': '', 'phone': '', 'members': ['Hugo', 'Marta']}  # o recibo fictício é do «Hugo»


async def t_v2_le_extratos_e_recibos_sem_internet(app):
    p = app.page
    externos = []
    p.on('request', lambda r: externos.append(r.url) if not r.url.startswith(app.raiz) else None)
    await abrir_v2(app, reais={}, v2={'financas-v2:v3': {'transactions': [], 'profile': PERFIL}})
    await p.reload(); await p.wait_for_timeout(1500)
    await p.context.set_offline(True)
    try:
        await p.reload(); await p.wait_for_timeout(1500)
        await p.click('.jarvis-fab'); await p.wait_for_timeout(400)
        xlsx = pathlib.Path('tests/dados/extrato_ficticio.xlsx').read_bytes()  # com extensão .xls usa a SheetJS
        await p.set_input_files('.jarvis-attach input', {'name': 'extrato.xls', 'mimeType': 'application/vnd.ms-excel', 'buffer': xlsx})
        await p.wait_for_timeout(1500)
        resumo = await p.evaluate("document.querySelector('.ffst-hd>p')?.textContent||''")
        verificar(resumo.startswith('12 movimentos'), f'extrato .xls sem internet: {resumo!r}')
        await p.reload(); await p.wait_for_timeout(1500)
        await p.click('.jarvis-fab'); await p.wait_for_timeout(400)
        linhas = pathlib.Path('tests/dados/recibo_ficticio.txt').read_text(encoding='utf-8').splitlines()
        await p.set_input_files('.jarvis-attach input', {'name': 'recibo.pdf', 'mimeType': 'application/pdf', 'buffer': pdf_de_texto(linhas)})
        await p.wait_for_timeout(2500)
        r = await p.evaluate("[...document.querySelectorAll('.jarvis-msg-ai')].pop().textContent")
        verificar('117,60' in r, f'recibo PDF sem internet: {r[:160]}')
    finally:
        await p.context.set_offline(False)
    verificar(not externos, f'pedidos a servidores externos: {externos[:2]}')
