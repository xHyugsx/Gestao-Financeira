// Ditado (plugin nativo VozPlugin): o microfone só liga quando se toca no botão, com a app aberta.
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface PluginVoz {
  ouvir(o: { permitirRede?: boolean }): Promise<{ texto: string; noTelemovel: boolean }>;
  parar(): Promise<void>;
  addListener(e: 'parcial', f: (d: { texto: string }) => void): Promise<PluginListenerHandle>;
  addListener(e: 'estado', f: (d: { estado: 'a-ouvir' | 'a-pensar' }) => void): Promise<PluginListenerHandle>;
}

const Voz = registerPlugin<PluginVoz>('Voz');

export type ErroVoz = 'sem-offline' | 'sem-autorizacao' | 'sem-fala' | 'indisponivel' | 'parado' | 'erro';

export async function ditar(permitirRede: boolean, aoOuvir: (parcial: string) => void): Promise<{ texto: string } | { erro: ErroVoz }> {
  const h = await Voz.addListener('parcial', (d) => aoOuvir(d.texto));
  try {
    const r = await Voz.ouvir({ permitirRede });
    return { texto: r.texto };
  } catch (e) {
    const c = String((e as { code?: string }).code ?? '');
    return { erro: (['sem-offline', 'sem-autorizacao', 'sem-fala', 'indisponivel', 'parado'].includes(c) ? c : 'erro') as ErroVoz };
  } finally { void h.remove(); }
}

export const pararDitado = () => Voz.parar().catch(() => undefined);
