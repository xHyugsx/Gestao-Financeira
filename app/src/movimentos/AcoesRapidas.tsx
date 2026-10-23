import { useRef } from 'react';
import type { Movimento } from '../dados';
import { Dialogo } from '../ui/Dialogo';
import { formatarEuros } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { diaEMes } from './regras';

interface Props {
  movimento: Movimento | null;
  ocultos: boolean;
  fechar: () => void;
  editar: (m: Movimento) => void;
  duplicar: (m: Movimento) => void;
  apagar: (m: Movimento) => void;
}

/** Ações rápidas de um movimento (toque longo na linha): editar, duplicar para hoje ou apagar (com «Desfazer»). */
export function AcoesRapidas({ movimento, ocultos, fechar, editar, duplicar, apagar }: Props) {
  // enquanto a folha fecha, continua a mostrar o último movimento
  const ultimo = useRef<Movimento | null>(null);
  if (movimento) ultimo.current = movimento;
  const m = movimento ?? ultimo.current;
  const valor = m ? (m.movementType === 'transfer' && !m.amount ? formatarEuros(m.transferValue || 0, ocultos) : formatarEuros(Math.abs(m.amount), ocultos)) : '';
  return (
    <Dialogo
      folha aberto={movimento !== null} aoMudar={(a) => { if (!a) fechar(); }} className="movement-dialog ffacoes"
      titulo={m?.title.trim() || 'Movimento'} descricao={m ? `${m.date ? diaEMes(m.date) : ''} · ${valor}` : ''}
    >
      {m ? (
        <div className="ffacoes-lista">
          <button type="button" onClick={() => editar(m)}><Icone nome="pencil" /><span>Editar</span></button>
          <button type="button" onClick={() => duplicar(m)}><Icone nome="copy" /><span>Duplicar para hoje</span></button>
          <button type="button" className="ffacoes-apagar" onClick={() => apagar(m)}><Icone nome="trash-2" /><span>Apagar</span></button>
        </div>
      ) : null}
    </Dialogo>
  );
}
