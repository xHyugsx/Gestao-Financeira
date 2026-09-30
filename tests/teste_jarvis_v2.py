"""Jarvis na app nova: recibos sem nomes fixos no código (pessoas dos salários/perfil, entidade pelas regras pessoais)."""
import json, tempfile
from correr import verificar, PREFIXO

RECIBO = '\n'.join(['Recibo de Vencimento', 'Junho 2026', 'EMPRESA FICTICIA LDA', 'Remuneração Base 2026/06 1.500,00 €',
                    'Transf. Ticket Refeição 2026/06 117,60 €', 'Valor líquido a receber pelo colaborador 1.234,56 €'])
DADOS = {'salaries': {'2026': {'Ana': [0] * 12, 'Rui': [0] * 12}}, 'importConfig': {'rules': [{'contem': 'Empresa Ficticia', 'acao': 'salario', 'pessoa': 'Rui'}]},
         'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 0}, {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 0},
                      {'id': 'ed', 'name': 'Edenred', 'balance': 10, 'createdAt': '2026-01'}]}


def ficheiro(texto):
    f = tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8'); f.write(texto); f.close()
    return f.name


async def anexar(app, caminho):
    p = app.page
    await p.click('.jarvis-fab'); await p.wait_for_timeout(400)
    await p.set_input_files('.jarvis-attach input', caminho); await p.wait_for_timeout(1200)
    return await p.evaluate("[...document.querySelectorAll('.jarvis-msg-ai')].pop().textContent")


async def t_recibo_pela_entidade_e_confirmar(app):
    await app.abrir(DADOS)
    r = await anexar(app, ficheiro(RECIBO))
    verificar('· Rui · junho 2026' in r and '1234,56' in r.replace('.', '').replace('\xa0', ' ') and 'Confirmas' in r, r)
    await app.page.click('.ffjv-act .ok'); await app.page.wait_for_timeout(900)
    d = json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO))
    verificar(d['salaries']['2026']['Rui'][5] == 1234.56, f'salário: {d["salaries"]}')
    ed = next(a for a in d['accounts'] if a['id'] == 'ed')
    verificar(abs(ed['balance'] - 127.6) < 0.001 and ed['tickets'] == ['Rui-2026-06'], f'Edenred: {ed}')


async def t_recibo_sem_pessoa_conhecida(app):
    await app.abrir({'salaries': {'2026': {'Ana': [0] * 12, 'Rui': [0] * 12}}})
    r = await anexar(app, ficheiro(RECIBO))
    verificar(r == 'Recebi um recibo, mas não consegui identificar se é de Ana ou Rui.', r)
