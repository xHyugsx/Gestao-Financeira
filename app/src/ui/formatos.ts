const MOEDA = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

/** "1234,56 €" — ou "••••••" com os valores ocultos. */
export function formatarEuros(valor: number, ocultos = false): string {
  return ocultos ? '••••••' : MOEDA.format(valor);
}

/** "12,3%" (valor absoluto, 1 casa decimal no máximo). */
export function formatarPercentagem(valor: number): string {
  return `${Math.abs(valor).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%`;
}

export { MOEDA };
