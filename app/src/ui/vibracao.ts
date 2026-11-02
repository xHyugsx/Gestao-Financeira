/** Vibração curta dos toques (separadores, mudar de mês, menus). Desliga-se em Definições › Aparência (`haptics`). */
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { eNativo } from '../nativo/plataforma';

export const vibracao = { ligada: true };

export function vibrarCurto(padrao: number | number[] = 8) {
  if (!vibracao.ligada) return;
  if (eNativo()) {
    const ms = Array.isArray(padrao) ? padrao.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) : padrao;
    void (ms <= 15 ? Haptics.impact({ style: ImpactStyle.Light }) : Haptics.vibrate({ duration: ms })).catch(() => {});
    return;
  }
  try { navigator.vibrate?.(padrao); } catch { /* sem vibração */ }
}
