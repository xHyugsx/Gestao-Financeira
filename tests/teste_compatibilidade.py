import json, pathlib
from correr import verificar, chave

BACKUP = json.loads(pathlib.Path('tests/dados/dados_versao_antiga.json').read_text(encoding='utf-8'))


async def t_dados_antigos_abrem(app):
    await app.abrir(BACKUP)
    t = await app.page.evaluate("[...document.querySelectorAll('.transaction-list h3')].map(e=>e.textContent)")
    verificar(t[:2] == ['Talho', 'Padaria'], f'movimentos antigos: {t}')


async def t_backup_mantem_as_chaves(app):
    await app.abrir(BACKUP, {'financas-familiar:vet-reminders': [{'id': 1, 'pet': 'Rex', 'type': 'vacina', 'last': '2026-01-10', 'every': 12}]})
    b = await app.page.evaluate("window.ffBk.payload()")
    verificar(b['app'] == 'financas-familiar' and len(b['data']['transactions']) == 3 and len(b['vetReminders']) == 1 and 'jarvisThreads' in b, f'backup incompleto: {list(b)}')


async def t_aviso_quando_a_gravacao_falha(app):
    await app.abrir()
    p = app.page
    await p.evaluate("K=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===K||k==='financas-familiar:v3')throw new DOMException('cheio','QuotaExceededError');return o.call(this,k,v)};return null}", chave('financas-familiar:v3'))
    await app.novo_movimento('Teste', '1,00')
    verificar(await p.query_selector('#ffsto-bn.err'), 'não avisou que a gravação falhou')
