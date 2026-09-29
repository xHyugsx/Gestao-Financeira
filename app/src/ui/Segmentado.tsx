import { Botao } from './Botao';

interface Props<T extends string> {
  valor: T;
  rotulo: string;
  opcoes: readonly { valor: T; rotulo: string }[];
  aoMudar: (v: T) => void;
}

/** Botões de escolha única (ex.: Despesa · Receita · Transferência). */
export function Segmentado<T extends string>({ valor, rotulo, opcoes, aoMudar }: Props<T>) {
  return (
    <div className="segmented" aria-label={rotulo}>
      {opcoes.map((o) => (
        <Botao key={o.valor} type="button" variante="ghost" className={valor === o.valor ? 'segment-active' : ''} onClick={() => aoMudar(o.valor)}>
          {o.rotulo}
        </Botao>
      ))}
    </div>
  );
}
