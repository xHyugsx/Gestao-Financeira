// Ligações da APK ao Android: botão Voltar, atalhos do ícone e aviso de versão nova.
import { App } from '@capacitor/app';
import { VERSAO } from '../config';
import { eNativo } from './plataforma';
import { aplicarSePronta, maisRecente, verificarAtualizacao } from './atualizarWeb';

const JANELAS = "[role='dialog']:not(.settings-sheet), [role='alertdialog'], .ffmore-ov, #pwa-update-overlay";

/** Voltar: fecha a janela aberta → (histórico da app: Definições, página → Principal) → sai para segundo plano. */
function voltar(podeRecuar: boolean) {
  if (document.getElementById('ff-lock') && !document.querySelector('#ff-lock.ffl-gone')) { void App.minimizeApp(); return; }
  if (document.querySelector('.ffmore-ov')) { window.ffMoreClose?.(); return; }
  if (document.querySelector('#pwa-update-overlay')) { document.getElementById('pwa-update-dismiss')?.click(); return; }
  if (document.querySelector(JANELAS)) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return; }
  if (podeRecuar) window.history.back(); else void App.minimizeApp();
}

/** «?acao=despesa|jarvis» de um endereço vindo de um atalho (financas://acao/despesa ou …?acao=despesa). */
export function acaoDoEndereco(url: string | undefined): string | null {
  if (!url) return null;
  const m = /[?&]acao=(despesa|jarvis)\b/.exec(url) ?? /\/\/acao\/(despesa|jarvis)\b/.exec(url);
  return m?.[1] ?? null;
}

export { maisRecente } from './atualizarWeb';

async function verificarVersao(ignoradas: Set<string>) {
  // primeiro a atualização sozinha (só a parte web); o aviso da APK só quando muda a parte Android (v2.60.0)
  if (await verificarAtualizacao() !== 'apk') return;
  try {
    const r = await fetch('https://api.github.com/repos/xHyugsx/Gestao-Financeira/releases/latest', { cache: 'no-store' });
    if (!r.ok) return;
    const rel = await r.json() as { tag_name?: string; assets?: { name: string; browser_download_url: string }[] };
    const nova = rel.tag_name?.replace(/^apk-v/, '') ?? '';
    const apk = rel.assets?.find((a) => /^financas-v[\d.]+\.apk$/.test(a.name));
    if (!apk || !maisRecente(nova, VERSAO) || ignoradas.has(nova) || document.getElementById('pwa-update-overlay')) return;
    const o = document.createElement('div');
    o.id = 'pwa-update-overlay';
    o.innerHTML = `<div class="pwa-update-card"><h3>Nova versão disponível</h3><p>A versão ${nova} está pronta. Descarrega a APK e instala-a por cima: os dados ficam.</p><div class="pwa-update-actions"><button class="pwa-update-btn dismiss" id="pwa-update-dismiss">Ignorar</button><button class="pwa-update-btn confirm" id="pwa-update-confirm">Descarregar</button></div></div>`;
    document.body.appendChild(o);
    document.getElementById('pwa-update-dismiss')!.onclick = () => { ignoradas.add(nova); o.remove(); };
    document.getElementById('pwa-update-confirm')!.onclick = () => { o.remove(); window.location.href = apk.browser_download_url; };
  } catch { /* sem rede: tenta ao voltar */ }
}

/** Antes de montar a app: o atalho com que foi aberta passa para o endereço (lido pela App). */
export async function prepararAndroid(): Promise<void> {
  if (!eNativo()) return;
  // uma versão descarregada que ficou por aplicar (a app foi fechada antes): aplica já, antes de mostrar a app
  if (await aplicarSePronta()) await new Promise((r) => setTimeout(r, 3000));
  const acao = acaoDoEndereco((await App.getLaunchUrl().catch(() => undefined))?.url);
  if (acao) window.history.replaceState(window.history.state, '', `?acao=${acao}`);
}

/** Enquanto se toca, desliza ou faz scroll, as animações decorativas em SVG (céu, anel, robô) param:
 *  na WebView redesenham o SVG inteiro em cada fotograma e roubam tempo às animações da interface. */
function pausarDecoracaoAoTocar() {
  const raiz = document.documentElement;
  let t: ReturnType<typeof setTimeout> | undefined;
  const mexer = () => {
    raiz.classList.add('ff-toque');
    clearTimeout(t);
    t = setTimeout(() => raiz.classList.remove('ff-toque'), 600);
  };
  for (const ev of ['pointerdown', 'touchmove', 'scroll', 'wheel']) document.addEventListener(ev, mexer, { passive: true, capture: true });
}

export function iniciarAndroid(): void {
  if (!eNativo()) return;
  pausarDecoracaoAoTocar();
  void App.addListener('backButton', ({ canGoBack }) => voltar(canGoBack));
  void App.addListener('appUrlOpen', ({ url }) => {
    const acao = acaoDoEndereco(url);
    if (acao) window.dispatchEvent(new CustomEvent('ff-acao', { detail: acao }));
  });
  const ignoradas = new Set<string>();
  void verificarVersao(ignoradas);
  void App.addListener('resume', () => void verificarVersao(ignoradas));
  // ao sair da app, a versão descarregada passa a ser usada (depois do backup automático e das notificações)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') setTimeout(() => { if (document.visibilityState === 'hidden') void aplicarSePronta(); }, 6000); });
}
