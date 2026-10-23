"""Jarvis: mensagens novas com animação e perguntas de seguimento que o Jarvis percebe; Ano em revista: partilhar como imagem."""
from correr import verificar

M = lambda i, d, t, v, cat='Outros', tipo='expense': {'id': i, 'title': t, 'amount': v, 'date': d, 'detail': f'x · {cat}', 'movementType': tipo}
DADOS = {'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 1000}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}],
         'salaries': {'2026': {'Ana': [1400] * 12}},
         'transactions': [M(1, '2026-08-05', 'Super', -80, 'Alimentação'), M(2, '2026-09-03', 'Super', -120, 'Alimentação'),
                          M(3, '2026-09-10', 'Galp', -50, 'Combustível'), M(4, '2026-08-11', 'Galp', -45, 'Combustível'),
                          M(5, '2026-08-25', 'Vencimento', 1400, 'Salário', 'income'), M(6, '2026-07-12', 'Clínica', -30, 'Veterinário'),
                          M(7, '2026-09-12', 'Clínica', -25, 'Veterinário')]}
NAO_SEI = 'Ainda não sei responder'


async def t_seguimentos_que_o_jarvis_percebe(app):
    await app.abrir(DADOS)
    p = app.page
    for base in ['Quanto gastei este mês?', 'Saldo das contas', 'Rendimento do mês', 'Receitas do mês', 'Maior categoria', 'Combustível este mês', 'Veterinário este mês']:
        await app.jarvis(base)
        seg = await p.evaluate("[...document.querySelectorAll('.ffjv-row .ffjv-seg')].map(b=>b.textContent.replace('↪ ',''))")
        verificar(seg, f'«{base}» devia ter perguntas de seguimento')
        for q in seg:
            await p.click(f'.ffjv-row .ffjv-seg:text-is("↪ {q}")'); await p.wait_for_timeout(750)
            r = await p.evaluate("[...document.querySelectorAll('.jarvis-msg-ai')].pop().textContent")
            verificar(NAO_SEI not in r, f'«{q}» (depois de «{base}») não foi percebido: {r}')
            await app.jarvis(base)
    verificar(not app.erros, f'erros: {app.erros}')


async def t_mensagens_novas_com_animacao(app):
    await app.abrir(DADOS)
    p = app.page
    await app.jarvis('Quanto gastei este mês?')
    verificar(await p.evaluate("[...document.querySelectorAll('.jarvis-box-msgs > *')].slice(-2).every(e=>e.className.includes('ffjv-novo'))"), 'as mensagens novas deviam ter animação')
    await p.click('[aria-label="Fechar Jarvis"]'); await p.wait_for_timeout(400)
    await p.click('.jarvis-fab'); await p.wait_for_timeout(500)
    verificar(not await p.query_selector('.jarvis-box-msgs .ffjv-novo'), 'ao reabrir, as mensagens antigas aparecem sem animação')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_partilhar_ano_em_revista(app):
    await app.abrir(DADOS)
    p = app.page
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(800)
    await p.click('.page-current .ffrev-abrir'); await p.wait_for_timeout(600)
    await p.click('.ffrev-palco', position={'x': 300, 'y': 300}); await p.wait_for_timeout(500)
    async with p.expect_download() as d:
        await p.click('.ffrev-partilhar')
    ficheiro = await d.value
    verificar(ficheiro.suggested_filename == 'ano-em-revista-2026-gasto.png', f'nome do ficheiro: {ficheiro.suggested_filename}')
    caminho = await ficheiro.path()
    cabeca = open(caminho, 'rb').read(8)
    verificar(cabeca == b'\x89PNG\r\n\x1a\n', 'devia ser uma imagem PNG')
    await p.wait_for_timeout(300)
    verificar('Imagem guardada' in (await p.text_content('.ffrev-estado') or ''), 'falta o aviso «Imagem guardada»')
    # com o menu «Partilhar» do Android
    await p.evaluate("""window.ffPartilhado = null; navigator.canShare = () => true;
      navigator.share = async (d) => { window.ffPartilhado = [d.files[0].name, d.files[0].type, d.files[0].size]; }; true""")
    await p.click('.ffrev-partilhar'); await p.wait_for_timeout(1200)
    partilha = await p.evaluate("window.ffPartilhado")
    verificar(partilha and partilha[1] == 'image/png' and partilha[2] > 5000, f'ficheiro partilhado: {partilha}')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_sem_partilha_com_valores_ocultos(app):
    await app.abrir(DADOS)
    p = app.page
    await p.click('[aria-label="Ocultar valores"]'); await p.wait_for_timeout(300)
    await p.evaluate("window.ffGoPg('resumo')"); await p.wait_for_timeout(800)
    await p.click('.page-current .ffrev-abrir'); await p.wait_for_timeout(600)
    verificar(not await p.query_selector('.ffrev-partilhar'), 'com os valores ocultos, não há partilha')
