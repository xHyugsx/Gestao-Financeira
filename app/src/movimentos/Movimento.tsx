import { createContext, type ReactNode, useContext, useRef } from 'react';
import { agendado, type Conta, type Movimento } from '../dados';
import { formatarEuros } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { aspetoDoMovimento, type aspetosCategorias, iconePorTipo } from './categorias';
import { porConfirmar } from './recorrentes';

function valor(m: Movimento, ocultos: boolean): string {
  if (porConfirmar(m)) return 'A definir';
  if (m.revolut) return `→ ${formatarEuros(m.transferValue || 0, ocultos)}`;
  if (m.movementType === 'transfer') return 'Movido';
  return `${m.amount > 0 ? '+' : '−'}${formatarEuros(Math.abs(m.amount), ocultos)}`;
}

/** Ações rápidas (toque longo numa linha): fornecidas pela App; sem elas, a linha só abre a edição. */
export const AcoesMovimento = createContext<((m: Movimento) => void) | null>(null);

/** Linha clicável de um movimento (abre a janela de edição). */
export function ArtigoMovimento({ movimento: m, aoAbrir, children }: { movimento: Movimento; aoAbrir: (m: Movimento) => void; children: ReactNode }) {
  const menu = useContext(AcoesMovimento);
  // toque longo (ou clique com o botão direito) abre as ações rápidas; o toque que se segue não abre a edição
  const premir = useRef<{ x: number; y: number; t: ReturnType<typeof setTimeout> } | null>(null);
  const abriuMenu = useRef(false);
  const largar = () => { if (premir.current) clearTimeout(premir.current.t); premir.current = null; };
  const abrir = () => { if (abriuMenu.current) { abriuMenu.current = false; return; } aoAbrir(m); };
  const toque = menu ? {
    onTouchStart: (e: React.TouchEvent) => {
      abriuMenu.current = false;
      const p = e.touches[0];
      if (!p) return;
      largar();
      premir.current = { x: p.clientX, y: p.clientY, t: setTimeout(() => { abriuMenu.current = true; premir.current = null; menu(m); }, 480) };
    },
    onTouchMove: (e: React.TouchEvent) => {
      const s = premir.current, p = e.touches[0];
      if (s && p && Math.hypot(p.clientX - s.x, p.clientY - s.y) > 10) largar();
    },
    onTouchEnd: largar,
    onTouchCancel: largar,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (abriuMenu.current) return;
      if (premir.current) abriuMenu.current = true;
      largar();
      menu(m);
    },
  } : {};
  return (
    <article
      role="button" tabIndex={0} aria-label={`Editar ${m.title}`} className="transaction-row transaction-row-clickable" data-id={String(m.id)}
      onClick={abrir} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoAbrir(m); } }} {...toque}
    >
      {children}
    </article>
  );
}

/** Título, descrição (com a conta, se não for a Principal, a pessoa, «Agendado» e «Valor por confirmar») e nota. */
export function TextoMovimento({ movimento: m, contas }: { movimento: Movimento; contas: Conta[] }) {
  return (
    <div className="min-w-0">
      <h3>{m.title}</h3>
      <p>
        {m.detail}
        {m.account && m.account !== 'principal'
          ? <span className="tx-acc">{contas.find((c) => c.id === m.account)?.name || 'Conta'}</span>
          : null}
        {m.person ? <span className="tx-acc ffpessoa">{m.person}</span> : null}
        {agendado(m, new Date()) ? <span className="tx-acc ffagendado">Agendado</span> : null}
        {porConfirmar(m) ? <span className="tx-acc ffconfirmar">Valor por confirmar</span> : null}
      </p>
      {m.note ? <p className="ffnote" title={m.note}>{m.note}</p> : null}
    </div>
  );
}

interface Props {
  movimento: Movimento;
  contas: Conta[];
  aspetos: ReturnType<typeof aspetosCategorias>;
  ocultos: boolean;
  aoAbrir: (m: Movimento) => void;
}

/** Linha de um movimento, igual à da app atual. */
export function LinhaMovimento({ movimento: m, contas, aspetos, ocultos, aoAbrir }: Props) {
  const aspeto = aspetoDoMovimento(m, aspetos);
  return (
    <ArtigoMovimento movimento={m} aoAbrir={aoAbrir}>
      <div className="transaction-main">
        {aspeto
          ? <span className={`transaction-icon tone-text-${aspeto.tone || 'violet'}`}><Icone nome={aspeto.icone} /></span>
          : <span className={`transaction-icon transaction-icon-${String(m.kind)}`}><Icone nome={iconePorTipo(m.kind)} /></span>}
        <TextoMovimento movimento={m} contas={contas} />
      </div>
      <strong className={porConfirmar(m) ? 'amount-transfer' : m.movementType === 'transfer' ? 'amount-transfer' : m.amount > 0 ? 'amount-positive' : 'amount-negative'}>
        {valor(m, ocultos)}
      </strong>
    </ArtigoMovimento>
  );
}
