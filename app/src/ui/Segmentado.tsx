import { Botao } from './Botao';
import { vibrarCurto } from './vibracao';

interface Props<T extends string> {
  valor: T;
  rotulo: string;
  opcoes: readonly { valor: T; rotulo: string }[];
  aoMudar: (v: T) => void;
  classe?: string;
}

/** Botões de escolha única (ex.: Despesa · Receita · Transferência). */
export function Segmentado<T extends string>({ valor, rotulo, opcoes, aoMudar, classe }: Props<T>) {
  // a pílula da opção escolhida desliza entre as opções (em duas linhas, três por linha)
  const i = opcoes.findIndex((o) => o.valor === valor), colunas = classe?.includes('ffseg-2l') ? 3 : opcoes.length;
  const pilula = { '--cols': colunas, '--rows': Math.ceil(opcoes.length / colunas), '--col': i % colunas, '--row': Math.floor(i / colunas) } as React.CSSProperties;
  return (
    <div className={`segmented ffseg${classe ? ` ${classe}` : ''}`} aria-label={rotulo}>
      {i >= 0 ? <span className="ffseg-pilula" style={pilula} aria-hidden="true" /> : null}
      {opcoes.map((o) => (
        <Botao key={o.valor} type="button" variante="ghost" className={valor === o.valor ? 'segment-active' : ''} onClick={() => { if (o.valor !== valor) vibrarCurto(); aoMudar(o.valor); }}>
          {o.rotulo}
        </Botao>
      ))}
    </div>
  );
}
