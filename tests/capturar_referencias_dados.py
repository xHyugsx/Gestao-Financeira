"""Grava o que a app atual (1.9.x) faz com os dados em tests/referencias/dados.json:
dados gravados depois de abrir, backup exportado, saldos, tendências das contas e rendimento.
O núcleo de dados novo (app/src/dados) é comparado com este ficheiro pelos testes unitários.

Correr só quando se quiser fixar um novo comportamento de referência:
      python tests/capturar_referencias_dados.py
Dados 100% fictícios (os nomes nos salários são os que o núcleo atual tem fixos no código).
"""
import asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import correr

DESTINO = pathlib.Path(__file__).parent / 'referencias' / 'dados.json'
ANTIGA = json.loads((pathlib.Path(__file__).parent / 'dados' / 'dados_versao_antiga.json').read_text(encoding='utf-8'))
PERFIL = {'profileName': 'Família Teste', 'email': '', 'phone': '', 'members': ['Pessoa A', 'Pessoa B']}


def sal(a, b):
    return {'Hugo': a, 'Marta': b}


COMPLETO = {
    'profile': PERFIL,
    'accounts': [
        {'id': 'principal', 'name': 'Principal', 'balance': 800},
        {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 150, 'lowAt': 40},
        {'id': 'edenred', 'name': 'Edenred', 'balance': 90, 'adj': {'2026-09': 20}, 'tickets': ['x-2026-09']},
        {'id': 'poupanca', 'name': 'Poupança', 'balance': 1000, 'createdAt': '2026-09'}],
    'salaries': {'2025': sal([0] * 11 + [1400], [0] * 11 + [900]),
                 '2026': sal([1400, 1400, 1450, 1450, 1450, 1500, 1500, 1520, 1520, 0, 0, 0],
                             [900, 900, 900, 950, 950, 1100, 1100, 1100, 0, 0, 0, 0])},
    'categories': ['Habitação', 'Alimentação', 'Transportes', 'Lazer'],
    'incomeCategories': ['Salário', 'Reembolsos', 7, 'Prémios'],
    'categoryIcons': {'Lazer': 'bike'},
    'appearance': {'accent': 'cyan', 'fontScale': 110},
    'notifications': False,
    'annualExpenses': [{'name': 'Seguro', 'amount': 300}],
    'transactions': [
        {'id': 1, 'title': 'Continente', 'amount': -95.4, 'date': '2026-09-04', 'detail': '4 setembro · Alimentação', 'movementType': 'expense'},
        {'id': 2, 'title': 'Galp', 'amount': -55, 'date': '2026-08-09', 'detail': '9 agosto · Combustível', 'movementType': 'expense'},
        {'id': 3, 'title': 'Cinema', 'amount': -14, 'date': '2026-09-12', 'detail': '12 setembro · Lazer', 'movementType': 'expense', 'account': 'revolut'},
        {'id': 4, 'title': 'Pastelaria', 'amount': -7.8, 'date': '2026-09-15', 'detail': '15 setembro · Restauração', 'movementType': 'expense', 'account': 'edenred'},
        {'id': 5, 'title': 'Almoço', 'amount': -9.5, 'date': '2026-08-20', 'detail': '20 agosto · Restauração', 'movementType': 'expense', 'account': 'edenred'},
        {'id': 6, 'title': 'Transferência', 'amount': 0, 'date': '2026-09-10', 'detail': '10 setembro · Transferência', 'movementType': 'transfer', 'transferValue': 100},
        {'id': 7, 'title': 'Para a conjunta', 'amount': 0, 'date': '2026-09-01', 'detail': '1 setembro · Transferência', 'movementType': 'transfer', 'transferValue': 200, 'revolut': {'holder': 'Conjunta'}},
        {'id': 8, 'title': 'Para a conjunta', 'amount': 0, 'date': '2026-08-01', 'detail': '1 agosto · Transferência', 'movementType': 'transfer', 'transferValue': 150, 'revolut': {'holder': 'Conjunta'}},
        {'id': 9, 'title': 'Importado', 'amount': -40, 'date': '2026-09-08', 'detail': '8 setembro · Compras', 'movementType': 'expense', 'affectsBalance': False, 'importKey': 'k1', 'importBatch': 'b1'},
        {'id': 10, 'title': 'Sem data', 'amount': -3, 'detail': '5 setembro · Outros', 'movementType': 'expense'},
        {'id': 11, 'title': 'Reembolso', 'amount': 25, 'date': '2026-09-18', 'detail': '18 setembro · Reembolsos', 'movementType': 'income'},
        {'id': 12, 'title': 'Vencimento extra', 'amount': 300, 'date': '2026-10-02', 'detail': '2 outubro · Salário', 'movementType': 'income'},
        {'id': 13, 'title': 'Juros', 'amount': 4.2, 'date': '2026-09-30', 'detail': '30 setembro · Outras receitas', 'movementType': 'income', 'account': 'poupanca'},
        {'id': 14, 'title': 'Veterinário', 'amount': -45, 'date': '2026-07-12', 'detail': '12 julho · Veterinário', 'movementType': 'expense', 'pet': 'Sam', 'note': 'vacina', 'recurring': True}],
}

CASOS = {
    'vazio': None,
    'versao_antiga': ANTIGA,
    'completo': COMPLETO,
    'revolut_antigo_e_campos_extra': {
        'profile': PERFIL, 'campoDesconhecido': {'a': 1},
        'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 10}, {'id': 'revolut', 'name': 'Revolut', 'balance': 5}],
        'appearance': {'haptics': False}, 'hideValues': False,
        'transactions': [{'id': 1, 'title': 'Pão', 'amount': -2, 'detail': 'dia inválido', 'movementType': 'expense'}]},
    'uma_conta_e_listas_vazias': {
        'profile': PERFIL, 'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 50}],
        'categories': [], 'incomeCategories': [], 'transactions': [], 'salaries': {'2026': sal([0] * 12, [0] * 12)}},
    'salario_por_movimento': {
        'profile': PERFIL,
        'transactions': [
            {'id': 1, 'title': 'Ordenado', 'amount': 1234.5, 'date': '2026-08-27', 'detail': '27 agosto · Salário', 'movementType': 'income'},
            {'id': 2, 'title': 'Vencimento', 'amount': 800, 'date': '2026-07-28', 'detail': '28 julho · Outras receitas', 'movementType': 'income'},
            {'id': 3, 'title': 'Prémio', 'amount': 50, 'date': '2026-08-02', 'detail': '2 agosto · Outras receitas', 'movementType': 'income'}]},
}
COM_PIN = {'profile': PERFIL, 'pinHash': 'a' * 64, 'transactions': []}
OMITIDO = '(perfil por omissão da 1.9.x — não guardado)'
MESES_ATRAS = 9  # setembro de 2026 → dezembro de 2025


async def capturar(app, dados):
    p = app.page
    await app.abrir(dados)
    r = {}
    r['gravado'] = await p.evaluate("JSON.parse(localStorage.getItem('financas-familiar:v3'))")
    b = await p.evaluate("JSON.parse(JSON.stringify(window.ffBk.payload()))"); b.pop('exportedAt', None)
    r['backup'] = b
    r['saldos'] = ' '.join((await app.jarvis('Saldo das contas')).split())
    await p.click('[aria-label="Fechar Jarvis"]'); await p.wait_for_timeout(400)
    r['tendencias'] = await p.evaluate("[...document.querySelectorAll('.account-trend')].map(e=>(e.closest('section')?.querySelector('p')?.innerText||'')+' | '+e.innerText)")
    rend = []
    for _ in range(MESES_ATRAS + 1):
        mes = await p.evaluate("document.querySelector('[aria-label=\"Mês anterior\"]').nextElementSibling.innerText.trim()")
        anel = await p.evaluate("document.querySelector('.ffhero-ring').innerText.replace(/\\s+/g,' ').trim()")
        rend.append(f'{mes} | {anel}')
        await p.click('[aria-label="Mês anterior"]'); await p.wait_for_timeout(900)
    r['rendimento'] = rend
    return r


async def main():
    from playwright.async_api import async_playwright
    srv, url = correr.servidor()
    saida = {'data': correr.DATA_FIXA, 'casos': {}}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        for nome, dados in list(CASOS.items()) + [('com_pin', COM_PIN)]:
            ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, timezone_id='Europe/Lisbon', locale='pt-PT', reduced_motion='reduce')
            page = await ctx.new_page(); await page.clock.set_system_time(correr.DATA_FIXA)
            app = correr.App(page, url)
            if nome == 'com_pin':
                await app.abrir(dados)
                b = await page.evaluate("window.ffBk?JSON.parse(JSON.stringify(window.ffBk.payload())):null")
                if b: b.pop('exportedAt', None)
                r = {'gravado': await page.evaluate("JSON.parse(localStorage.getItem('financas-familiar:v3'))"), 'backup': b}
            else:
                r = await capturar(app, dados)
            if app.erros:
                sys.exit(f'{nome}: erros na página: {app.erros[:2]}')
            if not (dados or {}).get('profile'):  # perfil por omissão da 1.9.x tem nomes reais: não o guardar
                for alvo in (r['gravado'], (r.get('backup') or {}).get('data') or {}):
                    alvo['profile'] = OMITIDO
            saida['casos'][nome] = {'entrada': dados, **r}
            await ctx.close()
        await browser.close()
    srv.shutdown()
    DESTINO.write_text(json.dumps(saida, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"{len(saida['casos'])} casos gravados em {DESTINO.relative_to(correr.RAIZ)}")


if __name__ == '__main__':
    asyncio.run(main())
