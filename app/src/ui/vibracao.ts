/** Vibração curta dos toques (separadores, mudar de mês, menus). Desliga-se em Definições › Aparência (`haptics`). */
export const vibracao = { ligada: true };

export function vibrarCurto(padrao: number | number[] = 8) {
  if (!vibracao.ligada) return;
  try { navigator.vibrate?.(padrao); } catch { /* sem vibração */ }
}
