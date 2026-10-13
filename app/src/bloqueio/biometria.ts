// Impressão digital (WebAuthn). O formato do registo e os parâmetros do pedido ao sensor são
// exatamente os da app atual: um registo feito lá continua válido aqui (e vice-versa).
import { PREFIXO } from '../config';
import { chave } from '../dados';

const REGISTO = chave('biometria', PREFIXO);
const OFERTA = chave('ofertaBiometria', PREFIXO);

/** Registo guardado: id da credencial (base64url) e o hash do PIN com que foi ativado. */
interface Registo { id: string; pin: string }

function paraBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(s: string): Uint8Array<ArrayBuffer> {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  return Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
}

const aleatorio = (n: number) => crypto.getRandomValues(new Uint8Array(n));

function ler(): Registo | null {
  try { return JSON.parse(localStorage.getItem(REGISTO) || 'null'); } catch { return null; }
}

export function desativar(): void {
  try { localStorage.removeItem(REGISTO); } catch { /* sem armazenamento */ }
}

/** O telemóvel tem sensor e a página pode usá-lo. */
export async function disponivel(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable || !window.isSecureContext) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
  } catch { return false; }
}

/** Há impressão digital ativa para este PIN. Se o PIN mudou, o registo antigo é desativado. */
export function registada(hashPin: string): boolean {
  const r = ler();
  if (!r?.id) return false;
  if (r.pin !== hashPin) { desativar(); return false; }
  return true;
}

export async function registar(hashPin: string): Promise<boolean> {
  try {
    const c = await navigator.credentials.create({
      publicKey: {
        challenge: aleatorio(32),
        rp: { name: 'Finanças' },
        user: { id: aleatorio(16), name: 'financas', displayName: 'Finanças' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null;
    if (!c) return false;
    localStorage.setItem(REGISTO, JSON.stringify({ id: paraBase64Url(c.rawId), pin: hashPin } satisfies Registo));
    return true;
  } catch { return false; }
}

/** Pede o dedo; `true` só se o sensor confirmou o utilizador (bit UV dos dados do autenticador). */
export async function verificar(hashPin: string, sinal?: AbortSignal): Promise<boolean> {
  const r = ler();
  if (!r || r.pin !== hashPin) return false;
  try {
    const a = await navigator.credentials.get({
      signal: sinal,
      publicKey: {
        challenge: aleatorio(32),
        allowCredentials: [{ type: 'public-key', id: deBase64Url(r.id), transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;
    if (!a) return false;
    return !!(new Uint8Array((a.response as AuthenticatorAssertionResponse).authenticatorData)[32]! & 4);
  } catch { return false; }
}

export function ofertaRecusada(): boolean {
  try { return localStorage.getItem(OFERTA) === 'no'; } catch { return true; }
}

export function recusarOferta(): void {
  try { localStorage.setItem(OFERTA, 'no'); } catch { /* sem armazenamento */ }
}
