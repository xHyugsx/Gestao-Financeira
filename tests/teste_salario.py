"""Salário recorrente: cópia no dia do salário por confirmar e o recibo preenche o valor."""
import json, tempfile
from correr import verificar, PREFIXO

RECIBO = '\n'.join(['Recibo de Vencimento', 'Setembro 2026', 'EMPRESA FICTICIA LDA', 'Remuneração Base 2026/09 1.500,00 €',
                    'Valor líquido a receber pelo colaborador 1.234,56 €'])
DADOS = {'salaries': {'2026': {'Ana': [0] * 12, 'Rui': [0] * 12}}, 'importConfig': {'rules': [{'contem': 'Empresa Ficticia', 'acao': 'salario', 'pessoa': 'Rui'}]},
         'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 0}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0}],
         'transactions': [{'id': 1, 'title': 'Salário Rui', 'amount': 1500, 'date': '2026-08-27', 'detail': '27 agosto · Salário', 'movementType': 'income',
                           'recurring': 'sem', 'recurringEvery': 1, 'recurringDay': 'salario'}]}


def ficheiro(texto):
    f = tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8'); f.write(texto); f.close()
    return f.name


async def t_salario_recorrente_e_recibo(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    ms = sorted(await app.movimentos(), key=lambda m: m['date'])
    verificar([(m['date'], m['amount']) for m in ms] == [('2026-08-27', 1500), ('2026-09-28', 0)], f'cópia no dia do salário (28/09), por confirmar: {ms}')
    verificar(await p.query_selector('.page-current article[aria-label="Editar Salário Rui"] .ffconfirmar'), 'falta «Valor por confirmar» no salário')
    await p.click('.jarvis-fab'); await p.wait_for_timeout(400)
    await p.set_input_files('.jarvis-attach input', ficheiro(RECIBO)); await p.wait_for_timeout(1200)
    r = (await p.evaluate("[...document.querySelectorAll('.jarvis-msg-ai')].pop().textContent")).replace(' ', ' ')
    verificar('Receita «Salário Rui» de setembro, por confirmar' in r, r)
    await p.click('.ffjv-act .ok'); await p.wait_for_timeout(900)
    d = json.loads(await p.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO))
    sal = [m for m in d['transactions'] if m['date'] == '2026-09-28'][0]
    verificar(sal['amount'] == 1234.56 and d['salaries']['2026']['Rui'][8] == 1234.56, f'receita confirmada pelo recibo: {sal}')
    verificar(not app.erros, f'erros: {app.erros}')


async def t_periodicidade_dia_do_salario_no_formulario(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.locator('.page-current article[aria-label="Editar Salário Rui"]').first.click(); await p.wait_for_timeout(500)
    verificar(await p.input_value('[role=dialog] select[name=recurringEvery]') == 'salario', 'a periodicidade devia mostrar «Mensal · dia do salário»')
    verificar('Mensal · dia do salário' in (await p.text_content('[role=dialog] select[name=recurringEvery]') or ''), 'falta a opção no formulário')
    verificar(not app.erros, f'erros: {app.erros}')



async def t_salario_confirmado_a_mao_atualiza_a_tabela(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    await p.locator('.page-current article[aria-label="Editar Salário Rui"]').first.click(); await p.wait_for_timeout(500)
    verificar(await p.input_value('[role=dialog] input[name=date]') == '2026-09-28', 'devia abrir a receita de setembro (por confirmar)')
    await p.fill('[role=dialog] input[name=amount]', '1450'); await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(700)
    d = json.loads(await p.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO))
    verificar(d['salaries']['2026']['Rui'][8] == 1450, f'tabela de Salários de setembro: {d["salaries"]}')
    verificar(not app.erros, f'erros: {app.erros}')



async def t_salario_corrigido_pelo_jarvis_atualiza_a_tabela(app):
    await app.page.emulate_media(reduced_motion='reduce')
    await app.abrir(DADOS)
    p = app.page
    r = await app.jarvis('muda o salário rui para 1450 €')
    verificar('Confirmas' in r, r)
    await p.click('.ffjv-act .ok'); await p.wait_for_timeout(900)
    d = json.loads(await p.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO))
    sal = sorted(d['transactions'], key=lambda m: m['date'])[-1]
    verificar(sal['amount'] == 1450 and d['salaries']['2026']['Rui'][8] == 1450, f'Jarvis: receita {sal} · salários {d["salaries"]}')
    verificar(not app.erros, f'erros: {app.erros}')
