// Botão do microfone no «+» (só na APK). O microfone só liga ao tocar e desliga-se sozinho (ver nativo/voz.ts).
import { useEffect, useState } from 'react';
import { interpretarDitado, type Ditado } from '../nativo/ditado';
import { ditar, pararDitado } from '../nativo/voz';
import { Icone } from '../ui/Icone';

let redeAceite = false;  // só nesta sessão: o dono aceitou usar o reconhecimento normal (pode ir à Google)

type Fase = { f: 'parado' } | { f: 'a-ouvir'; parcial: string } | { f: 'sem-offline' } | { f: 'aviso'; texto: string };

export function BotaoDitado({ aoDitar }: { aoDitar: (d: Ditado) => void }) {
  const [fase, setFase] = useState<Fase>({ f: 'parado' });
  useEffect(() => () => { void pararDitado(); }, []);
  const comecar = async (rede: boolean) => {
    setFase({ f: 'a-ouvir', parcial: '' });
    const r = await ditar(rede, (parcial) => setFase({ f: 'a-ouvir', parcial }));
    if ('texto' in r) {
      const d = interpretarDitado(r.texto);
      if (!d.titulo && d.valor === null) { setFase({ f: 'aviso', texto: 'Não percebi. Tenta de novo, por exemplo: «12 euros no café».' }); return; }
      aoDitar(d); setFase({ f: 'parado' }); return;
    }
    if (r.erro === 'sem-offline') { setFase({ f: 'sem-offline' }); return; }
    if (r.erro === 'parado') { setFase({ f: 'parado' }); return; }
    setFase({ f: 'aviso', texto: r.erro === 'sem-autorizacao' ? 'Sem autorização para o microfone. Podes dá-la nas definições do Android › Apps › Finanças.'
      : r.erro === 'sem-fala' ? 'Não ouvi nada. Toca no microfone e diz, por exemplo: «12 euros no café».' : 'O ditado não está disponível neste telemóvel.' });
  };
  return (
    <>
      <button type="button" className="ffditado-bt" aria-label="Ditar o movimento" onClick={() => void comecar(redeAceite)}><Icone nome="mic" /></button>
      {fase.f !== 'parado' ? (
        <div className="ffditado" role="status" onClick={(ev) => ev.preventDefault()}>
          {fase.f === 'a-ouvir' ? (
            <>
              <div className="ffditado-anel" aria-hidden="true"><Icone nome="mic" /></div>
              <b><i className="ffditado-ponto" aria-hidden="true" />A ouvir…</b>
              <p>{fase.parcial ? `«${fase.parcial}»` : 'Diz, por exemplo: «12 euros no café»'}</p>
              <small>O microfone só está ligado agora. Desliga-se ao terminares a frase, ao tocar em «Parar» ou se saíres da app.</small>
              <button type="button" className="ffditado-parar" onClick={() => void pararDitado()}>Parar</button>
            </>
          ) : fase.f === 'sem-offline' ? (
            <>
              <b>Ditado sem internet indisponível</b>
              <p className="ffditado-txt">Este telemóvel não tem o reconhecimento de voz em português instalado. Para ditar sem enviar o áudio para fora, procura nas definições do Android «Reconhecimento de voz no dispositivo» (ou «offline») e descarrega Português.</p>
              <div className="ffditado-bts">
                <button type="button" onClick={() => setFase({ f: 'parado' })}>Cancelar</button>
                <button type="button" className="ok" onClick={() => { redeAceite = true; void comecar(true); }}>Usar o normal (pode ir à Google)</button>
              </div>
            </>
          ) : (
            <>
              <p className="ffditado-txt">{fase.texto}</p>
              <div className="ffditado-bts"><button type="button" className="ok" onClick={() => setFase({ f: 'parado' })}>OK</button></div>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
