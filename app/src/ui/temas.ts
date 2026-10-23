// Temas da app (Definições › Aparência › Tema). Guardado em `appearance.theme`; sem valor = Cósmico (o tema original).
// O tema é aplicado em <html data-tema> para chegar também às janelas; o ecrã de bloqueio fica sempre igual
// (enquanto a app está bloqueada o atributo é retirado — decisão do dono).

export const TEMAS = [
  { id: 'cosmico', nome: 'Cósmico', descricao: 'Espaço, ciano, roxo e rosa' },
  { id: 'aurora', nome: 'Aurora', descricao: 'Noite polar, verdes e azuis' },
  { id: 'por-do-sol', nome: 'Pôr do sol', descricao: 'Tons quentes e letra arredondada' },
  { id: 'dourado', nome: 'Noite dourada', descricao: 'Preto e dourado, números em serifa' },
  { id: 'oceano', nome: 'Oceano', descricao: 'Mar profundo, azuis e água-marinha' },
  { id: 'floresta', nome: 'Floresta', descricao: 'Verdes de pinhal e musgo, títulos em serifa' },
] as const;

export type Tema = (typeof TEMAS)[number]['id'];

export function temaDe(appearance: { theme?: unknown }): Tema {
  return TEMAS.some((t) => t.id === appearance.theme) ? (appearance.theme as Tema) : 'cosmico';
}

/** Aplica o tema à página (o Cósmico é a ausência de tema); `null` retira-o (ecrã de bloqueio). */
export function aplicarTema(tema: Tema | null): void {
  const raiz = document.documentElement;
  if (!tema || tema === 'cosmico') delete raiz.dataset.tema;
  else raiz.dataset.tema = tema;
}
