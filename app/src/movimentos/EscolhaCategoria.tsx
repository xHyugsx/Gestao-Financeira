import { useMemo, useState } from 'react';
import type { Estado } from '../dados';
import { CORES } from '../paginas/calculos';
import { Icone } from '../ui/Icone';
import { vibrarCurto } from '../ui/vibracao';
import { type aspetosCategorias, categoriaDespesa, categoriaReceita, simplificar } from './categorias';
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

/**
 * Categoria num cartão («Grupo › Categoria»); tocar abre um painel com pesquisa, as mais usadas e as categorias
 * arrumadas por grupo (v2.45.0). O valor vai no formulário no campo escondido `category`.
 */
export function CampoCategoria({ estado, lista, valor, aoMudar, receita, mapaAspetos, legenda }: {
  estado: Estado; lista: string[]; valor: string; aoMudar: (c: string) => void; receita: boolean;
  mapaAspetos: ReturnType<typeof aspetosCategorias>; legenda?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const mapa = gruposDe(estado, lista);
  const aspeto = (c: string) => (receita ? mapaAspetos.receitas : mapaAspetos.despesas).get(c);
  const cor = (c: string) => CORES[aspeto(mapa[c] ?? c)?.tone ?? 'violet'] ?? 'var(--primary)';
  const maisUsadas = useMemo(() => {
    const limite = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10), contagem = new Map<string, number>();
    for (const m of estado.transactions) {
      if (m.date < limite || m.movementType !== (receita ? 'income' : 'expense')) continue;
      const c = receita ? categoriaReceita(m) : categoriaDespesa(m);
      if (lista.includes(c)) contagem.set(c, (contagem.get(c) ?? 0) + 1);
    }
    return [...contagem].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
  }, [estado.transactions, lista, receita]);
  const escolher = (c: string) => { if (c !== valor) vibrarCurto(); aoMudar(c); setAberto(false); setBusca(''); };
  const chip = (c: string, rotulo = c) => (
    <button key={c} type="button" data-valor={c} className={`ffescolha${c === valor ? ' on' : ''}`} onClick={() => escolher(c)}><span>{rotulo}</span></button>
  );
  const procura = simplificar(busca.trim());
  const grupos = opcoesAgrupadas(lista, mapa);
  return (
    <>
      <input type="hidden" name="category" value={valor} />
      <button type="button" className="ffcat-escolha-abrir" aria-label={`Categoria: ${valor}. Mudar`} onClick={(e) => { setAberto(true); const f = e.currentTarget.closest('.fffolha'); if (f) f.scrollTop = 0; }}>
        <span className="ffcat-ic" style={{ '--c': cor(valor) } as React.CSSProperties}><Icone nome={aspeto(valor)?.icone ?? 'tags'} /></span>
        <span className="ffcat-escolha-txt">{mapa[valor] ? <small>{`${mapa[valor]} ›`}</small> : null}<b>{valor}</b></span>
        {legenda ? <em>{legenda}</em> : null}
        <Icone nome="chevron-right" />
      </button>
      {aberto ? (
        <div className="ffcat-painel" role="group" aria-label="Escolher categoria" data-campo="category">
          <div className="ffcat-painel-topo">
            <b>Escolher categoria</b>
            <button type="button" className="ffcat-painel-fechar" aria-label="Fechar a escolha da categoria" onClick={() => setAberto(false)}><Icone nome="x" /></button>
          </div>
          <label className="ffcat-busca"><Icone nome="search" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar categoria" aria-label="Procurar categoria" /></label>
          {procura ? (
            <div className="ffescolhas">{lista.filter((c) => simplificar(c).includes(procura) || simplificar(mapa[c] ?? '').includes(procura)).map((c) => chip(c, mapa[c] ? `${mapa[c]} › ${c}` : c))}</div>
          ) : (
            <>
              {maisUsadas.length ? <><p className="ffrotulo">Mais usadas</p><div className="ffescolhas">{maisUsadas.map((c) => chip(c))}</div></> : null}
              {grupos.map((g) => (
                <div key={g.grupo ?? '-'} className="ffcat-painel-grupo">
                  <p className="ffrotulo">
                    {g.grupo ? <span className="ffcat-ic" style={{ '--c': cor(g.grupo) } as React.CSSProperties}><Icone nome={aspeto(g.grupo)?.icone ?? 'tags'} /></span> : null}
                    {g.grupo ?? (grupos.length > 1 ? 'Sem grupo' : 'Categorias')}
                  </p>
                  <div className="ffescolhas">{g.itens.map((o, k) => chip(o.valor, g.grupo && k === 0 ? `${o.valor} (geral)` : o.valor))}</div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
