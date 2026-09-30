/**
 * Animais da família. A app atual tem estes nomes fixos no código (página Veterinário, lembretes, janelas);
 * ficam aqui, num só sítio, até passarem para a configuração guardada no telemóvel (etapa 10, plano secção 7).
 */
export const ANIMAIS = ['Sam', 'Lola'] as const;

/** Avatar de um animal sem fotografia (mesmos símbolos da app atual). */
export function simboloDoAnimal(nome: string): string {
  return nome === ANIMAIS[0] ? '♂️' : nome === ANIMAIS[1] ? '♀️' : String(nome).slice(0, 1);
}

export const classeDoAnimal = (nome: string) => (nome === ANIMAIS[0] ? 'sam' : nome === ANIMAIS[1] ? 'lola' : 'other');
