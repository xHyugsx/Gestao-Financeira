"""Análise, Calendário, Categorias e Resumo: o que se grava e a navegação."""
import asyncio, datetime, json
from correr import verificar, PREFIXO, DATA_FIXA

HOJE = datetime.date.fromisoformat(DATA_FIXA[:10])  # o navegador dos testes está sempre nesta data
DATA = HOJE.replace(day=5).isoformat()
MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][HOJE.month - 1]
DADOS = {'transactions': [
    {'id': 1, 'title': 'Continente', 'amount': -42.5, 'date': DATA, 'detail': f'5 {MES} · Alimentação', 'movementType': 'expense'},
    {'id': 2, 'title': 'Vencimento', 'amount': 1500, 'date': DATA, 'detail': f'5 {MES} · Salário', 'movementType': 'income'}],
    'profile': {'profileName': 'Família Teste', 'email': '', 'phone': '', 'members': ['Ana', 'Rui']}}


async def dados(app):
    return json.loads(await app.page.evaluate("P=>localStorage.getItem(P+'v3')", PREFIXO) or '{}')


async def ir(app, pagina):
    await app.page.evaluate(f"window.ffGoPg('{pagina}')"); await app.page.wait_for_timeout(800)


async def segmento(app, texto):
    await app.page.click(f'.page-current .segmented button:text-is("{texto}")'); await app.page.wait_for_timeout(300)


async def t_voltar_do_telemovel_volta_a_principal(app):
    await app.abrir(DADOS)
    p = app.page
    await p.click('.nav-item:has-text("Análise")'); await p.wait_for_timeout(900)
    verificar(await p.inner_text('.app-heading h1') == 'Análise', 'não abriu a Análise')
    await p.go_back(); await p.wait_for_timeout(900)
    verificar(await p.query_selector('.app-heading-welcome'), 'o «voltar» do telemóvel não voltou à Principal')


async def t_analise_mostra_os_gastos_do_mes(app):
    await app.abrir(DADOS)
    await ir(app, 'analise')
    total = await app.page.inner_text('.page-current .donut strong')
    verificar(total.replace('\xa0', ' ') == '42,50 €', f'total dos gastos: {total!r}')
    await segmento(app, 'Receitas')
    total = await app.page.inner_text('.page-current .donut strong')
    verificar(total.replace('\xa0', ' ') == '1500,00 €', f'total das receitas: {total!r}')


async def t_calendario_abre_o_movimento_do_dia(app):
    await app.abrir(DADOS)
    p = app.page
    await ir(app, 'calendario')
    await p.click('.page-current .calendar-day:has(span:text-is("5"))'); await p.wait_for_timeout(300)
    verificar(await p.inner_text('.page-current .calendar-movements .section-heading strong') == '2', 'não mostrou os 2 movimentos do dia 5')
    await p.click('.page-current [aria-label="Editar Continente"]'); await p.wait_for_timeout(500)
    verificar(await p.query_selector('.movement-dialog'), 'não abriu o movimento para editar')


async def t_criar_mudar_icone_e_eliminar_categoria(app):
    await app.abrir(DADOS)
    p = app.page
    await ir(app, 'categorias')
    await p.fill('.page-current .inline-add input', 'Ginásio')
    await p.click('.page-current [aria-label="Livros"]')
    await p.click('.page-current [aria-label="Adicionar categoria"]'); await p.wait_for_timeout(400)
    d = await dados(app)
    verificar('Ginásio' in d['categories'] and d['categoryIcons'].get('Ginásio') == 'books', f'categoria criada: {d["categories"]} {d["categoryIcons"]}')
    await p.click('.page-current .category-row:has(h2:text-is("Ginásio")) .category-icon-edit'); await p.wait_for_timeout(400)
    await p.click('[role=dialog] [aria-label="Música"]')
    await p.click('[role=dialog] button:text-is("Guardar")'); await p.wait_for_timeout(400)
    verificar((await dados(app))['categoryIcons'].get('Ginásio') == 'music', 'o ícone novo não ficou gravado')
    p.on('dialog', lambda x: asyncio.ensure_future(x.accept()))
    await p.click('.page-current [aria-label="Eliminar Alimentação"]'); await p.wait_for_timeout(300)
    verificar('Alimentação' in (await dados(app))['categories'], 'eliminou uma categoria usada por movimentos')
    msg = await p.inner_text('.page-current .category-manager .settings-message')
    verificar(msg == 'Esta categoria está a ser usada por movimentos e não pode ser eliminada.', f'mensagem: {msg!r}')
    await p.click('.page-current [aria-label="Eliminar Ginásio"]'); await p.wait_for_timeout(400)
    d = await dados(app)
    verificar('Ginásio' not in d['categories'] and 'Ginásio' not in d['categoryIcons'], 'a categoria não foi eliminada')


async def t_despesa_anual_e_salario_ficam_gravados(app):
    await app.abrir(DADOS)
    p = app.page
    await ir(app, 'resumo')
    await segmento(app, 'Despesas anuais')
    await p.fill('.page-current input[name=name]', 'IUC')
    await p.fill('.page-current input[name=value]', '120,50')
    await p.click('.page-current form button[type=submit]'); await p.wait_for_timeout(400)
    anual = (await dados(app)).get('annualExpenses', [])
    verificar(len(anual) == 1 and anual[0]['name'] == 'IUC' and anual[0]['value'] == 120.5, f'despesa anual: {anual}')
    await segmento(app, 'Salários')
    # a app atual tem os nomes da tabela fixos no código; a nova usa os do perfil (plano §4.1)
    campo = p.locator(f'.page-current .salary-table tbody tr:nth-child({HOJE.month}) input').first
    pessoa = (await campo.get_attribute('aria-label')).split(' de ')[1].split(' em ')[0]
    await campo.fill('1.234,56'); await campo.press('Enter'); await p.wait_for_timeout(400)
    valores = (await dados(app))['salaries'][str(HOJE.year)][pessoa]
    verificar(valores[HOJE.month - 1] == 1234.56, f'salário gravado: {valores}')
