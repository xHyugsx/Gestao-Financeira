import type { ButtonHTMLAttributes } from 'react';

// Mesmas classes do botão da app atual (padrão shadcn/ui), já sem conflitos entre si.
const BASE = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0';
const VARIANTES = {
  normal: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
} as const;
const TAMANHOS = { normal: 'h-9 px-4 py-2', icone: 'h-9 w-9', pequeno: 'h-8 rounded-md px-3 text-xs' } as const;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: keyof typeof VARIANTES;
  tamanho?: keyof typeof TAMANHOS;
}

export function Botao({ variante = 'normal', tamanho = 'normal', className, ...resto }: Props) {
  const base = tamanho === 'pequeno' ? BASE.replace(' rounded-md text-sm', '') : BASE;
  return <button className={[base, VARIANTES[variante], TAMANHOS[tamanho], className].filter(Boolean).join(' ')} {...resto} />;
}
