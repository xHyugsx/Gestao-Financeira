"""A app nova (raiz) tem de desenhar exatamente o mesmo que a app anterior (/v1/, 1.9.x), com os mesmos dados."""
import asyncio, base64, json, pathlib, re, sys, unicodedata
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from correr import verificar
from capturar_referencias_dados import COMPLETO, CASOS, PERFIL

# Depois da troca (etapa 13): a app anterior está em /v1/ e a nova na raiz, ambas com as chaves reais.
ANTIGA, PREFIXO_ANTIGA = 'v1/', 'financas-familiar:'
NOVA, PREFIXO_NOVA = '', 'financas-familiar:'

VER_TODAS = "[...document.querySelectorAll('button')].find(b=>b.textContent==='Ver todas').click()"
ESTADOS = {
    'inicial': [],
    'ver todas': [VER_TODAS],
    'pesquisa': [VER_TODAS, "(()=>{const i=document.querySelector('.tx-search input');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'continente');i.dispatchEvent(new Event('input',{bubbles:true}))})()"],
    'filtro por conta': [VER_TODAS, "[...document.querySelectorAll('.ffacc-row button')].find(b=>b.textContent==='Edenred').click()"],
    'valores ocultos': ["document.querySelector('[aria-label=\"Ocultar valores\"]').click()"],
    'mês anterior': ["document.querySelector('[aria-label=\"Mês anterior\"]').click()"],
    'dezembro de 2025': ["document.querySelector('[aria-label=\"Mês anterior\"]').click()"] * 9,
    'painel mais': ["document.querySelector('.ffnav-more').click()"],
}


def preparar(dados):
    """Dados de teste já pela ordem que a app nova mostra (diferenças intencionais, plano §4.1): movimentos do mais
    recente para o mais antigo e categorias por ordem alfabética. Assim a comparação continua a valer para o resto."""
    if not dados:
        return dados
    d = dict(dados)
    if isinstance(d.get('transactions'), list):
        # sem data: a mesma data por omissão da app (dia no início da descrição, senão 1 de setembro de 2026)
        dia = lambda m: m.get('date') or '2026-09-%02d' % (int(re.match(r'\d*', str(m.get('detail', ''))).group() or 0) or 1)
        d['transactions'] = sorted(d['transactions'], key=dia, reverse=True)
    for k in ('categories', 'incomeCategories'):
        if isinstance(d.get(k), list):
            d[k] = sorted(d[k], key=lambda c: unicodedata.normalize('NFD', str(c)).encode('ascii', 'ignore').decode().lower())
    return d


def intencionais(h):
    """Apaga do HTML as diferenças intencionais da app nova (correções pedidas pelo dono, plano §4.1)."""
    h = h.replace(' Recorrente mensal</label>', ' Recorrente</label>').replace('Mudar ícone de ', 'Editar categoria ')
    h = re.sub(r'<label class="ffv2-extra">.*?</label>', '', h, flags=re.S)
    h = re.sub(r'<div class="movement-checks ffv2-extra">.*?</div>', '', h, flags=re.S)
    h = re.sub(r'<button[^>]*class="[^"]*ffv2-extra[^"]*"[^>]*>.*?</button>', '', h, flags=re.S)  # Definições › Importação
    h = re.sub(r'<section class="ffv2-extra[^"]*">.*?</section>', '', h, flags=re.S)  # Perfil › Animais
    # espaço ocupado: a app atual grava um perfil por omissão com nomes, a nova grava-o vazio (sem nomes no código)
    h = re.sub(r'<small>[^<]* ocupados neste dispositivo</small>', '<small>… ocupados neste dispositivo</small>', h)
    h = re.sub(r'(<small>Espaço local ocupado</small><strong>)[^<]*', r'\1…', h)
    # contas: o campo «Saldo» mostra o saldo de hoje (a app atual mostra o saldo inicial) — pedido do dono
    h = re.sub(r'(<input[^>]*name="[^"]*-balance"[^>]*?)value="[^"]*"', r'\1value="…"', h)
    h = re.sub(r'value="[^"]*"([^>]*name="[^"]*-balance")', r'value="…"\1', h)
    # meses anteriores: os cartões das contas mostram o saldo no fim desse mês (a app atual mostra sempre o de hoje)
    mes = re.search(r'aria-label="Selecionar mês">.*?<span>([^<]*)</span>', h, flags=re.S)
    if mes and mes.group(1) != 'setembro de 2026':
        h = re.sub(r'<section class="(?:balance-panel|metric-panel current-panel|metric-panel account-extra-panel)[^"]*".*?</section>', '<section>[saldo]</section>', h, flags=re.S)
    if 'Editar movimento' in h:  # categoria: lista de escolha em vez de texto com sugestões
        h = re.sub(r'<datalist id="edit-categories">.*?</datalist>', '', h, flags=re.S)
        h = re.sub(r'<input[^>]*name="category"[^>]*>|<select name="category">.*?</select>', '[categoria]', h, flags=re.S)
    return h


async def abrir(app, url, prefixo, dados):
    dados = preparar(dados)
    p = app.page
    await p.goto(url); await app.esperar_sw()
    await p.evaluate("([d,P])=>{localStorage.clear();if(d)localStorage.setItem(P+'v3',JSON.stringify(d));localStorage.setItem(P+'last-backup',new Date().toISOString())}", [dados, prefixo])
    await p.goto(url); await p.wait_for_timeout(1500)
    await p.evaluate("document.getElementById('ffv2-tag')?.remove()")


async def html(app, url, prefixo, dados, acoes):
    await abrir(app, url, prefixo, dados)
    for a in acoes:
        await app.page.evaluate(a); await app.page.wait_for_timeout(250)
    await app.page.wait_for_timeout(500)
    h = intencionais(await app.page.evaluate("document.querySelector('.cosmic-app').outerHTML"))
    return re.sub(r'(<p class="set-menu-version">v\. )[^<]*', r'\1…', h)  # cada app mostra a sua versão


async def comparar_html(app, dados, estados, sem_ceu=False):
    await app.page.emulate_media(reduced_motion='reduce')
    # o céu da saudação muda com o minuto; nas Definições está só por trás e não entra na comparação
    ceu = (lambda h: re.sub(r'<div class="welcome-sky".*?</svg></div>', '', h, flags=re.S)) if sem_ceu else (lambda h: h)
    for nome, acoes in estados.items():
        atual = ceu(await html(app, app.raiz + ANTIGA, PREFIXO_ANTIGA, dados, acoes))
        nova = ceu(await html(app, app.raiz + NOVA, PREFIXO_NOVA, dados, acoes))
        if atual != nova:
            i = next(k for k in range(min(len(atual), len(nova))) if atual[k] != nova[k])
            verificar(False, f'«{nome}» diferente: atual «…{atual[max(0, i - 60):i + 60]}…» · nova «…{nova[max(0, i - 60):i + 60]}…»')


async def t_principal_html_igual_a_app_atual(app):
    await comparar_html(app, COMPLETO, ESTADOS)


async def t_principal_html_igual_com_outros_dados(app):
    # com perfil fictício: sem perfil, a app atual mostra os nomes que tem fixos no código (diferença intencional, plano §4.1)
    for nome in ('vazio', 'versao_antiga', 'revolut_antigo_e_campos_extra', 'salario_por_movimento'):
        await comparar_html(app, {**(CASOS[nome] or {}), 'profile': PERFIL}, {nome: []})


async def t_principal_imagem_igual_a_app_atual(app):
    p = app.page
    await p.emulate_media(reduced_motion='reduce')
    imagens = []
    for url, prefixo in ((app.raiz + ANTIGA, PREFIXO_ANTIGA), (app.raiz + NOVA, PREFIXO_NOVA)):
        await abrir(app, url, prefixo, COMPLETO)
        await p.wait_for_timeout(800)
        imagens.append(base64.b64encode(await p.screenshot()).decode())
    diferentes = await p.evaluate("""async ([a,b])=>{
      const ler=async s=>{const i=new Image();i.src='data:image/png;base64,'+s;await i.decode();const c=document.createElement('canvas');
        c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,c.width,c.height).data};
      const [p,q]=await Promise.all([ler(a),ler(b)]);let n=0;
      for(let k=0;k<p.length;k+=4)if(Math.abs(p[k]-q[k])+Math.abs(p[k+1]-q[k+1])+Math.abs(p[k+2]-q[k+2])>24)n++;
      return n/(p.length/4)}""", imagens)
    verificar(diferentes <= 0.002, f'{diferentes:.2%} dos píxeis diferentes')


# ---- Janelas de movimentos (etapa 4) ----
import re

MAIS = "document.querySelector('[aria-label=\"Adicionar movimento\"]').click()"
def _tipo(t): return f"[...document.querySelectorAll('[role=dialog] .segmented button')].find(b=>b.textContent==='{t}').click()"
def _caixa(n): return f"document.querySelectorAll('[role=dialog] .movement-checks input[type=checkbox]')[{n}].click()"
def _editar(t, i=0): return f"document.querySelectorAll('[aria-label=\"Editar {t}\"]')[{i}].click()"
JANELAS = {
    'novo (despesa)': [MAIS], 'novo (receita)': [MAIS, _tipo('Receita')], 'novo (transferência)': [MAIS, _tipo('Transferência')],
    'novo (recorrente sem valor)': [MAIS, _caixa(0), "(()=>{const s=[...document.querySelectorAll('[role=dialog] .movement-checks select')].find(x=>!x.name);s.value='sem';s.dispatchEvent(new Event('change',{bubbles:true}))})()"],
    'novo (Revolut)': [MAIS, _caixa(2)], 'editar despesa': [VER_TODAS, _editar('Continente')],
    'editar transferência': [VER_TODAS, _editar('Transferência')], 'editar Revolut': [VER_TODAS, _editar('Para a conjunta')],
}


def _normalizar(h):
    h = intencionais(re.sub(r'radix-[^" ]+', 'radix-ID', h))
    # titulares da Revolut: a app atual tem nomes fixos no código, a nova usa o perfil (plano §4.1)
    return re.sub(r'(<select name="revolutHolder"[^>]*>).*?(</select>)', r'\1…\2', h, flags=re.S)


async def _janela(app, url, prefixo, acoes):
    await abrir(app, url, prefixo, COMPLETO)
    for a in acoes:
        await app.page.evaluate(a); await app.page.wait_for_timeout(300)
    return _normalizar(await app.page.evaluate(
        "[...document.body.children].filter(e=>!['root','ffv2-tag','ff-privacy'].includes(e.id)&&e.tagName!=='SCRIPT').map(e=>e.outerHTML).join('')"))


async def t_janelas_de_movimentos_iguais_a_app_atual(app):
    await app.page.emulate_media(reduced_motion='reduce')
    for nome, acoes in JANELAS.items():
        atual = await _janela(app, app.raiz + ANTIGA, PREFIXO_ANTIGA, acoes)
        nova = await _janela(app, app.raiz + NOVA, PREFIXO_NOVA, acoes)
        verificar('role="dialog"' in atual, f'«{nome}»: a janela não abriu na app atual')
        if atual != nova:
            i = next((k for k in range(min(len(atual), len(nova))) if atual[k] != nova[k]), min(len(atual), len(nova)))
            verificar(False, f'«{nome}» diferente: atual «…{atual[max(0, i - 60):i + 60]}…» · nova «…{nova[max(0, i - 60):i + 60]}…»')


async def _registar_editar_eliminar(app, url, prefixo):
    p = app.page
    await abrir(app, url, prefixo, COMPLETO)
    p.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    passos = []
    await p.evaluate(MAIS); await p.wait_for_timeout(400)
    await p.fill('[role=dialog] input[name=title]', 'Mercearia'); await p.fill('[role=dialog] input[name=amount]', '1.234,56')
    await p.fill('[role=dialog] input[name=date]', '2026-09-20'); await p.select_option('[role=dialog] select[name=account]', 'edenred')
    await p.fill('[role=dialog] textarea[name=note]', 'nota de teste'); await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(500)
    passos.append(await p.evaluate("P=>JSON.parse(localStorage.getItem(P+'v3')).transactions", prefixo))
    await p.evaluate(MAIS); await p.wait_for_timeout(400); await p.evaluate(_tipo('Receita')); await p.evaluate(_caixa(2)); await p.wait_for_timeout(200)
    await p.fill('[role=dialog] input[name=title]', 'Carregamento'); await p.fill('[role=dialog] input[name=amount]', '25')
    await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(500)
    passos.append(await p.evaluate("P=>JSON.parse(localStorage.getItem(P+'v3')).transactions", prefixo))
    await p.evaluate(VER_TODAS); await p.wait_for_timeout(300)
    await p.evaluate(_editar('Galp')); await p.wait_for_timeout(400)
    await p.fill('[role=dialog] input[name=amount]', '61,2')
    await p.evaluate("v=>{document.querySelector('[role=dialog] [name=category]').value=v}", 'Lazer')
    await p.select_option('[role=dialog] select[name=account]', 'revolut'); await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(500)
    passos.append(await p.evaluate("P=>JSON.parse(localStorage.getItem(P+'v3')).transactions", prefixo))
    await p.evaluate(_editar('Continente')); await p.wait_for_timeout(400)
    await p.click('[role=dialog] button:has-text("Eliminar")'); await p.wait_for_timeout(500)
    passos.append(await p.evaluate("P=>JSON.parse(localStorage.getItem(P+'v3')).transactions", prefixo))
    await p.evaluate(MAIS); await p.wait_for_timeout(400)
    await p.fill('[role=dialog] input[name=title]', 'Sem valor'); await p.click('[role=dialog] button[type=submit]'); await p.wait_for_timeout(300)
    passos.append(await p.evaluate("document.querySelector('[role=dialog] input[name=amount]')?.validationMessage"))
    for lista in passos[:-1]:
        for m in lista:
            if isinstance(m.get('id'), int) and m['id'] > 10**12: m['id'] = 'novo'  # id = hora do registo
    return passos


async def t_registar_editar_eliminar_grava_o_mesmo_que_a_app_atual(app):
    atual = await _registar_editar_eliminar(app, app.raiz + ANTIGA, PREFIXO_ANTIGA)
    nova = await _registar_editar_eliminar(app, app.raiz + NOVA, PREFIXO_NOVA)
    for i, nome in enumerate(['despesa nova', 'transferência Revolut', 'edição', 'eliminação', 'mensagem de valor em falta']):
        verificar(atual[i] == nova[i], f'{nome}: atual {str(atual[i])[:200]} · nova {str(nova[i])[:200]}')


# ---- Ecrã de bloqueio (etapa 5) ----
import hashlib
from teste_biometria import com_sensor

PIN = hashlib.sha256(b'financas-familiar:1234').hexdigest()
TECLAS = lambda t: [f"window.dispatchEvent(new KeyboardEvent('keydown',{{key:'{k}'}}))" for k in t]
BLOQUEIO = {
    'fechado': [], 'teclado aberto': TECLAS(['Enter']), 'dois algarismos': TECLAS(['Enter', '1', '2']),
    'PIN errado': TECLAS(['Enter', '9', '9', '9', '9']),
}


async def _bloqueio(app, url, prefixo, extra, acoes, espera=0):
    p = app.page
    await p.goto(url); await app.esperar_sw()
    await p.evaluate("([P,x])=>{localStorage.clear();localStorage.setItem(P+'v3',JSON.stringify({pinHash:x.pin}));for(const k in x.extra)localStorage.setItem(P+k,x.extra[k])}",
                     [prefixo, {'pin': PIN, 'extra': extra}])
    await p.goto(url); await p.wait_for_timeout(1200)
    for a in acoes:
        await p.evaluate(a); await p.wait_for_timeout(60)
    await p.wait_for_timeout(espera or 200)
    return await p.evaluate("document.getElementById('ff-lock')?.outerHTML||''")


async def _comparar_bloqueio(app, estados, extra=None, espera=0):
    await app.page.emulate_media(reduced_motion='reduce')
    for nome, acoes in estados.items():
        atual = await _bloqueio(app, app.raiz + ANTIGA, PREFIXO_ANTIGA, extra or {}, acoes, espera)
        nova = await _bloqueio(app, app.raiz + NOVA, PREFIXO_NOVA, extra or {}, acoes, espera)
        verificar('ff-lock' in atual, f'«{nome}»: o ecrã de bloqueio não apareceu na app atual')
        if atual != nova:
            i = next((k for k in range(min(len(atual), len(nova))) if atual[k] != nova[k]), min(len(atual), len(nova)))
            verificar(False, f'«{nome}» diferente: atual «…{atual[max(0, i - 60):i + 60]}…» · nova «…{nova[max(0, i - 60):i + 60]}…»')


async def t_ecra_de_bloqueio_igual_a_app_atual(app):
    await _comparar_bloqueio(app, BLOQUEIO)


async def t_ecra_de_bloqueio_com_impressao_digital_igual(app):
    await com_sensor(app)
    registo = json.dumps({'id': 'AAAA', 'pin': PIN})
    # com impressão digital ativa: tecla do sensor; «a aguardar» quando se desliza (o pedido ao sensor fica pendente)
    await app.page.add_init_script("navigator.credentials.get=()=>new Promise(()=>{})")
    await _comparar_bloqueio(app, {'fechado': [], 'a aguardar o sensor': TECLAS(['Enter'])}, {'bio': registo})
    # oferta para ativar depois do PIN certo
    await _comparar_bloqueio(app, {'pergunta de ativar': TECLAS(['Enter', '1', '2', '3', '4'])}, espera=1200)


async def t_impressao_digital_ativada_na_app_atual_funciona_na_nova(app):
    """No dia da troca, a impressão digital registada na app atual tem de continuar a abrir a app nova."""
    await com_sensor(app)
    p = app.page
    await _bloqueio(app, app.raiz + ANTIGA, PREFIXO_ANTIGA, {}, TECLAS(['Enter', '1', '2', '3', '4']), 1200)
    await p.click('.ffl-yes'); await p.wait_for_timeout(1500)
    registo = await p.evaluate("localStorage.getItem('financas-familiar:bio')")
    verificar(registo, 'a app atual não registou a impressão digital')
    await _bloqueio(app, app.raiz + NOVA, PREFIXO_NOVA, {'bio': registo}, [])
    verificar(await p.query_selector('.ffl-key.bio'), 'a app nova não reconheceu o registo da app atual')
    await p.keyboard.press('Enter'); await p.wait_for_timeout(1500)
    verificar(not await p.query_selector('#ff-lock'), 'a impressão digital da app atual não abriu a app nova')


RODA = "document.querySelector('button[aria-label=\"Definições\"]').click()"
LISTA = [RODA, "document.querySelector('.set-menu-more').click()"]
SEGURANCA = LISTA + ["[...document.querySelectorAll('.setting-row')].find(b=>b.textContent.includes('Segurança')).click()"]
def _linha(t): return f"[...document.querySelectorAll('.setting-row')].find(b=>b.textContent.includes('{t}')).click()"
def _pin(a, b): return ("(()=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;"
                        f"const c=document.querySelectorAll('.settings-panel input');[['{a}',c[0]],['{b}',c[1]]].forEach(([v,i])=>{{s.call(i,v);i.dispatchEvent(new Event('input',{{bubbles:true}}))}});"
                        "document.querySelector('.settings-panel button[type=submit]').click()})()")
DEFINICOES = {
    'menu rápido': [RODA], 'lista': LISTA, 'segurança sem PIN': SEGURANCA,
    'PIN que não coincide': SEGURANCA + [_pin('1234', '4321')], 'PIN definido': SEGURANCA + [_pin('1234', '1234')],
    'PIN alterado': SEGURANCA + [_pin('1234', '1234'), _pin('0000', '0000')],
    'ocultar após 1 min': SEGURANCA + ["[...document.querySelectorAll('.autohide-choice')].find(b=>b.textContent==='Após 1 min').click()"],
    'perfil': LISTA + [_linha('Perfil e família')], 'categorias (definições)': LISTA + [_linha('Categorias')],
    'contas': LISTA + [_linha('Contas bancárias')], 'aparência': LISTA + [_linha('Aparência')],
    'aparência órbita azul': LISTA + [_linha('Aparência'), "[...document.querySelectorAll('.accent-options button')][1].click()"],
    'backup': LISTA + [_linha('Backup')], 'dados': LISTA + [_linha('Dados')],
    'perfil guardado': LISTA + [_linha('Perfil e família'), "document.querySelector('.settings-panel button[type=submit]').click()"],
    'segurança pelo menu rápido': [RODA, "[...document.querySelectorAll('.set-menu-item')].find(b=>b.textContent.includes('Segurança')).click()"],
}


async def t_definicoes_seguranca_iguais_a_app_atual(app):
    await comparar_html(app, COMPLETO, DEFINICOES, sem_ceu=True)


async def t_definicoes_seguranca_com_impressao_digital_igual(app):
    await com_sensor(app)
    await comparar_html(app, COMPLETO, {
        'PIN definido com sensor': SEGURANCA + [_pin('1234', '1234')],
        'impressão digital ativada': SEGURANCA + [_pin('1234', '1234'), "document.querySelector('.ff-bio-slot [data-v=on]').click()"],
    })


def _pg(p): return f"window.ffGoPg('{p}')"
def _seg(t, i=0): return f"[...document.querySelectorAll('.segmented button')].filter(b=>b.textContent==='{t}')[{i}].click()"
ANTERIOR = "document.querySelector('[aria-label=\"Mês anterior\"]').click()"
PAGINAS_V2 = {
    'análise': [_pg('analise')], 'análise receitas': [_pg('analise'), _seg('Receitas')], 'análise diário': [_pg('analise'), _seg('Diário')],
    'análise mês anterior': [_pg('analise'), ANTERIOR], 'análise dezembro': [_pg('analise')] + [ANTERIOR] * 9,
    'calendário': [_pg('calendario')], 'calendário dia 5': [_pg('calendario'), "[...document.querySelectorAll('.calendar-day')][4].click()"],
    'calendário mês anterior': [_pg('calendario'), ANTERIOR],
    'categorias': [_pg('categorias')], 'categorias receitas': [_pg('categorias'), _seg('Receitas')],
    'categorias recorrentes': [_pg('categorias'), _seg('Recorrentes')], 'categorias pontuais': [_pg('categorias'), _seg('Pontuais')],
    'categoria que já existe': [_pg('categorias'), "(()=>{const i=document.querySelector('.inline-add input');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'lazer');i.dispatchEvent(new Event('input',{bubbles:true}))})()",
                                "document.querySelector('[aria-label=\"Adicionar categoria\"]').click()"],
    'categoria em uso': [_pg('categorias'), "document.querySelector('[aria-label=\"Eliminar Alimentação\"]').click()"],
    'resumo': [_pg('resumo')], 'resumo trimestre': [_pg('resumo'), _seg('Últimos 3 meses')], 'resumo mês anterior': [_pg('resumo'), ANTERIOR],
    'despesas anuais': [_pg('resumo'), _seg('Despesas anuais')], 'fecho de mês': [_pg('resumo'), _seg('Fecho de mês')],
    'fecho mês anterior': [_pg('resumo'), _seg('Fecho de mês'), ANTERIOR], 'salários': [_pg('resumo'), _seg('Salários')],
    'salários 2025': [_pg('resumo'), _seg('Salários')] + [ANTERIOR] * 12,
}


async def t_paginas_analise_calendario_categorias_resumo_iguais(app):
    await comparar_html(app, COMPLETO, PAGINAS_V2)


async def t_paginas_iguais_com_outros_dados(app):
    for nome in ('vazio', 'versao_antiga', 'revolut_antigo_e_campos_extra', 'salario_por_movimento'):
        d = {**(CASOS[nome] or {}), 'profile': PERFIL}
        await comparar_html(app, d, {f'{nome}: {p}': [_pg(p)] for p in ('analise', 'calendario', 'categorias', 'resumo')})
        await comparar_html(app, d, {f'{nome}: fecho': [_pg('resumo'), _seg('Fecho de mês')]})


async def t_janela_do_icone_da_categoria_igual(app):
    """A janela passou a «Editar categoria» (nome e ícone, correção pedida pelo dono); a grelha de ícones tem de ser igual."""
    await app.page.emulate_media(reduced_motion='reduce')
    acoes = [_pg('categorias'), "[...document.querySelectorAll('.category-row')].find(r=>r.querySelector('h2').textContent==='Lazer').querySelector('.category-icon-edit').click()"]
    grelhas = []
    for url, prefixo in ((app.raiz + ANTIGA, PREFIXO_ANTIGA), (app.raiz + NOVA, PREFIXO_NOVA)):
        await abrir(app, url, prefixo, COMPLETO)
        for a in acoes:
            await app.page.evaluate(a); await app.page.wait_for_timeout(300)
        grelhas.append(await app.page.evaluate("document.querySelector('[role=dialog] .category-icon-groups')?.outerHTML||''"))
    atual, nova = grelhas
    verificar(atual, 'a janela não abriu na app atual')
    if atual != nova:
        i = next((k for k in range(min(len(atual), len(nova))) if atual[k] != nova[k]), min(len(atual), len(nova)))
        verificar(False, f'diferente: atual «…{atual[max(0, i - 60):i + 60]}…» · nova «…{nova[max(0, i - 60):i + 60]}…»')


LEMBRETES = {'vet-reminders': json.dumps([{'id': 1, 'pet': 'Sam', 'type': 'vacina', 'last': '2025-10-03', 'every': 12},
                                           {'id': 2, 'pet': 'Lola', 'type': 'outro', 'label': 'Análises', 'last': '2026-08-26', 'every': 1, 'note': 'clínica <central>'}]),
             'vet-snooze': '9999999999999'}
COM_ANIMAIS = {**COMPLETO, 'transactions': COMPLETO['transactions'] + [
    {'id': 901, 'title': 'Consulta', 'amount': -45, 'date': '2026-09-12', 'detail': '12 setembro · Clínica Fictícia', 'movementType': 'expense', 'kind': 'health', 'pet': 'Sam', 'vetCategory': 'Consultas'},
    {'id': 902, 'title': 'Vacina', 'amount': -30.5, 'date': '2026-09-03', 'detail': '3 setembro · Vacinas', 'movementType': 'expense', 'kind': 'health', 'pet': 'Lola', 'vetCategory': 'Vacinas'},
    {'id': 903, 'title': 'Análises', 'amount': -60, 'date': '2026-03-03', 'detail': '3 março · Exames', 'movementType': 'expense', 'kind': 'health', 'pet': 'Lola', 'vetCategory': 'Exames'},
    {'id': 904, 'title': 'Combustível — Posto Fictício', 'amount': -52, 'date': '2026-09-20', 'detail': '20 setembro · Combustível', 'movementType': 'expense', 'kind': 'car'},
    {'id': 905, 'title': 'Combustível', 'amount': -40, 'date': '2026-05-02', 'detail': '2 maio · Combustível', 'movementType': 'expense', 'kind': 'car', 'note': 'viagem'}],
    'petPhotos': {'Lola': 'data:image/png;base64,iVBORw0KGgo='}}
_pet = lambda a: f"[...document.querySelectorAll('.pet-card-open')].find(b=>b.textContent.includes('{a}')).click()"
PAGINAS_8 = {
    'combustível': [_pg('combustivel')], 'combustível mês anterior': [_pg('combustivel'), ANTERIOR],
    'combustível ano anterior': [_pg('combustivel')] + [ANTERIOR] * 12, 'combustível ano seguinte': [_pg('combustivel')] + [ANTERIOR.replace('anterior', 'seguinte')] * 4,
    'veterinário': [_pg('veterinario')], 'veterinário filtro Lola': [_pg('veterinario'), _seg('Lola')],
    'veterinário mês anterior': [_pg('veterinario'), ANTERIOR],
    'Sam': [_pg('veterinario'), _pet('Sam')], 'Lola no ano': [_pg('veterinario'), _pet('Lola'), _seg('Ano')],
}


async def _abrir_com_lembretes(app, url, prefixo, acoes, extra):
    p = app.page
    await p.goto(url); await app.esperar_sw()
    await p.evaluate("([d,P,x])=>{localStorage.clear();localStorage.setItem(P+'v3',JSON.stringify(d));localStorage.setItem(P+'last-backup',new Date().toISOString());for(const k in x)localStorage.setItem(P+k,x[k])}",
                     [COM_ANIMAIS, prefixo, extra])
    await p.goto(url); await p.wait_for_timeout(1500)
    await p.evaluate("document.getElementById('ffv2-tag')?.remove()")
    for a in acoes:
        await p.evaluate(a); await p.wait_for_timeout(300)
    await p.wait_for_timeout(400)


async def _comparar(app, estados, extra, ler):
    await app.page.emulate_media(reduced_motion='reduce')
    for nome, acoes in estados.items():
        await _abrir_com_lembretes(app, app.raiz + ANTIGA, PREFIXO_ANTIGA, acoes, extra); atual = await ler()
        await _abrir_com_lembretes(app, app.raiz + NOVA, PREFIXO_NOVA, acoes, extra); nova = await ler()
        if atual != nova:
            i = next((k for k in range(min(len(atual), len(nova))) if atual[k] != nova[k]), min(len(atual), len(nova)))
            verificar(False, f'«{nome}» diferente: atual «…{atual[max(0, i - 60):i + 60]}…» · nova «…{nova[max(0, i - 60):i + 60]}…»')


async def t_combustivel_e_veterinario_iguais_a_app_atual(app):
    await _comparar(app, PAGINAS_8, LEMBRETES, lambda: app.page.evaluate("document.querySelector('.cosmic-app').outerHTML"))


CORPO = "[...document.body.children].filter(e=>!['root','ffv2-tag','ff-privacy'].includes(e.id)&&e.tagName!=='SCRIPT').map(e=>e.outerHTML).join('')"
JANELAS_8 = {
    'novo abastecimento': [_pg('combustivel'), "document.querySelector('[aria-label=\"Adicionar abastecimento\"]').click()"],
    'nova despesa veterinária': [_pg('veterinario'), "document.querySelector('[aria-label=\"Adicionar despesa veterinária\"]').click()"],
    'despesa veterinária da Lola': [_pg('veterinario'), _pet('Lola'), "document.querySelector('[aria-label=\"Adicionar despesa veterinária\"]').click()"],
    'fotografia sem foto': [_pg('veterinario'), "document.querySelector('[aria-label=\"Adicionar fotografia de Sam\"]').click()"],
    'fotografia com foto': [_pg('veterinario'), "document.querySelector('[aria-label=\"Alterar fotografia de Lola\"]').click()"],
    'novo lembrete': [_pg('veterinario'), "document.querySelector('.ffvr-add').click()"],
    'lembrete: tipo outro e só uma vez': [_pg('veterinario'), "document.querySelector('.ffvr-add').click()",
                                           "(()=>{const s=document.querySelector('.ffvr-dlg select[name=type]');s.value='outro';s.dispatchEvent(new Event('change'));const e=document.querySelector('.ffvr-dlg select[name=every]');e.value='0';e.dispatchEvent(new Event('change'))})()"],
    'editar lembrete': [_pg('veterinario'), "document.querySelectorAll('.ffvr-row')[0].click()"],
}


async def t_janelas_de_combustivel_e_veterinario_iguais(app):
    await _comparar(app, JANELAS_8, LEMBRETES, lambda: _corpo(app))


async def _corpo(app):
    return _normalizar(await app.page.evaluate(CORPO))


async def t_aviso_de_lembrete_veterinario_igual(app):
    await _comparar(app, {'aviso': []}, {'vet-reminders': LEMBRETES['vet-reminders']},
                    lambda: _aviso(app))


async def _aviso(app):
    await app.page.wait_for_timeout(3500)
    h = await app.page.evaluate("document.getElementById('ff-vetbn')?.outerHTML||''")
    verificar(h, 'o aviso do lembrete não apareceu')
    return h


FAB = "document.querySelector('.jarvis-fab').click()"
def _perguntar(q): return ("(()=>{const i=document.querySelector('[aria-label=\"Mensagem para o Jarvis\"]');"
                           "Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i," + json.dumps(q) + ");"
                           "i.dispatchEvent(new Event('input',{bubbles:true}));"
                           "setTimeout(()=>document.querySelector('[aria-label=\"Enviar mensagem\"]').click(),50)})()")
ESPERAR = "new Promise(r=>setTimeout(r,900))"
JARVIS = {
    'jarvis (vazio)': [FAB],
    'jarvis (resposta e seguimento)': [FAB, _perguntar('Quanto gastei no Continente em agosto?'), ESPERAR, _perguntar('E em julho?'), ESPERAR],
    'jarvis (confirmar)': [FAB, _perguntar('Remove a Galp'), ESPERAR],
    'jarvis (erros de escrita)': [FAB, _perguntar('qto gastei em agosot?'), ESPERAR],
}


async def t_jarvis_igual_a_app_atual(app):
    await comparar_html(app, COMPLETO, JARVIS, sem_ceu=True)
