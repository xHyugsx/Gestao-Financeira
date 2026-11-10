import json, pathlib
from correr import verificar
from capturar_referencias import ler_respostas

REF = json.loads((pathlib.Path(__file__).parent / 'referencias' / 'jarvis.json').read_text(encoding='utf-8'))

# Diferenças intencionais face à 1.9.x: a resposta da referência passa por esta correção antes de comparar
INTENCIONAIS = {
    # v2.59.0: frases do dia a dia (antes caíam no total do mês ou em «ainda não sei») e a categoria sugerida pelo título
    "Despesas recorrentes": lambda r: "Despesas fixas de setembro: 45,00 € (45,00 € pagos, falta 0,00 €). Condomínio 45,00 €",
    "Quanto gastei esta semana?": lambda r: "Esta semana ainda não há despesas registadas.",
    "Ajuda": lambda r: "Posso responder a: «Quanto gastei este mês?», «Quanto gastei em Alimentação?», «Quanto gastei esta semana?», «Em que gasto mais?», «Quais são as despesas fixas?», «Quanto ganho?», «Quanto me sobra?», «Previsão de dezembro». E posso registar: «gastei 12 € no café», «recebi o salário de 1200». Peço sempre confirmação antes de mudar alguma coisa.",
    "O que sabes fazer?": lambda r: "Posso responder a: «Quanto gastei este mês?», «Quanto gastei em Alimentação?», «Quanto gastei esta semana?», «Em que gasto mais?», «Quais são as despesas fixas?», «Quanto ganho?», «Quanto me sobra?», «Previsão de dezembro». E posso registar: «gastei 12 € no café», «recebi o salário de 1200». Peço sempre confirmação antes de mudar alguma coisa.",
    "Quanto sobrou este mês?": lambda r: "Em setembro: rendimento 2620,00 € − gastos 266,85 € = sobram 2353,15 €.",
    "Qual o dia em que gastei mais?": lambda r: "O dia mais caro de setembro foi 2: 88,10 €.",
    "Adiciona despesa de 12,50 no Café Central": lambda r: "Vou registar a despesa «Café Central» — 12,50 € · hoje · Alimentação. Confirmas?",
    # v2.56.0: registar pelo Jarvis pede confirmação e o título vem do texto
    'Adiciona receita de 200 de venda': lambda r: 'Vou registar a receita «Venda» — 200,00 € · hoje · Outras receitas. Confirmas?',
}
# v2.36.0: os saldos das contas deixaram de aparecer; as respostas de saldo ficam de fora (teste_previsao cobre as novas)
SEM_SALDOS = ('Saldos —', 'O saldo das contas é sempre o atual')
SEM_SALDO_NA_AJUDA = lambda r: r.replace('gastos, saldo, rendimento', 'gastos, rendimento')


async def t_jarvis_responde_como_a_referencia(app):
    await app.abrir(REF['dados'], REF['extra'])
    casos = [c['perguntas'] for c in REF['casos']]
    obtidas = await ler_respostas(app, casos)
    # v2.65.1: no mês atual (28/09) o Jarvis compara com o mesmo período do mês anterior, como a Análise
    periodo = lambda r: r.replace('menos 19,6% do que em agosto', 'menos 19,6% do que de 1 a 28 de agosto') if r.startswith('Em setembro gastaste') else r
    esperada = lambda p, r: periodo(SEM_SALDO_NA_AJUDA(INTENCIONAIS[p](r) if p in INTENCIONAIS else r))
    diferentes = [(c['perguntas'][i], esperada(c['perguntas'][i], c['respostas'][i]), o[i])
                  for c, o in zip(REF['casos'], obtidas) for i in range(len(o))
                  if not c['respostas'][i].startswith(SEM_SALDOS) and o[i] != esperada(c['perguntas'][i], c['respostas'][i])]
    for pergunta, esperada, obtida in diferentes[:3]:
        print(f'\n  «{pergunta}»\n    esperado: {esperada[:150]}\n    obtido:   {obtida[:150]}')
    verificar(not diferentes, f'{len(diferentes)} respostas diferentes da referência (a 1.ª: «{diferentes[0][0]}»)' if diferentes else '')
