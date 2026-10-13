import { type Estado, MESES, type Movimento } from '../dados';
import { ArtigoMovimento, TextoMovimento } from '../movimentos/Movimento';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { formatarEuros } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { Segmentado } from '../ui/Segmentado';
import { animais, classeDoAnimal, simboloDoAnimal } from '../veterinario/animais';
import { montar } from '../veterinario/lembretes';
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

  const umAnimal = (animal: string) => {
    const lista = (vista.periodo === 'ano' ? estado.transactions.filter(doAno) : doMes(estado.transactions, mes))
      .filter((m) => m.pet === animal).sort((a, b) => b.date.localeCompare(a.date));
    const total = soma(lista);
    const porCategoria = lista.reduce<Record<string, number>>((acc, m) => {
      const c = (m.vetCategory as string) || 'Outros';
      acc[c] = (acc[c] || 0) + Math.abs(m.amount);
      return acc;
    }, {});
    return (
      <>
        <Botao variante="ghost" className="vet-back" onClick={() => mudarVista({ animal: null })}><Icone nome="chevron-left" /> Todos os animais</Botao>
        <div className="view-heading"><p className="eyebrow">Veterinário</p><h2>{animal}</h2></div>
        <Segmentado
          valor={vista.periodo} rotulo="Período veterinário" aoMudar={(periodo) => mudarVista({ periodo })}
          opcoes={[{ valor: 'mes', rotulo: 'Mês' }, { valor: 'ano', rotulo: 'Ano' }]}
        />
        <section className="vet-total">
          {animais().includes(animal) ? (
            <Botao variante="ghost" className="vet-detail-photo" onClick={() => mudarVista({ fotografia: animal })} aria-label={rotuloFoto(animal)}>
              <Retrato nome={animal} foto={fotos[animal]} />
              <span className="photo-edit-badge"><Icone nome="image-plus" /></span>
            </Botao>
          ) : <span className="pet-portrait"><Icone nome="paw-print" /></span>}
          <div>
            <small>Total do {vista.periodo === 'mes' ? 'mês' : 'ano'}</small>
            <strong className="amount-negative">{eur(total)}</strong>
            <p>{lista.length} {lista.length === 1 ? 'despesa' : 'despesas'}</p>
          </div>
        </section>
        {Object.keys(porCategoria).length > 0 ? (
          <section className="vet-breakdown">
            <h3>Por categoria</h3>
            {Object.entries(porCategoria).map(([c, v]) => (
              <div key={c}><span>{c}</span><strong>{eur(v)}</strong><progress max={total} value={v} aria-label={`${c}: ${eur(v)}`} /></div>
            ))}
          </section>
        ) : null}
        <section className="transactions-panel">
          <div className="section-heading"><h2>Despesas</h2></div>
          <div className="transaction-list">
            {lista.length ? lista.map((m) => (
              <ArtigoMovimento key={m.id} movimento={m} aoAbrir={abrirMovimento}>
                <div className="transaction-main">
                  <span className="transaction-icon transaction-icon-health"><Icone nome="heart-pulse" aria-hidden="true" /></span>
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
            <article key={a} className="pet-card">
              <div className="pet-photo-area">
                <Retrato nome={a} foto={fotos[a]} />
                <Botao variante="secundario" tamanho="icone" className="pet-photo-edit" onClick={() => mudarVista({ fotografia: a })} aria-label={rotuloFoto(a)}>
                  <Icone nome="image-plus" />
                </Botao>
              </div>
              <Botao variante="ghost" className="pet-card-open" onClick={() => mudarVista({ animal: a })}>
                <span className="pet-card-copy">
                  <strong>{a}</strong>
                  <b className="amount-negative">{eur(soma(doMes(estado.transactions, mes).filter((m) => m.pet === a)))}</b>
                  <small>Este mês · Ano {mes.getFullYear()}: {eur(soma(estado.transactions.filter((m) => m.pet === a && doAno(m))))}</small>
                  <em>Ver despesas <Icone nome="chevron-right" /></em>
                </span>
              </Botao>
            </article>
          ))}
        </section>
        <div key="ffvet" className="ffvet-host" ref={(el) => { if (el && !montados.has(el)) { montados.add(el); montar(el); } }} />
        <section className="transactions-panel vet-month-list">
          <div className="section-heading">
            <h2>{`Despesas veterinárias · ${MESES[mes.getMonth()]}`}</h2>
            <strong className="amount-negative">{eur(soma(lista))}</strong>
          </div>
          <Segmentado
            valor={vista.filtro} rotulo="Filtrar por animal" aoMudar={(filtro) => mudarVista({ filtro })}
            opcoes={[{ valor: '', rotulo: 'Todos' }, ...animais().map((a) => ({ valor: a, rotulo: a }))]}
          />
          <div className="transaction-list">
            {lista.length ? lista.map((m) => (
              <ArtigoMovimento key={m.id} movimento={m} aoAbrir={abrirMovimento}>
                <div className="transaction-main">
                  <span className={`vet-avatar vet-avatar-${classeDoAnimal(m.pet!)}`}>
                    {fotos[m.pet!] ? <img src={fotos[m.pet!]} alt="" /> : simboloDoAnimal(m.pet!)}
                  </span>
                  <div className="min-w-0">
                    <h3>{m.title}</h3>
                    <p>{`${Number(m.date.slice(8, 10))} ${MESES[Number(m.date.slice(5, 7)) - 1]?.slice(0, 3)} · ${m.pet} · ${(m.vetCategory as string) || 'Outros'}`}</p>
                  </div>
                </div>
                <strong className="amount-negative">−{eur(Math.abs(m.amount))}</strong>
              </ArtigoMovimento>
            )) : <div className="vet-empty">{`Sem despesas veterinárias em ${MESES[mes.getMonth()]}.`}</div>}
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
    const leitor = new FileReader();
    leitor.addEventListener('load', () => { if (typeof leitor.result === 'string') { const r = leitor.result; mudarFotos((f) => ({ ...f, [animal]: r })); } });
    leitor.readAsDataURL(ficheiro);
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
