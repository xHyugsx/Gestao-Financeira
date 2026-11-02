import type { Estado } from '../dados';
import { gruposDe, opcoesAgrupadas } from './grupos';

/** Opções da lista de categorias, arrumadas por grupo (v2.44.0). */
export function OpcoesCategoria({ estado, lista }: { estado: Pick<Estado, 'extras'>; lista: string[] }) {
  return (
    <>
      {opcoesAgrupadas(lista, gruposDe(estado, lista)).map((g) => (g.grupo === null
        ? g.itens.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)
        : <optgroup key={g.grupo} label={g.grupo}>{g.itens.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}</optgroup>))}
    </>
  );
}
