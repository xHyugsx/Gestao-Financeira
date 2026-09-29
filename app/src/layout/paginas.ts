import type { NomeIcone } from '../ui/icones';

/** Páginas pela ordem do deslizar (a mesma da app atual). */
export const PAGINAS: readonly { id: string; label: string; icone: NomeIcone }[] = [
  { id: 'principal', label: 'Principal', icone: 'house' },
  { id: 'analise', label: 'Análise', icone: 'chart-column' },
  { id: 'calendario', label: 'Calendário', icone: 'calendar-days' },
  { id: 'categorias', label: 'Categorias', icone: 'tags' },
  { id: 'resumo', label: 'Resumo', icone: 'grid-2x2' },
  { id: 'combustivel', label: 'Combustível', icone: 'fuel' },
  { id: 'veterinario', label: 'Veterinário', icone: 'paw-print' },
];

/** Páginas que abrem pelo painel «Mais». */
export const PAGINAS_MAIS = ['categorias', 'resumo', 'combustivel', 'veterinario'];
