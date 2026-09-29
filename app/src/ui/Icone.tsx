import { createElement, type SVGProps } from 'react';
import { ICONES, type NomeIcone } from './icones';

interface Props extends SVGProps<SVGSVGElement> {
  nome: NomeIcone;
}

// Classe extra que a lucide gera a partir do nome em PascalCase (ex.: "grid-2x2" → "lucide-grid2x2").
function classeLucide(nome: string): string {
  const camel = nome.replace(/^([A-Z])|[\s-_]+(\w)/g, (_, a: string, b: string) => (b ? b.toUpperCase() : a.toLowerCase()));
  const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
  return `lucide-${pascal.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
}

/** Ícone lucide com os mesmos atributos e classes que a app atual. */
export function Icone({ nome, className, ...resto }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={[...new Set(['lucide', classeLucide(nome), `lucide-${nome}`, className].filter(Boolean))].join(' ')}
      aria-hidden="true" {...resto}
    >
      {ICONES[nome].map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
