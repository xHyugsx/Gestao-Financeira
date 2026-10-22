"""Salário recorrente: cópia no dia do salário por confirmar, previsão com a receita e o recibo preenche o valor."""
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
    verificar((await app.saldos()).get('Principal') == '1500,00 €', 'o salário por confirmar ainda não conta no saldo')
    await p.click('button[aria-label="Mês seguinte"]'); await p.wait_for_timeout(700)
    verificar((await app.saldos()).get('Principal') == '3000,00 €', 'previsão de outubro com o salário estimado (média)')
    nota = (await p.text_content('.page-current .ffprevistos') or '').replace(' ', ' ')
    verificar('1 receita recorrente prevista (≈ +1500,00 €)' in nota, f'nota: {nota}')
    await p.click('button[aria-label="Mês anterior"]'); await p.wait_for_timeout(500)

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
