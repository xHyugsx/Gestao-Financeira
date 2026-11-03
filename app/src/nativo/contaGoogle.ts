// Google Drive na APK: autorização nativa (ContaGooglePlugin.java), só com o âmbito drive.file.
import { registerPlugin } from '@capacitor/core';

const ContaGoogle = registerPlugin<{ autorizar(): Promise<{ token: string }> }>('ContaGoogle');

export async function autorizarNativo(): Promise<string> {
  try { return (await ContaGoogle.autorizar()).token; } catch (e) {
    const c = String((e as { code?: string }).code ?? '');
    throw new Error(c === 'cancelado' ? 'cancelado' : 'sem_autorizacao');
  }
}
