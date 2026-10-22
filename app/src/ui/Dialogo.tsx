import * as Radix from '@radix-ui/react-dialog';
import { type ReactNode, type TouchEvent, useEffect, useRef, useState } from 'react';
import { Icone } from './Icone';

// Janela modal igual à da app atual (Radix Dialog com as classes do padrão shadcn/ui).
const FUNDO = 'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0';
const CONTEUDO = 'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg';
const FECHAR = 'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground';

interface Props {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  titulo: string;
  descricao: string;
  className?: string;
  /** Folha que sobe do fundo do ecrã (janelas de registo), com pega para arrastar para baixo e fechar. */
  folha?: boolean;
  children: ReactNode;
}

/** Altura do teclado do telemóvel (a folha fica por cima dele). */
function useTeclado(ativo: boolean) {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    const v = window.visualViewport;
    if (!ativo || !v) { setAltura(0); return; }
    const f = () => setAltura(Math.max(0, Math.round(window.innerHeight - v.height - v.offsetTop)));
    f();
    v.addEventListener('resize', f); v.addEventListener('scroll', f);
    return () => { v.removeEventListener('resize', f); v.removeEventListener('scroll', f); };
  }, [ativo]);
  return altura;
}

export function Dialogo({ aberto, aoMudar, titulo, descricao, className, folha, children }: Props) {
  const teclado = useTeclado(!!folha && aberto);
  const arrasto = useRef<{ y: number; dy: number } | null>(null);
  // arrastar a pega (ou o título) para baixo fecha a folha; um arrasto curto volta ao sítio
  const tocar = folha ? {
    onTouchStart: (e: TouchEvent<HTMLDivElement>) => { arrasto.current = { y: e.touches[0]!.clientY, dy: 0 }; },
    onTouchMove: (e: TouchEvent<HTMLDivElement>) => {
      const a = arrasto.current, el = e.currentTarget.closest<HTMLElement>('.fffolha');
      if (!a || !el) return;
      a.dy = Math.max(0, e.touches[0]!.clientY - a.y);
      el.style.transition = 'none';
      el.style.transform = `translateY(${a.dy}px)`;
    },
    onTouchEnd: (e: TouchEvent<HTMLDivElement>) => {
      const a = arrasto.current, el = e.currentTarget.closest<HTMLElement>('.fffolha');
      arrasto.current = null;
      if (!a || !a.dy || !el) return;
      if (a.dy > 90) { aoMudar(false); return; }
      el.style.transition = 'transform .25s cubic-bezier(.22, 1, .36, 1)';
      el.style.transform = '';
    },
  } : {};
  return (
    <Radix.Root open={aberto} onOpenChange={aoMudar}>
      <Radix.Portal>
        <Radix.Overlay className={FUNDO} />
        <Radix.Content
          className={[folha ? 'fffolha' : CONTEUDO, className].filter(Boolean).join(' ')}
          style={folha ? ({ '--kb': `${teclado}px` } as React.CSSProperties) : undefined}
        >
          {folha ? <div className="fffolha-pega" aria-hidden="true" {...tocar} onTouchCancel={tocar.onTouchEnd}><i /></div> : null}
          <div className="flex flex-col space-y-1.5 text-center sm:text-left" {...tocar}>
            <Radix.Title className="text-lg font-semibold leading-none tracking-tight">{titulo}</Radix.Title>
            <Radix.Description className="text-sm text-muted-foreground">{descricao}</Radix.Description>
          </div>
          {children}
          <Radix.Close className={FECHAR}>
            <Icone nome="x" className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Radix.Close>
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}
