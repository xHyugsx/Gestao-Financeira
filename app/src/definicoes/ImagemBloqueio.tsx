// Definições › Segurança › Imagem do ecrã de bloqueio (só na APK). Guardada reduzida em `lockImage` (vai no backup).
import { type ChangeEvent, useRef, useState } from 'react';
import type { Estado } from '../dados';
import { reduzirImagem, TAMANHOS } from '../ui/imagem';

export function ImagemBloqueio({ estado, mudarEstado }: { estado: Estado; mudarEstado: (f: (e: Estado) => Estado) => void }) {
  const ficheiro = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState('');
  const imagem = typeof estado.extras.lockImage === 'string' ? estado.extras.lockImage : null;
  const escolhida = async (ev: ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f) return;
    setMensagem('A preparar a imagem…');
    try {
      const r = await reduzirImagem(f, TAMANHOS.bloqueio);
      if (!r.startsWith('data:image/')) throw new Error('formato');
      mudarEstado((e) => ({ ...e, extras: { ...e.extras, lockImage: r } }));
      setMensagem('Imagem guardada. Vais vê-la da próxima vez que a app bloquear.');
    } catch { setMensagem('Não foi possível ler esta imagem. Experimenta uma fotografia JPG ou PNG.'); }
  };
  const tirar = () => {
    mudarEstado((e) => { const extras = { ...e.extras }; delete extras.lockImage; return { ...e, extras }; });
    setMensagem('O ecrã de bloqueio volta a mostrar o logótipo animado.');
  };
  return (
    <section className="settings-panel ffbloq-imagem">
      <h3>Imagem do ecrã de bloqueio</h3>
      <p className="settings-copy">Escolhe uma fotografia do telemóvel. Fica reduzida ao tamanho do ecrã e vai também no backup.</p>
      <div className="ffbloq-miniat">
        <button type="button" className={`ffbloq-mi ffbloq-logo${imagem ? '' : ' on'}`} onClick={tirar} aria-pressed={!imagem}>
          <img src="icons/icon-512.png" alt="" /><span>Logótipo animado{imagem ? '' : ' ✓'}</span>
        </button>
        <button type="button" className={`ffbloq-mi${imagem ? ' on' : ''}`} onClick={() => ficheiro.current?.click()} aria-pressed={!!imagem}
          style={imagem ? { backgroundImage: `url('${imagem}')` } : undefined}>
          <span>{imagem ? 'A tua imagem ✓' : 'Escolher imagem'}</span>
        </button>
      </div>
      <button type="button" className="ffnt-teste" onClick={() => ficheiro.current?.click()}>{imagem ? 'Escolher outra imagem' : 'Escolher imagem'}</button>
      <input ref={ficheiro} type="file" accept="image/*" className="hidden" aria-label="Imagem do ecrã de bloqueio" onChange={(e) => void escolhida(e)} />
      {mensagem ? <p className="settings-message" role="status">{mensagem}</p> : null}
    </section>
  );
}
