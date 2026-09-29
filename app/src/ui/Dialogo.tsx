import * as Radix from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
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
  children: ReactNode;
}

export function Dialogo({ aberto, aoMudar, titulo, descricao, className, children }: Props) {
  return (
    <Radix.Root open={aberto} onOpenChange={aoMudar}>
      <Radix.Portal>
        <Radix.Overlay className={FUNDO} />
        <Radix.Content className={[CONTEUDO, className].filter(Boolean).join(' ')}>
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
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
