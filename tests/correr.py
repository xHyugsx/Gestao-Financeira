"""Corre todos os testes automáticos da app Finanças.

Uso:  python tests/correr.py            (todos)
      python tests/correr.py jarvis     (só os ficheiros cujo nome contém "jarvis")
Variáveis opcionais:
      FF_URL=v2/                        (caminho a testar, relativo à raiz, ou endereço completo)
      FF_PREFIX=financas-v2:            (prefixo das chaves do localStorage; por omissão financas-familiar:)
Requer: pip install playwright && python -m playwright install chromium, e Node.js (monta o site em _site/)
"""
import asyncio, importlib.util, pathlib, sys, os, time, threading, http.server, functools, socket, subprocess, traceback

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SITE = RAIZ / '_site'
DATA_FIXA = '2026-09-28T11:00:00Z'  # 12:00 em Lisboa
PREFIXO_REAL = 'financas-familiar:'
PREFIXO = os.environ.get('FF_PREFIX', PREFIXO_REAL)


def chave(k):
    """Traduz uma chave escrita com o prefixo real para o prefixo em teste."""
    return PREFIXO + k[len(PREFIXO_REAL):] if k.startswith(PREFIXO_REAL) else k


def montar():
    """Monta o site publicado (raiz = app atual, /v2/ = versão de teste) em _site/."""
    subprocess.run(['node', str(RAIZ / 'scripts' / 'montar-site.mjs')], check=True, stdout=subprocess.DEVNULL)


def servidor():
    montar()
    s = socket.socket(); s.bind(('127.0.0.1', 0)); porta = s.getsockname()[1]; s.close()
    class Silencioso(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    h = functools.partial(Silencioso, directory=str(SITE))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', porta), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{porta}/'


class App:
    """Ajudas partilhadas pelos testes."""
    def __init__(self, page, url, raiz=None):
        self.page, self.url, self.erros = page, url, []
        self.raiz = raiz or url  # raiz do site (a app atual); a versão de teste está em raiz + 'v2/'
        page.on('pageerror', lambda e: self.erros.append(str(e)))

    async def abrir(self, dados=None, extra=None, sem_backup_aviso=True):
        p = self.page
        await p.goto(self.url); await self.esperar_sw()
        extra = {chave(k): v for k, v in (extra or {}).items()}
        await p.evaluate("""([d,x,s,P])=>{localStorage.clear();if(d)localStorage.setItem(P+'v3',JSON.stringify(d));
          if(s)localStorage.setItem(P+'last-backup',new Date().toISOString());
          for(const k in (x||{}))localStorage.setItem(k,typeof x[k]==='string'?x[k]:JSON.stringify(x[k]))}""", [dados, extra, sem_backup_aviso, PREFIXO])
        await p.goto(self.url); await p.wait_for_timeout(1800)

    async def esperar_sw(self, limite=15):
        """Na 1.ª visita, a app recarrega quando o service worker fica ativo; espera por isso."""
        p = self.page
        for _ in range(limite * 5):
            try:
                if await p.evaluate("!!navigator.serviceWorker.controller"):
                    break
            except Exception:
                pass  # a página estava a recarregar
            await p.wait_for_timeout(200)
        await p.wait_for_timeout(500); await p.wait_for_load_state('load')

    async def jarvis(self, pergunta):
        p = self.page
        if not await p.query_selector('.jarvis-overlay'):
            await p.click('.jarvis-fab'); await p.wait_for_timeout(500)
        await p.fill('[aria-label="Mensagem para o Jarvis"]', pergunta); await p.keyboard.press('Enter')
        await p.wait_for_timeout(750)
        return await p.evaluate("[...document.querySelectorAll('.jarvis-msg-ai')].pop().textContent")

    async def movimentos(self):
        return await self.page.evaluate("P=>JSON.parse(localStorage.getItem(P+'v3')||'{}').transactions||[]", PREFIXO)

    async def novo_movimento(self, titulo, valor, nota=None):
        p = self.page
        await p.click('[aria-label="Adicionar movimento"]'); await p.wait_for_timeout(500)
        await p.fill('.movement-dialog input[name=title]', titulo); await p.fill('.movement-dialog input[name=amount]', valor)
        if nota: await p.fill('.movement-dialog textarea[name=note]', nota)
        await p.click('.movement-dialog button[type=submit]'); await p.wait_for_timeout(600)


def verificar(condicao, mensagem):
    if not condicao:
        raise AssertionError(mensagem)


class Pendente(Exception):
    """Teste de uma parte da app ainda não migrada para a versão de teste (/v2/): não conta como aprovado."""


ATIVOS_V2 = pathlib.Path(__file__).parent / 'v2_ativos.txt'
SO_RAIZ = {'teste_v2', 'teste_visual'}  # comparam a raiz com a /v2/: correm só na execução da raiz
SO_V2 = {'teste_correcoes', 'teste_importacao', 'teste_jarvis_v2', 'teste_atualizacao_v2'}  # funções novas da app nova (correções pedidas pelo dono): a app atual não as tem


def ativos_v2():
    """Testes já aplicáveis à app nova (ficheiro ou ficheiro:teste por linha)."""
    linhas = [l.split('#')[0].strip() for l in ATIVOS_V2.read_text(encoding='utf-8').splitlines()]
    return {l for l in linhas if l}


async def main(filtro):
    from playwright.async_api import async_playwright
    os.chdir(RAIZ)
    srv, raiz = servidor()
    alvo = os.environ.get('FF_URL', '')
    url = alvo if alvo.startswith('http') else raiz + alvo
    ficheiros = sorted(pathlib.Path(__file__).parent.glob('teste_*.py'))
    if filtro: ficheiros = [f for f in ficheiros if filtro in f.name]
    em_v2 = alvo.rstrip('/').endswith('v2')
    if em_v2:
        ficheiros = [f for f in ficheiros if f.stem not in SO_RAIZ]
        ativos = ativos_v2()
    else:
        ficheiros = [f for f in ficheiros if f.stem not in SO_V2]
    resultados = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        for f in ficheiros:
            spec = importlib.util.spec_from_file_location(f.stem, f); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
            for nome, fn in [(n, getattr(mod, n)) for n in dir(mod) if n.startswith('t_')]:
                ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, timezone_id='Europe/Lisbon', locale='pt-PT', accept_downloads=True)
                page = await ctx.new_page(); await page.clock.set_system_time(DATA_FIXA)
                app = App(page, url, raiz); t0 = time.time()
                try:
                    if em_v2 and f.stem not in ativos and f'{f.stem}:{nome}' not in ativos:
                        raise Pendente('ainda não migrado para a app nova')
                    await fn(app)
                    verificar(not app.erros, f'erros na página: {app.erros[:2]}')
                    resultados.append((f.stem, nome, True, '', time.time() - t0))
                except Pendente as e:
                    resultados.append((f.stem, nome, None, str(e), time.time() - t0))
                except Exception as e:
                    msg = str(e).splitlines()[0][:160] if str(e) else traceback.format_exc().splitlines()[-1]
                    resultados.append((f.stem, nome, False, msg, time.time() - t0))
                await ctx.close()
        await browser.close()
    srv.shutdown()
    ok = sum(1 for r in resultados if r[2])
    pend = sum(1 for r in resultados if r[2] is None)
    falhas = len(resultados) - ok - pend
    print(f"\n{'Ficheiro':24} {'Teste':44} Resultado")
    for fic, nome, passou, msg, dur in resultados:
        estado = '✔' if passou else '⏸ pendente' if passou is None else '✘ ' + msg
        print(f"{fic:24} {nome[2:].replace('_', ' '):44} {estado}")
    extra = f' · {pend} pendentes (partes ainda não migradas para a app nova)' if pend else ''
    print(f"\n{ok}/{len(resultados) - pend} testes passaram{extra}.")
    return 0 if not falhas else 1


if __name__ == '__main__':
    sys.modules['correr'] = sys.modules['__main__']  # os testes importam «correr»: tem de ser este mesmo módulo
    sys.exit(asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else '')))
