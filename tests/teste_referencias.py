import json, pathlib
from correr import verificar
from capturar_referencias import ler_respostas

REF = json.loads((pathlib.Path(__file__).parent / 'referencias' / 'jarvis.json').read_text(encoding='utf-8'))


async def t_jarvis_responde_como_a_referencia(app):
    await app.abrir(REF['dados'], REF['extra'])
    casos = [c['perguntas'] for c in REF['casos']]
    obtidas = await ler_respostas(app, casos)
    diferentes = [(c['perguntas'][i], c['respostas'][i], o[i])
                  for c, o in zip(REF['casos'], obtidas) for i in range(len(o)) if o[i] != c['respostas'][i]]
    for pergunta, esperada, obtida in diferentes[:3]:
        print(f'\n  «{pergunta}»\n    esperado: {esperada[:150]}\n    obtido:   {obtida[:150]}')
    verificar(not diferentes, f'{len(diferentes)} respostas diferentes da referência (a 1.ª: «{diferentes[0][0]}»)' if diferentes else '')
