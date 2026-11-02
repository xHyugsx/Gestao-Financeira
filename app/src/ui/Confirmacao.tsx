// Confirmação depois de guardar, alterar ou eliminar um movimento (v2.45.1): um disco que surge pequeno, cresce a rodar,
// fica parado e desaparece, com um som suave (Definições › Aparência › Sons). Não bloqueia toques.
import { Icone } from './Icone';

export type TipoConfirmacao = 'guardado' | 'alterado' | 'eliminado';

const ICONE = { alterado: 'pencil', eliminado: 'trash-2' } as const;
const TEXTO = { guardado: 'Movimento guardado', alterado: 'Alterações guardadas', eliminado: 'Movimento eliminado' } as const;

export function Confirmacao({ evento }: { evento: { tipo: TipoConfirmacao; chave: number } | null }) {
  if (!evento) return null;
  return (
    <div key={evento.chave} className={`ffconf ffconf-${evento.tipo}`} role="status" aria-live="polite">
      <span className="ffconf-disco" aria-hidden="true">
        {evento.tipo === 'guardado'
          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          : <Icone nome={ICONE[evento.tipo]} />}
      </span>
      <span className="sr-only">{TEXTO[evento.tipo]}</span>
    </div>
  );
}

// Sons sintetizados (Web Audio, sem ficheiros): duas notas curtas e baixas, a subir ao guardar e a descer ao eliminar
let audio: AudioContext | null = null;
const NOTAS: Record<TipoConfirmacao, [number, number][]> = {
  guardado: [[880, 0], [1318.5, 0.09]],
  alterado: [[740, 0], [987.8, 0.08]],
  eliminado: [[587.3, 0], [392, 0.1]],
};
export function somDaConfirmacao(tipo: TipoConfirmacao) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === 'suspended') void audio.resume();
    const t0 = audio.currentTime + 0.02;
    for (const [f, d] of NOTAS[tipo]) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.06, t0 + d + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.38);
      o.connect(g).connect(audio.destination);
      o.start(t0 + d); o.stop(t0 + d + 0.4);
    }
  } catch { /* sem som */ }
}
