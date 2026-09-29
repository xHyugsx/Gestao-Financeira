"""A app nova (/v2/) tem de desenhar exatamente o mesmo que a app atual (raiz) nas partes já migradas."""
import asyncio, base64, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from correr import verificar
from capturar_referencias_dados import COMPLETO, CASOS, PERFIL

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


async def abrir(app, url, prefixo, dados):
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
    return await app.page.evaluate("document.querySelector('.cosmic-app').outerHTML")


async def comparar_html(app, dados, estados):
    await app.page.emulate_media(reduced_motion='reduce')
    for nome, acoes in estados.items():
        atual = await html(app, app.raiz, 'financas-familiar:', dados, acoes)
        nova = await html(app, app.raiz + 'v2/', 'financas-v2:', dados, acoes)
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
    for url, prefixo in ((app.raiz, 'financas-familiar:'), (app.raiz + 'v2/', 'financas-v2:')):
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
    'novo (recorrente sem valor)': [MAIS, _caixa(0), "(()=>{const s=document.querySelector('[role=dialog] .movement-checks select');s.value='sem';s.dispatchEvent(new Event('change',{bubbles:true}))})()"],
    'novo (Revolut)': [MAIS, _caixa(2)], 'editar despesa': [_editar('Continente')],
    'editar transferência': [VER_TODAS, _editar('Transferência')], 'editar Revolut': [VER_TODAS, _editar('Para a conjunta')],
}


def _normalizar(h):
    h = re.sub(r'radix-[^" ]+', 'radix-ID', h)
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
        atual = await _janela(app, app.raiz, 'financas-familiar:', acoes)
        nova = await _janela(app, app.raiz + 'v2/', 'financas-v2:', acoes)
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
    await p.fill('[role=dialog] input[name=amount]', '61,2'); await p.fill('[role=dialog] input[name=category]', 'Carro')
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
    atual = await _registar_editar_eliminar(app, app.raiz, 'financas-familiar:')
    nova = await _registar_editar_eliminar(app, app.raiz + 'v2/', 'financas-v2:')
    for i, nome in enumerate(['despesa nova', 'transferência Revolut', 'edição', 'eliminação', 'mensagem de valor em falta']):
        verificar(atual[i] == nova[i], f'{nome}: atual {str(atual[i])[:200]} · nova {str(nova[i])[:200]}')
