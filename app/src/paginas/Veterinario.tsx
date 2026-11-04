import { reduzirImagem, TAMANHOS } from '../ui/imagem';
import { type Estado, MESES, type Movimento } from '../dados';
import { ArtigoMovimento, TextoMovimento } from '../movimentos/Movimento';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { formatarEuros } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { RoboVazio } from '../ui/RoboVazio';
import { Segmentado } from '../ui/Segmentado';
import { animais, classeDoAnimal, simboloDoAnimal } from '../veterinario/animais';
import { info, montar, ordenados } from '../veterinario/lembretes';

const TONS_VET = ['#22d3ee', '#fbbf24', '#f472b6', '#a78bfa', '#4ade80', '#fb923c'];
import { doMes } from './calculos';

export type PeriodoVet = 'mes' | 'ano';

export interface VistaVeterinario {
  /** Animal aberto (despesas de um só animal) ou `null` (todos). */
  animal: string | null;
  periodo: PeriodoVet;
  /** Filtro da lista do mês ('' = todos). */
  filtro: string;
  /** Animal cuja fotografia está a ser escolhida. */
  fotografia: string | null;
}

export const VISTA_VETERINARIO: VistaVeterinario = { animal: null, periodo: 'mes', filtro: '', fotografia: null };

const montados = new WeakSet<HTMLElement>();

/** Fotografia do animal ou o ícone da pata. */
function Retrato({ nome, foto }: { nome: string; foto?: string }) {
  return (
    <span className={foto ? 'pet-portrait pet-portrait-photo' : 'pet-portrait'}>
      {foto ? <img src={foto} alt={`Fotografia de ${nome}`} /> : <Icone nome="paw-print" aria-hidden="true" />}
    </span>
  );
}

interface Props {
  estado: Estado;
  mes: Date;
  ocultos: boolean;
  vista: VistaVeterinario;
  mudarVista: (v: Partial<VistaVeterinario>) => void;
  abrirMovimento: (m: Movimento) => void;
}

export function Veterinario({ estado, mes, ocultos, vista, mudarVista, abrirMovimento }: Props) {
  const eur = (v: number) => formatarEuros(v, ocultos);
  const fotos = estado.petPhotos;
  const soma = (l: Movimento[]) => l.reduce((s, m) => s + Math.abs(m.amount), 0);
  const doAno = (m: Movimento) => m.date.startsWith(`${mes.getFullYear()}-`);
  const rotuloFoto = (a: string) => `${fotos[a] ? 'Alterar' : 'Adicionar'} fotografia de ${a}`;

  const sexo = (a: string) => classeDoAnimal(a) === 'f' ? '♀' : classeDoAnimal(a) === 'm' ? '♂' : '';
  const proximo = (a: string) => ordenados().find((r) => r.pet === a);
  const contagem = (d: number) => (d < 0 ? { n: String(-d), t: -d === 1 ? 'dia de atraso' : 'dias de atraso', cls: 'late' } : d === 0 ? { n: 'Hoje', t: '', cls: 'late' } : { n: String(d), t: d === 1 ? 'dia' : 'dias', cls: d <= 7 ? 'soon' : 'ok' });

  const umAnimal = (animal: string) => {
    const lista = (vista.periodo === 'ano' ? estado.transactions.filter(doAno) : doMes(estado.transactions, mes))
      .filter((m) => m.pet === animal).sort((a, b) => b.date.localeCompare(a.date));
    const total = soma(lista);
    const porCategoria = Object.entries(lista.reduce<Record<string, number>>((acc, m) => {
      const c = (m.vetCategory as string) || 'Outros';
      acc[c] = (acc[c] || 0) + Math.abs(m.amount);
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]);
    const r = proximo(animal), c = r ? contagem(info(r).days) : null;
    const doAnoTodo = estado.transactions.filter((m) => m.pet === animal && doAno(m));
    return (
      <>
        <Botao variante="ghost" className="vet-back" onClick={() => mudarVista({ animal: null })}><Icone nome="chevron-left" /> Todos os animais</Botao>
        <section className={`ffvet-hero ffvet-hero-${classeDoAnimal(animal)}`}>
          {fotos[animal] ? <img src={fotos[animal]} alt={`Fotografia de ${animal}`} /> : <span className="ffvet-hero-pata"><Icone nome="paw-print" aria-hidden="true" /></span>}
          <div className="ffvet-hero-nome"><h2>{animal}</h2><small>{`${sexo(animal)}${sexo(animal) ? ' · ' : ''}${doAnoTodo.length} ${doAnoTodo.length === 1 ? 'cuidado registado' : 'cuidados registados'} em ${mes.getFullYear()}`}</small></div>
          {animais().includes(animal) ? (
            <Botao variante="ghost" tamanho="icone" className="ffvet-hero-foto" onClick={() => mudarVista({ fotografia: animal })} aria-label={rotuloFoto(animal)}><Icone nome="image-plus" /></Botao>
          ) : null}
        </section>
        <Segmentado
          valor={vista.periodo} rotulo="Período veterinário" aoMudar={(periodo) => mudarVista({ periodo })}
          opcoes={[{ valor: 'mes', rotulo: 'Mês' }, { valor: 'ano', rotulo: 'Ano' }]}
        />
        <section className="ffcal-resumos ffvet-blocos">
          <article className="ffbloco vet-total">
            <p className="ffbloco-rot">{vista.periodo === 'mes' ? `Em ${MESES[mes.getMonth()]}` : `Em ${mes.getFullYear()}`}</p>
            <strong className="ffbloco-val amount-negative">{eur(total)}</strong>
            <small>{`${lista.length} ${lista.length === 1 ? 'despesa' : 'despesas'}`}</small>
          </article>
          <article className={`ffbloco ffvet-proximo${c ? ` ffvet-${c.cls}` : ''}`}>
            <p className="ffbloco-rot">Próximo cuidado</p>
            <strong className="ffbloco-val">{c ? `${c.n}${c.t ? ` ${c.t.split(' ')[0]}` : ''}` : '—'}</strong>
            <small>{r ? `${info(r).label.toLowerCase()} · ${info(r).short}` : 'sem lembretes'}</small>
          </article>
        </section>
        {porCategoria.length ? (
          <section className="ffcartao ffvet-tipos" aria-label="Por tipo de cuidado">
            <p className="ffbloco-rot">Por tipo de cuidado</p>
            {porCategoria.map(([cat, v], k) => (
              <div key={cat} className="ffvet-tipo">
                <p><span><i style={{ background: TONS_VET[k % TONS_VET.length] }} />{cat}</span><strong>{eur(v)}</strong></p>
                <i className="ffcat-barra"><b style={{ transform: `scaleX(${v / porCategoria[0]![1]})`, background: TONS_VET[k % TONS_VET.length] }} /></i>
              </div>
            ))}
          </section>
        ) : null}
        <section className="transactions-panel">
          <div className="section-heading"><h2>Despesas</h2><span className="fffuel-conta">{lista.length}</span></div>
          <div className="transaction-list">
            {lista.length ? lista.map((m) => (
              <ArtigoMovimento key={m.id} movimento={m} aoAbrir={abrirMovimento}>
                <div className="transaction-main">
                  <span className="ffcat-ic" style={{ '--c': '#22d3ee' } as React.CSSProperties}><Icone nome="heart-pulse" aria-hidden="true" /></span>
                  <TextoMovimento movimento={m} contas={estado.accounts} />
                </div>
                <strong className="amount-negative">−{eur(Math.abs(m.amount))}</strong>
              </ArtigoMovimento>
            )) : <div className="vet-empty">Sem despesas neste período.</div>}
          </div>
        </section>
      </>
    );
  };

  const todos = () => {
    const lista = doMes(estado.transactions, mes).filter((m) => m.pet && (!vista.filtro || m.pet === vista.filtro)).sort((a, b) => b.date.localeCompare(a.date));
    return (
      <>
        <section className="pet-grid">
          {animais().map((a) => (
            <article key={a} className={`pet-card ffvet-cartao ffvet-cartao-${classeDoAnimal(a)}`}>
              <div className="pet-photo-area">
                <Retrato nome={a} foto={fotos[a]} />
                <Botao variante="secundario" tamanho="icone" className="pet-photo-edit" onClick={() => mudarVista({ fotografia: a })} aria-label={rotuloFoto(a)}>
                  <Icone nome="image-plus" />
                </Botao>
              </div>
              {sexo(a) ? <span className="ffvet-sexo" aria-hidden="true">{sexo(a)}</span> : null}
              <Botao variante="ghost" className="pet-card-open" onClick={() => mudarVista({ animal: a })}>
                <span className="pet-card-copy">
                  <strong>{a}</strong>
                  <b className="amount-negative">{eur(soma(doMes(estado.transactions, mes).filter((m) => m.pet === a)))}</b>
                  <small>{`este mês · ${eur(soma(estado.transactions.filter((m) => m.pet === a && doAno(m))))} em ${mes.getFullYear()}`}</small>
                </span>
              </Botao>
            </article>
          ))}
        </section>
        <div key="ffvet" className="ffvet-host" ref={(el) => { if (el && !montados.has(el)) { montados.add(el); montar(el); } }} />
        <section className="transactions-panel vet-month-list">
          <div className="section-heading">
            <h2>{MESES[mes.getMonth()]}</h2>
            <strong className="amount-negative">{eur(soma(lista))}</strong>
          </div>
          <div className="ffescolhas ffvet-filtro" role="radiogroup" aria-label="Filtrar por animal">
            {[{ valor: '', rotulo: 'Todos' }, ...animais().map((a) => ({ valor: a, rotulo: a }))].map((o) => (
              <button key={o.valor} type="button" role="radio" aria-checked={vista.filtro === o.valor} className={`ffescolha${vista.filtro === o.valor ? ' on' : ''}`} onClick={() => mudarVista({ filtro: o.valor })}>
                {o.valor ? <Icone nome="paw-print" /> : null}<span>{o.rotulo}</span>
              </button>
            ))}
          </div>
          <div className="transaction-list">
            {lista.length ? lista.map((m) => (
              <ArtigoMovimento key={m.id} movimento={m} aoAbrir={abrirMovimento}>
                <div className="transaction-main">
                  <span className={`vet-avatar vet-avatar-${classeDoAnimal(m.pet!)}`}>
                    {fotos[m.pet!] ? <img src={fotos[m.pet!]} alt="" /> : simboloDoAnimal(m.pet!)}
                  </span>
                  <div className="min-w-0">
                    <h3>{m.title}</h3>
                    <p>
                      <span className={`tx-acc ffvet-tag ffvet-tag-${classeDoAnimal(m.pet!)}`}>{m.pet}</span>
                      <span className="tx-acc">{(m.vetCategory as string) || 'Outros'}</span>
                      {` ${Number(m.date.slice(8, 10))} ${MESES[Number(m.date.slice(5, 7)) - 1]?.slice(0, 3)}`}
                    </p>
                  </div>
                </div>
                <strong className="amount-negative">−{eur(Math.abs(m.amount))}</strong>
              </ArtigoMovimento>
            )) : <div className="vet-empty ffvazio-linha"><RoboVazio pequeno />{`Sem despesas veterinárias em ${MESES[mes.getMonth()]}.`}</div>}
          </div>
        </section>
      </>
    );
  };

  return <main className="detail-view vet-view">{vista.animal ? umAnimal(vista.animal) : todos()}</main>;
}

/** Janela para escolher, trocar ou remover a fotografia de um animal (guardada em `petPhotos`). */
export function JanelaFotografia({ animal, fotos, fechar, mudarFotos }: {
  animal: string | null; fotos: Record<string, string>; fechar: () => void; mudarFotos: (f: (fotos: Record<string, string>) => Record<string, string>) => void;
}) {
  const escolher = (ficheiro?: File) => {
    if (!animal || !ficheiro) return;
    // Reduzida antes de guardar: uma fotografia do telemóvel tem vários MB e o armazenamento da app só ~5 MB
    void reduzirImagem(ficheiro, TAMANHOS.animal).then((r) => mudarFotos((f) => ({ ...f, [animal]: r })));
  };
  return (
    <Dialogo
      aberto={animal !== null} aoMudar={(a) => { if (!a) fechar(); }} className="pet-photo-dialog"
      titulo={`Fotografia de ${animal ?? ''}`} descricao="Escolha uma fotografia do seu dispositivo."
    >
      {animal ? (
        <div className="pet-photo-editor">
          <Retrato nome={animal} foto={fotos[animal]} />
          <label className="pet-photo-picker">
            <Icone nome="image-plus" />
            <span>{fotos[animal] ? 'Substituir fotografia' : 'Escolher fotografia'}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => escolher(e.target.files?.[0])} />
          </label>
          {fotos[animal] ? (
            <Botao variante="ghost" className="remove-photo" onClick={() => mudarFotos((f) => { const n = { ...f }; delete n[animal]; return n; })}>
              <Icone nome="trash-2" />Remover fotografia
            </Botao>
          ) : null}
        </div>
      ) : null}
    </Dialogo>
  );
}
