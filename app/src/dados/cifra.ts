// Backup protegido com palavra-passe: o JSON do backup normal cifrado com AES-256-GCM, com a chave derivada da
// palavra-passe por PBKDF2-SHA256. Sem a palavra-passe não há forma de o recuperar.

export interface BackupCifrado {
  app: 'financas-familiar';
  version: 4;
  exportedAt: string;
  encrypted: { alg: 'AES-GCM'; kdf: 'PBKDF2-SHA256'; iterations: number; salt: string; iv: string; data: string };
}

export const ITERACOES = 310000;
export const SENHA_MIN = 6;

const paraBase64 = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const deBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function chaveDe(senha: string, sal: Uint8Array, iteracoes: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: iteracoes }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** O conteúdo JSON é um backup protegido? */
export function eBackupCifrado(t: unknown): t is BackupCifrado {
  const e = (t as BackupCifrado | null)?.encrypted;
  return !!e && typeof e === 'object' && e.alg === 'AES-GCM' && typeof e.data === 'string' && typeof e.salt === 'string' && typeof e.iv === 'string';
}

export async function cifrarBackup(texto: string, senha: string, agora = new Date(), iteracoes = ITERACOES): Promise<BackupCifrado> {
  const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const dados = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chaveDe(senha, sal, iteracoes), new TextEncoder().encode(texto));
  return {
    app: 'financas-familiar', version: 4, exportedAt: agora.toISOString(),
    encrypted: { alg: 'AES-GCM', kdf: 'PBKDF2-SHA256', iterations: iteracoes, salt: paraBase64(sal), iv: paraBase64(iv), data: paraBase64(new Uint8Array(dados)) },
  };
}

/** Devolve o JSON do backup; `null` se a palavra-passe estiver errada (ou o ficheiro alterado). */
export async function decifrarBackup(b: BackupCifrado, senha: string): Promise<string | null> {
  try {
    const e = b.encrypted;
    const chave = await chaveDe(senha, deBase64(e.salt), e.iterations || ITERACOES);
    const dados = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(e.iv) as BufferSource }, chave, deBase64(e.data) as BufferSource);
    return new TextDecoder().decode(dados);
  } catch {
    return null;
  }
}
