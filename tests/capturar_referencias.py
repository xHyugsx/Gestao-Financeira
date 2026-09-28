"""Grava as respostas de referência do Jarvis (golden master) em tests/referencias/jarvis.json.

Correr só quando se quiser fixar um novo comportamento de referência:
      python tests/capturar_referencias.py
O teste teste_referencias.py compara a app com este ficheiro. Dados 100% fictícios.
"""
import asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import correr

DESTINO = pathlib.Path(__file__).parent / 'referencias' / 'jarvis.json'


def mov(i, titulo, valor, data, cat, tipo='expense', **extra):
    meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
    d = int(data[8:]); m = meses[int(data[5:7]) - 1]
    return {'id': i, 'title': titulo, 'amount': valor, 'date': data, 'detail': f'{d} {m} · {cat}', 'movementType': tipo, **extra}


DADOS = {
    'accounts': [{'id': 'principal', 'name': 'Principal', 'balance': 800},
                 {'id': 'revolut', 'name': 'Revolut Conjunta', 'balance': 150},
                 {'id': 'edenred', 'name': 'Edenred', 'balance': 90}],
    'salaries': {'2026': {'Hugo': [0, 0, 0, 0, 0, 1500, 1500, 1520, 1520, 0, 0, 0],
                          'Marta': [0, 0, 0, 0, 0, 1100, 1100, 1100, 1150, 0, 0, 0]}},
    'transactions': [
        mov(1, 'Continente', -95.4, '2026-06-04', 'Alimentação'),
        mov(2, 'Galp', -55, '2026-06-09', 'Combustível'),
        mov(3, 'Restaurante Mar Azul', -42.5, '2026-06-14', 'Restauração'),
        mov(4, 'Farmácia Central', -18.9, '2026-06-20', 'Saúde'),
        mov(5, 'Pingo Doce', -63.2, '2026-06-27', 'Alimentação', account='revolut'),
        mov(6, 'Continente', -110.3, '2026-07-03', 'Alimentação'),
        mov(7, 'Repsol', -61.2, '2026-07-08', 'Combustível'),
        mov(8, 'Clínica Vet Patas', -45, '2026-07-12', 'Veterinário', pet='Sam', note='vacina anual'),
        mov(9, 'Cinema Estrela', -14, '2026-07-19', 'Lazer', account='revolut'),
        mov(10, 'Lidl', -38.75, '2026-07-22', 'Alimentação'),
        mov(11, 'Condomínio', -45, '2026-07-01', 'Habitação', recurring=True),
        mov(12, 'Reembolso seguro', 80, '2026-07-25', 'Outros', tipo='income'),
        mov(13, 'Continente', -120.5, '2026-08-03', 'Alimentação'),
        mov(14, 'Galp', -60, '2026-08-10', 'Combustível'),
        mov(15, 'Continente', -54.3, '2026-08-24', 'Alimentação'),
        mov(16, 'Pastelaria Sol', -7.8, '2026-08-15', 'Restauração', account='edenred'),
        mov(17, 'Via Verde', -12.4, '2026-08-18', 'Transportes'),
        mov(18, 'Condomínio', -45, '2026-08-01', 'Habitação', recurring=True),
        mov(19, 'Clínica Vet Patas', -32, '2026-08-21', 'Veterinário', pet='Lola', note='desparasitação'),
        mov(20, 'Venda bicicleta', 150, '2026-08-28', 'Outros', tipo='income'),
        mov(21, 'Continente', -88.1, '2026-09-02', 'Alimentação'),
        mov(22, 'Condomínio', -45, '2026-09-01', 'Habitação', recurring=True),
        mov(23, 'Galp', -58.4, '2026-09-07', 'Combustível'),
        mov(24, 'Farmácia Central', -12, '2026-09-14', 'Saúde', note='receita do médico'),
        mov(25, 'Restaurante Mar Azul', -36, '2026-09-19', 'Restauração', account='edenred'),
        mov(26, 'Lidl', -27.35, '2026-09-21', 'Alimentação', account='revolut'),
        mov(27, 'Transferência poupança', 0, '2026-09-25', 'Transferência', tipo='transfer', transferValue=100, note='Transferência entre contas'),
    ]}

EXTRA = {'financas-familiar:vet-reminders': [
    {'id': 1, 'pet': 'Sam', 'type': 'vacina', 'last': '2025-10-03', 'every': 12},
    {'id': 2, 'pet': 'Lola', 'type': 'externa', 'last': '2026-08-26', 'every': 1}],
    'financas-familiar:vet-snooze': '9999999999999'}

# Cada caso é uma conversa nova; perguntas seguidas testam o seguimento do tema.
CASOS = [[q] for q in [
    'Quanto gastei este mês?', 'Quanto gastei em agosto?', 'Quanto gastei em julho?', 'Quanto gastei em junho?',
    'Quanto gastei no mês passado?', 'Quanto gastei este ano?', 'Quanto gastei em agosto de 2026?',
    'Quanto gastei no Continente?', 'Quanto gastei no Continente em agosto?', 'Quanto gastei na Galp?',
    'Quanto gastei no Lidl em setembro?', 'Quanto gastei em restaurantes?', 'Quanto gastei em alimentação em julho?',
    'Quanto gastei em combustível?', 'Combustível este mês', 'Combustível em agosto', 'Quanto gastei em gasolina este ano?',
    'Veterinário este mês', 'Quanto gastei no veterinário?', 'Quanto gastei com a Lola?', 'Quanto gastei com o Sam?',
    'Maior categoria', 'Qual a maior categoria de agosto?', 'Qual foi a maior despesa de agosto?', 'Qual foi a maior despesa deste mês?',
    'Qual foi a menor despesa de julho?', 'Compara agosto com julho', 'Compara setembro com agosto', 'Compara junho e julho',
    'Gastei mais em julho ou agosto?', 'Média mensal de gastos', 'Qual a média de combustível?', 'Média no Continente',
    'Saldo das contas', 'Qual o saldo da Principal?', 'Saldo da Revolut', 'Saldo da Edenred', 'Rendimento do mês',
    'Rendimento de agosto', 'Qual foi o salário do Hugo em agosto?', 'Salário da Marta em setembro', 'Receitas do mês',
    'Receitas de agosto', 'Quanto recebi em julho?', 'Mostra os movimentos de agosto', 'Lista as despesas de setembro',
    'Mostra os movimentos do Continente', 'Últimos movimentos', 'Quantas vezes fui ao Continente?', 'Quantos abastecimentos fiz em agosto?',
    'Quando foi a última vez que fui à Galp?', 'Qual era a nota da Farmácia?', 'Que nota tem a Clínica Vet Patas?',
    'Movimentos com notas', 'Despesas recorrentes', 'Quanto pago de condomínio?', 'Quanto gastei em transportes?',
    'Quanto gastei na Edenred?', 'Quanto gastei com a Revolut em setembro?', 'Transferências deste mês',
    'Quanto gastei esta semana?', 'Quanto gastei hoje?', 'Quanto gastei ontem?', 'Quanto gastei no fim de semana?',
    'Lembretes veterinários', 'Quando é a próxima vacina do Sam?', 'A Lola tem alguma desparasitação em atraso?',
    'Há lembretes em atraso?', 'qto gastei em agosot?', 'quanto gastei no contnente?', 'saldo das cotnas',
    'quanto gastei em cumbustivel?', 'maior despeza de agosto', 'rendimeto do mes', 'veterinaro este mes',
    'Altera o valor da Galp para 65,90',
    'Remove a Galp', 'Apaga o último movimento', 'Muda a categoria da Via Verde para Lazer', 'Acrescenta a nota "teste" ao Lidl',
    'Marca a desparasitação da Lola como feita', 'Olá', 'Obrigado', 'Ajuda', 'O que sabes fazer?', 'Bom dia Jarvis',
    'Qual é a capital de França?', 'asdfgh', 'Quanto gastei em dezembro?', 'Quanto gastei em 2025?',
    'Quanto gastei na Worten?', 'Quanto gastei em saúde?', 'Quanto gastei em lazer este ano?', 'Quanto gastei em habitação?',
    'Qual a percentagem de gastos em alimentação?', 'Quanto sobrou este mês?', 'Poupança do mês', 'Balanço de agosto',
    'Resumo do mês', 'Resumo de julho', 'Quanto gastei por dia em média?', 'Qual o dia em que gastei mais?',
    'Quanto gastei entre 1 e 15 de agosto?', 'Quanto gastei nos últimos 30 dias?', 'Despesas acima de 100 euros',
    'Despesas acima de 50€ em agosto', 'Backup', 'Quando fiz o último backup?',
]] + [
    ['Quanto gastei no Continente em agosto?', 'E em julho?'],
    ['Quanto gastei em agosto?', 'E em setembro?'],
    ['Quanto gastei na Galp?', 'E no Continente?'],
    ['Combustível em agosto', 'E em junho?'],
    ['Qual foi a maior despesa de agosto?', 'E de julho?'],
    ['Saldo da Principal', 'E da Revolut?'],
    ['Rendimento de agosto', 'E de setembro?'],
    ['Quanto gastei em restaurantes em junho?', 'E em setembro?', 'E em agosto?'],
    # no fim: estas gravam logo um movimento e alteram as respostas seguintes
    ['Adiciona despesa de 12,50 no Café Central'],
    ['Adiciona receita de 200 de venda'],
]


async def ler_respostas(app, casos):
    p = app.page
    respostas = []
    for caso in casos:
        r = []
        for pergunta in caso:
            r.append(' '.join((await app.jarvis(pergunta)).split()))
        respostas.append(r)
        await p.click('[aria-label="Limpar conversa"]'); await p.wait_for_timeout(250)
    return respostas


async def main():
    from playwright.async_api import async_playwright
    srv, url = correr.servidor()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, timezone_id='Europe/Lisbon', locale='pt-PT')
        page = await ctx.new_page(); await page.clock.set_system_time(correr.DATA_FIXA)
        app = correr.App(page, url)
        await app.abrir(DADOS, EXTRA)
        respostas = await ler_respostas(app, CASOS)
        await browser.close()
    srv.shutdown()
    if app.erros:
        sys.exit(f'erros na página: {app.erros[:2]}')
    DESTINO.parent.mkdir(exist_ok=True)
    DESTINO.write_text(json.dumps({'dados': DADOS, 'extra': EXTRA,
                                   'casos': [{'perguntas': c, 'respostas': r} for c, r in zip(CASOS, respostas)]},
                                  ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(CASOS)} conversas gravadas em {DESTINO.relative_to(correr.RAIZ)}')


if __name__ == '__main__':
    asyncio.run(main())
