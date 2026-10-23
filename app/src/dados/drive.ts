// Google Drive (Definições › Backup): guarda a cópia protegida de cada telemóvel numa pasta do Drive do utilizador e
// substitui-a em cada backup. Sem servidor: autorização OAuth no navegador («token» de 1 hora, só com acesso aos
// ficheiros criados pela app — `drive.file`). A configuração fica neste telemóvel (não vai no backup).

export const ESCOPO = 'https://www.googleapis.com/auth/drive.file';
export const PASTA = 'Finanças — backups';
const CHAVE = 'financas-familiar:drive';
const RESPOSTA = 'financas-familiar:drive-resposta';
const PENDENTE = 'financas-familiar:drive-pendente';
const TOKEN = 'financas-familiar:drive-token';
const API = 'https://www.googleapis.com';
/** Texto cifrado com a palavra-passe do Drive para confirmar que é a mesma da última vez (a palavra-passe nunca é guardada). */
export const TESTE_SENHA = 'financas-drive-ok';

export interface ConfigDrive {
  clientId?: string;
  /** Envia a cópia protegida sempre que se faz um backup. */
  ligado?: boolean;
  conta?: string;
  dispositivo?: string;
  pastaId?: string;
  ficheiroId?: string;
  ultimoEnvio?: string;
  /** Movimentos da última cópia enviada (para avisar antes de a substituir por uma muito mais pequena). */
  movimentos?: number;
  verificador?: unknown;
}

export interface FicheiroDrive { id: string; name: string; modifiedTime: string; size?: string }

const ler = <T>(k: string, s: Storage = localStorage): T | null => { try { return JSON.parse(s.getItem(k) || 'null') as T | null; } catch { return null; } };
const gravar = (k: string, v: unknown, s: Storage = localStorage) => { try { if (v == null) s.removeItem(k); else s.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

export function lerConfigDrive(): ConfigDrive {
  const c = ler<ConfigDrive>(CHAVE) || {};
  if (!c.dispositivo) { c.dispositivo = `Telemóvel ${Math.random().toString(36).slice(2, 5).toUpperCase()}`; gravar(CHAVE, c); }
  return c;
}
export const gravarConfigDrive = (c: ConfigDrive) => gravar(CHAVE, c);
export const mudarConfigDrive = (f: (c: ConfigDrive) => ConfigDrive) => gravarConfigDrive(f(lerConfigDrive()));

/** Endereço para onde o Google volta depois de autorizar (tem de estar registado na Google Cloud, tal e qual). */
export const enderecoDeRetorno = (href = location.href) => new URL('./', href).href;

export function urlDeAutorizacao(o: { clientId: string; retorno: string; estado: string; conta?: string; escolherConta?: boolean }): string {
  const p = new URLSearchParams({
    client_id: o.clientId, redirect_uri: o.retorno, response_type: 'token', scope: ESCOPO, include_granted_scopes: 'true', state: o.estado,
  });
  if (o.conta) p.set('login_hint', o.conta);
  if (o.escolherConta) p.set('prompt', 'select_account');
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

/** Lê a resposta do Google («#access_token=…»); só aceita a do pedido feito por esta app (mesmo `state`). */
export function lerResposta(hash: string, estado: string, agora = Date.now()): { token: string; expira: number } | { erro: string } | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  if (p.get('state') !== estado) return null;
  const erro = p.get('error');
  if (erro) return { erro };
  const token = p.get('access_token');
  return token ? { token, expira: agora + (Number(p.get('expires_in')) || 3600) * 1000 } : { erro: 'sem_token' };
}

/**
 * Logo ao abrir: se a página traz a resposta do Google, guarda-a para a janela da app e limpa o endereço.
 * Devolve `true` se esta janela é só a da autorização (abre-se por cima da app e fecha-se sozinha).
 */
export function tratarRespostaGoogle(): boolean {
  if (!/[#&](access_token|error)=/.test(location.hash)) return false;
  gravar(RESPOSTA, { hash: location.hash.slice(1), t: Date.now() });
  history.replaceState(null, '', location.pathname + location.search);
  const janela = !!window.opener || window.name === 'ffdrive';
  if (janela) setTimeout(() => window.close(), 60);
  return janela;
}

// --- autorização (token só nesta sessão do navegador) ---

export function tokenValido(agora = Date.now()): string | null {
  const t = ler<{ token: string; expira: number }>(TOKEN, sessionStorage);
  return t && t.expira - 60000 > agora ? t.token : null;
}
export const esquecerToken = () => gravar(TOKEN, null, sessionStorage);

let espera: { resolver: (t: string) => void; rejeitar: (e: Error) => void } | null = null;

/**
 * Pede autorização ao Google numa janela por cima da app (tem de ser chamado no toque do utilizador).
 * Se o telemóvel não deixar abrir a janela, vai para o Google nesta mesma janela e volta à app no fim.
 */
export function pedirAutorizacao(acao: string, escolherConta = false): Promise<string> {
  const c = lerConfigDrive();
  if (!c.clientId) return Promise.reject(new Error('sem_cliente'));
  const estado = crypto.randomUUID();
  gravar(PENDENTE, { estado, acao, t: Date.now() });
  const url = urlDeAutorizacao({ clientId: c.clientId, retorno: enderecoDeRetorno(), estado, conta: c.conta, escolherConta });
  const promessa = new Promise<string>((resolver, rejeitar) => {
    espera?.rejeitar(new Error('substituido'));
    espera = { resolver, rejeitar };
    setTimeout(() => { if (espera?.resolver === resolver) { espera = null; rejeitar(new Error('tempo')); } }, 5 * 60000);
  });
  const janela = window.open(url, 'ffdrive', 'popup,width=480,height=680');
  if (!janela) location.assign(url);
  return promessa;
}

/** Token válido ou nova autorização (no toque do utilizador). */
export const obterToken = (acao: string): Promise<string> => {
  const t = tokenValido();
  return t ? Promise.resolve(t) : pedirAutorizacao(acao);
};

/**
 * Trata a resposta do Google que chegou (da janela da autorização ou depois de voltar à app). Devolve a ação que a
 * pediu e o resultado, ou `null` se não havia resposta desta app.
 */
export function receberResposta(valor?: string | null): { acao: string; token?: string; erro?: string; esperava: boolean } | null {
  const r = valor ? (JSON.parse(valor) as { hash: string }) : ler<{ hash: string }>(RESPOSTA);
  const p = ler<{ estado: string; acao: string }>(PENDENTE);
  if (!r || !p) return null;
  const lida = lerResposta(r.hash, p.estado);
  if (!lida) return null;
  gravar(RESPOSTA, null); gravar(PENDENTE, null);
  const esperava = !!espera;
  if ('erro' in lida) { espera?.rejeitar(new Error(lida.erro)); espera = null; return { acao: p.acao, erro: lida.erro, esperava }; }
  gravar(TOKEN, lida, sessionStorage);
  espera?.resolver(lida.token); espera = null;
  return { acao: p.acao, token: lida.token, esperava };
}
export const CHAVE_RESPOSTA = RESPOSTA;

// --- Drive ---

export class ErroDrive extends Error {
  constructor(public estado: number, mensagem: string) { super(mensagem); }
}

async function pedido(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  if (r.status === 401) esquecerToken();
  if (!r.ok) throw new ErroDrive(r.status, `Drive: ${r.status}`);
  return r;
}

export async function contaDoDrive(token: string): Promise<string> {
  const r = await pedido(token, `${API}/drive/v3/about?fields=user(emailAddress)`);
  return ((await r.json()) as { user?: { emailAddress?: string } }).user?.emailAddress || '';
}

/** Pasta da app no Drive (a mesma para os dois telemóveis da mesma conta); cria-a se ainda não existir. */
export async function garantirPasta(token: string, conhecida?: string): Promise<string> {
  if (conhecida) {
    try {
      const r = await pedido(token, `${API}/drive/v3/files/${conhecida}?fields=id,trashed`);
      if (!((await r.json()) as { trashed?: boolean }).trashed) return conhecida;
    } catch (e) { if (!(e instanceof ErroDrive) || e.estado !== 404) throw e; }
  }
  const q = encodeURIComponent(`name='${PASTA}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const l = (await (await pedido(token, `${API}/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`)).json()) as { files: { id: string }[] };
  if (l.files[0]) return l.files[0].id;
  const r = await pedido(token, `${API}/drive/v3/files?fields=id`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: PASTA, mimeType: 'application/vnd.google-apps.folder' }),
  });
  return ((await r.json()) as { id: string }).id;
}

export const nomeNoDrive = (dispositivo: string) => `Finanças - backup protegido (${dispositivo}).json`;

/** Corpo «multipart/related» do Drive: metadados + conteúdo. */
export function corpoMultipart(metadados: object, conteudo: string, fronteira = `ff${Math.random().toString(36).slice(2)}`) {
  return {
    tipo: `multipart/related; boundary=${fronteira}`,
    corpo: `--${fronteira}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadados)}\r\n--${fronteira}\r\nContent-Type: application/json\r\n\r\n${conteudo}\r\n--${fronteira}--`,
  };
}

/** Envia a cópia: substitui o ficheiro deste telemóvel (o Drive guarda a versão anterior durante uns dias) ou cria-o. */
export async function enviarCopia(token: string, conteudo: string, c: ConfigDrive): Promise<{ pastaId: string; ficheiroId: string }> {
  const pastaId = await garantirPasta(token, c.pastaId), nome = nomeNoDrive(c.dispositivo || 'Telemóvel');
  if (c.ficheiroId) {
    const { tipo, corpo } = corpoMultipart({ name: nome }, conteudo);
    try {
      const r = await pedido(token, `${API}/upload/drive/v3/files/${c.ficheiroId}?uploadType=multipart&fields=id`, { method: 'PATCH', headers: { 'Content-Type': tipo }, body: corpo });
      return { pastaId, ficheiroId: ((await r.json()) as { id: string }).id };
    } catch (e) { if (!(e instanceof ErroDrive) || e.estado !== 404) throw e; }
  }
  const { tipo, corpo } = corpoMultipart({ name: nome, parents: [pastaId], mimeType: 'application/json' }, conteudo);
  const r = await pedido(token, `${API}/upload/drive/v3/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': tipo }, body: corpo });
  return { pastaId, ficheiroId: ((await r.json()) as { id: string }).id };
}

export async function listarCopias(token: string, c: ConfigDrive): Promise<FicheiroDrive[]> {
  const pastaId = await garantirPasta(token, c.pastaId);
  const q = encodeURIComponent(`'${pastaId}' in parents and trashed=false`);
  const r = await pedido(token, `${API}/drive/v3/files?q=${q}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,size)&spaces=drive`);
  return ((await r.json()) as { files: FicheiroDrive[] }).files;
}

export async function descarregarCopia(token: string, id: string): Promise<string> {
  return (await pedido(token, `${API}/drive/v3/files/${id}?alt=media`)).text();
}

/** Revoga a autorização (ao desligar). */
export async function revogar(token: string) {
  try { await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' }); } catch { /* sem rede */ }
}

/** A cópia nova tem muito menos movimentos do que a que está no Drive (ex.: dados apagados por engano)? */
export const muitoMaisPequena = (novos: number, anteriores?: number) => !!anteriores && anteriores >= 20 && novos < anteriores * 0.5;
