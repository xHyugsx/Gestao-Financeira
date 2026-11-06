// Atualização sozinha da APK (v2.60.0): a parte web (o site do GitHub Pages) é descarregada para o telemóvel e passa a ser
// usada ao sair da app, sem instalar uma APK nova. Só quando muda a parte Android (`nativo` em app/versao.json) é preciso a APK.
import { App } from '@capacitor/app';
import { CapacitorHttp, WebView } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { NATIVO, PREFIXO, VERSAO } from '../config';
import { avisoAtualizada } from '../atualizacoes';
import { eNativo } from './plataforma';

const SITE = 'https://xhyugsx.github.io/Gestao-Financeira/';
const CHAVE = `${PREFIXO}live-update`;
const PASTA = 'web';

interface Estado {
  /** versionCode da APK instalada e o nível Android dela (lido na 1.ª abertura de cada APK, com a parte web original). */
  binario?: string;
  nativo?: number;
  /** Versão descarregada, pronta a usar ao sair da app. */
  pronta?: { versao: string; caminho: string };
  /** Versão acabada de aplicar (ao arrancar mostra «Atualizada para a versão …»). */
  aplicada?: string;
  /** Versões que não arrancaram (não se voltam a tentar). */
  falhadas?: string[];
}

export interface Remota { version: string; nativo?: number; files?: string[] }

const ler = (): Estado => { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') as Estado; } catch { return {}; } };
const gravar = (e: Estado) => { try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch { /* sem armazenamento */ } };

/** Compara versões «2.47.0». */
export function maisRecente(a: string, b: string): boolean {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
}

/** O que fazer com a versão publicada: nada, atualizar sozinha (só a parte web) ou pedir a APK nova. */
export function decidir(remota: Remota, atual: string, nativoDaApk: number, falhadas: string[] = []): 'nada' | 'web' | 'apk' {
  if (!maisRecente(remota.version, atual) || falhadas.includes(remota.version)) return 'nada';
  return (remota.nativo ?? 1) === nativoDaApk ? 'web' : 'apk';
}

/** Guarda que, se a versão descarregada não arrancar em 20 s, a app volta à parte web da APK (fica marcada como falhada). */
export function comGuarda(html: string, versao: string): string {
  const guarda = `<script>(function(){setTimeout(function(){if(window.__ffArrancou)return;try{var k=${JSON.stringify(CHAVE)},e=JSON.parse(localStorage.getItem(k)||'{}');`
    + `e.falhadas=(e.falhadas||[]).concat(${JSON.stringify(versao)});delete e.pronta;localStorage.setItem(k,JSON.stringify(e));}catch(x){}`
    + `var C=window.Capacitor;if(C&&C.nativePromise)C.nativePromise('WebView','setServerAssetPath',{path:'public'});},20000);})();</script>`;
  return html.includes('<head>') ? html.replace('<head>', `<head>${guarda}`) : guarda + html;
}


let aDescarregar = false;

/** Ao abrir e ao voltar à app: vê se há versão nova; se for só a parte web, descarrega-a. Devolve 'apk' quando é preciso instalar a APK. */
export async function verificarAtualizacao(): Promise<'nada' | 'web' | 'apk'> {
  if (!eNativo() || aDescarregar) return 'nada';
  const e = ler();
  try {
    const { build } = await App.getInfo();
    // 1.ª abertura de uma APK nova: a parte web é a original, por isso o nível Android é o desta compilação
    if (e.binario !== build) { e.binario = build; e.nativo = NATIVO; delete e.pronta; gravar(e); }
    // pedidos pelo lado Android (sem as restrições de CORS da WebView)
    const r = await CapacitorHttp.get({ url: `${SITE}version.json?t=${Date.now()}`, responseType: 'json', headers: { 'Cache-Control': 'no-cache' } });
    if (r.status !== 200) return 'nada';
    const remota = (typeof r.data === 'string' ? JSON.parse(r.data) : r.data) as Remota;
    const d = decidir(remota, VERSAO, e.nativo ?? NATIVO, e.falhadas);
    if (d !== 'web' || e.pronta?.versao === remota.version) return d;
    aDescarregar = true;
    const pasta = `${PASTA}/${remota.version}`;
    for (const f of [...new Set(['index.html', 'version.json', ...(remota.files ?? [])])]) {
      const html = f === 'index.html';
      const res = await CapacitorHttp.get({ url: `${SITE}${f}?v=${remota.version}`, responseType: html ? 'text' : 'blob' });
      if (res.status !== 200) throw new Error(`${f}: ${res.status}`);
      // «blob» chega em base64; o index.html leva a guarda de arranque
      const data = html ? btoa(unescape(encodeURIComponent(comGuarda(String(res.data), remota.version)))) : String(res.data);
      await Filesystem.writeFile({ path: `${pasta}/${f}`, data, directory: Directory.Data, recursive: true });
    }
    const { uri } = await Filesystem.getUri({ path: pasta, directory: Directory.Data });
    gravar({ ...ler(), pronta: { versao: remota.version, caminho: uri.replace(/^file:\/\//, '') } });
    return 'web';
  } catch { return 'nada'; } finally { aDescarregar = false; }
}

/** Ao sair da app: se há uma versão pronta, passa a usá-la (a app recarrega em segundo plano). */
export async function aplicarSePronta(): Promise<void> {
  if (!eNativo()) return;
  const e = ler();
  if (!e.pronta || !maisRecente(e.pronta.versao, VERSAO)) return;
  try {
    gravar({ ...e, aplicada: e.pronta.versao });
    await WebView.setServerBasePath({ path: e.pronta.caminho });
    await WebView.persistServerBasePath();
  } catch { /* fica para a próxima vez */ }
}

/** Depois de a app arrancar: marca o arranque (a guarda não volta atrás) e apaga as versões antigas descarregadas. */
export async function confirmarArranque(): Promise<void> {
  (window as unknown as { __ffArrancou?: boolean }).__ffArrancou = true;
  if (!eNativo()) return;
  const e = ler();
  if (e.pronta && !maisRecente(e.pronta.versao, VERSAO)) { delete e.pronta; gravar(e); }
  if (e.aplicada === VERSAO) { delete e.aplicada; gravar(e); avisoAtualizada(VERSAO); }
  try {
    const { files } = await Filesystem.readdir({ path: PASTA, directory: Directory.Data });
    for (const f of files) {
      if (f.name !== VERSAO && f.name !== ler().pronta?.versao) await Filesystem.rmdir({ path: `${PASTA}/${f.name}`, directory: Directory.Data, recursive: true });
    }
  } catch { /* ainda não há pasta */ }
}
