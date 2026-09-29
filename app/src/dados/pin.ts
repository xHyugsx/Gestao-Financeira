// O formato do hash não pode mudar: o registo da impressão digital guarda-o (secção 3 do CLAUDE.md).
const SAL = 'financas-familiar:';

/** SHA-256 hexadecimal de "financas-familiar:" + PIN. O sal é fixo, também na versão de teste /v2/. */
export async function hashPin(pin: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SAL + pin));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function pinValido(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
