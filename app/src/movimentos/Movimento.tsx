import type { Conta, Movimento } from '../dados';
import { formatarEuros } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { aspetoDoMovimento, type aspetosCategorias, iconePorTipo } from './categorias';

interface Props {
  movimento: Movimento;
  contas: Conta[];
  aspetos: ReturnType<typeof aspetosCategorias>;
  ocultos: boolean;
  aoAbrir: (m: Movimento) => void;
}

function valor(m: Movimento, ocultos: boolean): string {
  if (m.recurring === 'sem' && !m.amount && !m.transferValue) return 'A definir';
  if (m.revolut) return `→ ${formatarEuros(m.transferValue || 0, ocultos)}`;
  if (m.movementType === 'transfer') return 'Movido';
  return `${m.amount > 0 ? '+' : '−'}${formatarEuros(Math.abs(m.amount), ocultos)}`;
}

/** Linha de um movimento, igual à da app atual. */
export function LinhaMovimento({ movimento: m, contas, aspetos, ocultos, aoAbrir }: Props) {
  const aspeto = aspetoDoMovimento(m, aspetos);
  const abrir = () => aoAbrir(m);
  return (
    <article
      role="button" tabIndex={0} aria-label={`Editar ${m.title}`} className="transaction-row transaction-row-clickable"
      onClick={abrir} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } }}
    >
      <div className="transaction-main">
        {aspeto
          ? <span className={`transaction-icon tone-text-${aspeto.tone || 'violet'}`}><Icone nome={aspeto.icone} /></span>
          : <span className={`transaction-icon transaction-icon-${String(m.kind)}`}><Icone nome={iconePorTipo(m.kind)} /></span>}
        <div className="min-w-0">
          <h3>{m.title}</h3>
          <p>
            {m.detail}
            {m.account && m.account !== 'principal'
              ? <span className="tx-acc">{contas.find((c) => c.id === m.account)?.name || 'Conta'}</span>
              : null}
          </p>
          {m.note ? <p className="ffnote" title={m.note}>{m.note}</p> : null}
        </div>
      </div>
      <strong className={m.movementType === 'transfer' ? 'amount-transfer' : m.amount > 0 ? 'amount-positive' : 'amount-negative'}>
        {valor(m, ocultos)}
      </strong>
    </article>
  );
}
