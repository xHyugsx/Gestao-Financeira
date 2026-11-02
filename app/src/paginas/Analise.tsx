import { useState } from 'react';
import { anoMes, dia, type Estado, gastos, inicioDoMes, MESES } from '../dados';
import { aspetosCategorias } from '../movimentos/categorias';
import { formatarEuros, formatarPercentagem } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { RoboVazio } from '../ui/RoboVazio';
import { Segmentado } from '../ui/Segmentado';
import { pessoasDaFamilia } from '../movimentos/pessoas';
import { agruparLinhas, gruposDe } from '../movimentos/grupos';
import { caminhoDaFatia, calorDoMes, categoriasDoMes, CORES, coresDistintas, diasDoMes, doMes, fatiasComSeta, type GastoConta, gastosPorConta, gastosPorPessoa, percentagem, receitas, variacao } from './calculos';

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export type TipoAnalise = 'gastos' | 'receitas' | 'diario';
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface Props {
  estado: Estado;
  mes: Date;
  ocultos: boolean;
  tipo: TipoAnalise;
  mudarTipo: (t: TipoAnalise) => void;
}

export function Analise({ estado, mes, ocultos, tipo, mudarTipo }: Props) {
  const eur = (v: number) => formatarEuros(v, ocultos);
  const movimentos = estado.transactions;
  const doMesAtual = doMes(movimentos, mes);
  const gasto = gastos(doMesAtual), gastoAnterior = gastos(doMes(movimentos, inicioDoMes(mes, -1)));
  const recebido = receitas(doMesAtual);
  const evolucao = variacao(gasto, gastoAnterior);
  const dias = diasDoMes(mes);
  const contas = gastosPorConta(estado, mes);
  const porPessoa = gastosPorPessoa(estado, mes, pessoasDaFamilia(estado));
  const mesesDoAno = Array.from({ length: mes.getMonth() + 1 }, (_, i) => new Date(mes.getFullYear(), i, 1));
  const aspetos = aspetosCategorias(estado, mes);
  const calor = calorDoMes(movimentos, mes);
  const mediaMensal = mesesDoAno.map((d) => gastos(doMes(movimentos, d))).reduce((s, v) => s + v, 0) / mesesDoAno.length;
  const gastosDia = Array.from({ length: dias }, (_, i) => gastos(doMesAtual.filter((m) => Number(m.date.slice(8, 10)) === i + 1)));
  // Diário: um dia muito acima dos outros (ex.: a renda) fica com a barra cortada, para não deixar as outras rasas
  const ordenados = [...gastosDia].sort((a, b) => b - a), [maior = 0, segundo = 0] = ordenados;
  const corte = segundo > 0 && maior > segundo * 2.5 ? segundo * 1.25 : 0;
  const diaMaisCaro = maior > 0 ? gastosDia.indexOf(maior) + 1 : null;
  // o destaque (fatia ou barra tocada) só vale para o gráfico em que foi escolhido
  const chave = `${tipo}-${anoMes(mes)}`;
  const [toque, setToque] = useState<{ chave: string; fatia?: string; barra?: number }>({ chave: '' });
  // categorias com grupos: por omissão o gráfico mostra os grupos; tocar num grupo abre as suas categorias
  const [vistaCat, setVistaCat] = useState<'grupo' | 'categoria'>('grupo');
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const destaque = toque.chave === chave ? toque.fatia : undefined;
  const barraTocada = toque.chave === chave ? toque.barra : undefined;
  const tocarFatia = (nome?: string) => setToque({ chave, fatia: nome && nome !== destaque ? nome : undefined });
  const tocarBarra = (i: number) => setToque({ chave, barra: i === barraTocada ? undefined : i });
  const comoBotao = (aoTocar: () => void) => ({
    role: 'button', tabIndex: 0, onClick: aoTocar,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoTocar(); } },
  });

  const listaDeGastos = (titulo: string, classe: string, linhas: GastoConta[]) => (linhas.length ? (
    <section className={`chart-panel ${classe}`} aria-label={titulo}>
      <div className="section-heading"><h2>{titulo}</h2></div>
      <div className="ffpilha" aria-hidden="true">
        {linhas.filter((c) => c.amount > 0).map((c) => <i key={c.id || '-'} className={`tone-${c.tone}`} style={{ flexGrow: c.share }} />)}
      </div>
      <div className="chart-legend">
        {linhas.map((c) => {
          const v = c.anterior ? variacao(c.amount, c.anterior) : null;
          return (
            <div key={c.id || '-'}>
              <span className={`legend-dot tone-${c.tone}`} />
              <span>{c.name}</span>
              <strong>{eur(c.amount)}</strong>
              <small>{percentagem(c.share)}</small>
              <em className={v === null ? '' : v > 0 ? 'amount-negative' : 'amount-positive'}>
                {v === null ? '' : `${v > 0 ? '↑' : '↓'} ${formatarPercentagem(v)}`}
              </em>
              <i className="ffcontas-barra" aria-hidden="true"><b className={`tone-${c.tone}`} style={{ transform: `scaleX(${c.share / 100})` }} /></i>
            </div>
          );
        })}
      </div>
    </section>
  ) : null);

  const grafico = () => {
    const base = categoriasDoMes(estado, mes, tipo === 'receitas' ? 'receitas' : 'despesas');
    const mapaG = gruposDe(estado, base.map((x) => x.name)), temGrupos = Object.keys(mapaG).length > 0;
    const l = coresDistintas(temGrupos && vistaCat === 'grupo' ? agruparLinhas(base, mapaG) : base.map((x) => ({ ...x, subs: [] as typeof base }))).filter((e) => e.amount > 0);
    const icone = (nome: string) => (tipo === 'receitas' ? aspetos.receitas : aspetos.despesas).get(nome)?.icone ?? 'tags';
    const total = l.reduce((s, e) => s + e.amount, 0);
    const escolhida = l.find((e) => e.name === destaque);
    const maxComp = Math.max(1, ...l.map((e) => Math.max(e.amount, e.anterior)));
    let fim = 0;
    const fatias = l.map((e, i) => {
      const de = fim;
      fim += e.amount / total;
      return (
        <path
          key={e.name} d={caminhoDaFatia(de, fim)} fill={CORES[e.tone] || 'var(--primary)'}
          className={`ffdonut-fatia${e.name === destaque ? ' ffdestaque' : ''}`} style={{ '--i': i } as React.CSSProperties}
          onClick={() => tocarFatia(e.name)}
        />
      );
    });
    return (
      <>
        <div key={chave} className={`donut-wrap${escolhida ? ' ffcom-destaque' : ''}`}>
          <div className={`donut donut-${tipo}`} style={{ background: l.length ? 'none' : 'color-mix(in oklab, var(--primary) 15%, transparent)' }}>
            {l.length ? <svg className="ffdonut" viewBox="0 0 100 100" aria-hidden="true">{fatias}</svg> : null}
            <div onClick={() => tocarFatia()}>
              {escolhida ? (
                <>
                  <strong>{eur(escolhida.amount)}</strong>
                  <span className="ffdonut-nome">{escolhida.name}</span>
                  <small style={{ color: CORES[escolhida.tone] || 'var(--primary)' }}>{percentagem(escolhida.share)}</small>
                </>
              ) : (
                <>
                  <strong>{eur(tipo === 'gastos' ? gasto : recebido)}</strong>
                  <span>{tipo === 'gastos' ? 'Gastos totais' : 'Receitas totais'}</span>
                  <small className={tipo === 'receitas' ? 'amount-positive' : 'amount-negative'}>
                    {tipo === 'gastos' && gastoAnterior ? `${evolucao > 0 ? '↑' : '↓'} ${formatarPercentagem(evolucao)}` : ''}
                  </small>
                </>
              )}
            </div>
          </div>
          {l.length > 0 ? (
            <ul className="ffdonut-lado" aria-hidden="true">
              {fatiasComSeta(l, total).map((e) => (
                <li key={e.name}><i style={{ background: e.tone === 'outras' ? 'var(--muted-foreground)' : CORES[e.tone] || 'var(--primary)' }} /><span>{e.name}</span><b>{percentagem(e.share)}</b></li>
              ))}
            </ul>
          ) : null}
        </div>
        {temGrupos && l.length ? (
          <Segmentado valor={vistaCat} rotulo="Ver por" classe="ffseg-vista" aoMudar={setVistaCat} opcoes={[{ valor: 'grupo', rotulo: 'Por grupo' }, { valor: 'categoria', rotulo: 'Por categoria' }]} />
        ) : null}
        {l.length ? (
          <div className={`chart-legend chart-legend-compact ffdonut-legenda${escolhida ? ' ffcom-destaque' : ''}`}>
            {l.map((e) => {
              // comparação com o mês anterior: seta com a variação e barra fantasma do valor desse mês
              const sobe = e.amount > e.anterior, bom = tipo === 'receitas' ? sobe : !sobe;
              const v = e.anterior ? variacao(e.amount, e.anterior) : null;
              const temSubs = e.subs.length > 0, aberto = temSubs && abertos.has(e.name);
              const tocar = () => { tocarFatia(e.name); if (temSubs) setAbertos((a) => { const n = new Set(a); if (n.has(e.name)) n.delete(e.name); else n.add(e.name); return n; }); };
              return [
                <div key={e.name} className={`${e.name === destaque ? 'ffdestaque' : ''}${temSubs ? ' ffcom-subs' : ''}${aberto ? ' ffaberto' : ''}`.trim() || undefined} aria-pressed={e.name === destaque} aria-expanded={temSubs ? aberto : undefined} {...comoBotao(tocar)}>
                  <span className="ffcat-ic" style={{ '--c': CORES[e.tone] || 'var(--primary)' } as React.CSSProperties}>
                    <Icone nome={icone(e.name)} />
                  </span>
                  <span>{e.name}{temSubs ? <i className="ffcat-chev" aria-hidden="true"><Icone nome="chevron-right" /></i> : null}</span>
                  <strong>{eur(e.amount)}</strong>
                  <small>{percentagem(e.share)}</small>
                  <em className={`ffcomp-var ${v === null || e.amount === e.anterior ? 'ffcomp-novo' : bom ? 'amount-positive' : 'amount-negative'}`} title={`Mês anterior: ${eur(e.anterior)}`}>
                    {v === null ? 'novo' : e.amount === e.anterior ? '=' : `${sobe ? '↑' : '↓'} ${formatarPercentagem(v)}`}
                  </em>
                  <i className="ffcomp" aria-hidden="true">
                    <s style={{ transform: `scaleX(${e.anterior / maxComp})` }} />
                    <b className={`tone-${e.tone}`} style={{ transform: `scaleX(${e.amount / maxComp})` }} />
                  </i>
                </div>,
                ...(aberto ? e.subs.filter((x) => x.amount > 0 || x.anterior > 0).map((x) => (
                  <p key={`${e.name}-${x.name}`} className="ffsubcat">
                    <span className="ffcat-ic" style={{ '--c': CORES[e.tone] || 'var(--primary)' } as React.CSSProperties}><Icone nome={icone(x.name)} /></span>
                    <span>{x.name} <small>{e.amount ? percentagem(Math.round((x.amount / e.amount) * 1000) / 10) : ''}</small></span>
                    <strong>{eur(x.amount)}</strong>
                  </p>
                )) : []),
              ];
            })}
          </div>
        ) : <div className="ffvazio"><RoboVazio /><p className="chart-empty">{tipo === 'receitas' ? 'Sem receitas neste mês.' : 'Sem gastos neste mês.'}</p></div>}
      </>
    );
  };

  const barras = () => {
    const diario = tipo === 'diario';
    const valores = diario
      ? gastosDia
      : mesesDoAno.map((d) => Math.abs(tipo === 'gastos' ? gastos(doMes(movimentos, d)) : receitas(doMes(movimentos, d))));
    const maximo = diario && corte ? corte : Math.max(1, ...valores), n = valores.length;
    const hoje = dia(new Date());
    return valores.map((v, i) => {
      const rotulo = diario ? (i + 1 === 1 || (i + 1) % 5 === 0 || i + 1 === dias ? String(i + 1) : '') : MESES_CURTOS[mesesDoAno[i]!.getMonth()]!;
      const nome = diario ? `${i + 1} ${MESES_CURTOS[mes.getMonth()]!.toLowerCase()}` : MESES_CURTOS[mesesDoAno[i]!.getMonth()]!;
      const atual = diario ? `${anoMes(mes)}-${String(i + 1).padStart(2, '0')}` === hoje : i === n - 1;
      const lado = i < n / 4 ? ' ffesq' : i >= (n * 3) / 4 ? ' ffdir' : '';
      return (
        <div
          key={i} className={`${atual ? 'ffbarra-atual' : ''}${i === barraTocada ? ' ffbarra-tocada' : ''}${diario && calor.nivel[i + 1] ? ` ffbarra-q${calor.nivel[i + 1]}` : ''}${diario && corte && v > corte ? ' ffbarra-cortada' : ''}`.trim() || undefined}
          aria-label={`${nome}: ${eur(v)}`} aria-pressed={i === barraTocada} {...comoBotao(() => tocarBarra(i))}
        >
          <i style={{ height: `${Math.max(4, Math.min(1, v / maximo) * 100)}%`, '--i': i } as React.CSSProperties}>
            {i === barraTocada ? <b className={`ffbarra-valor${lado}`}>{diario ? `${nome} · ${eur(v)}` : eur(v)}</b> : null}
          </i>
          <span>{rotulo}</span>
        </div>
      );
    });
  };

  const porDia = Object.entries(doMesAtual.filter((m) => m.movementType === 'expense')
    .reduce<Record<string, number>>((acc, m) => { acc[m.date] = (acc[m.date] || 0) + Math.abs(m.amount); return acc; }, {}))
    .sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <main className="detail-view">
      <Segmentado
        valor={tipo} rotulo="Tipo de análise" aoMudar={mudarTipo}
        opcoes={[{ valor: 'gastos', rotulo: 'Gastos' }, { valor: 'receitas', rotulo: 'Receitas' }, { valor: 'diario', rotulo: 'Diário' }]}
      />
      {tipo === 'diario' ? null : (
        <>
          <section className="ffresumo-mes" aria-label={tipo === 'gastos' ? 'Gastos do mês' : 'Receitas do mês'}>
            <p className="ffbloco-rot">{`${tipo === 'gastos' ? 'Gastos' : 'Receitas'} em ${MESES[mes.getMonth()]}`}</p>
            <strong className="ffresumo-valor">{eur(tipo === 'gastos' ? gasto : recebido)}</strong>
            {tipo === 'gastos' && gastoAnterior ? (
              <span className={`ffhero-var ${evolucao > 0 ? 'amount-negative' : 'amount-positive'}`}>
                {`${evolucao > 0 ? '↑' : '↓'} ${formatarPercentagem(evolucao)} vs ${MESES[inicioDoMes(mes, -1).getMonth()]}`}
              </span>
            ) : null}
            {tipo === 'gastos' ? (
              <div className="ffmedias">
                <p>Média mensal <strong>{eur(mediaMensal)}</strong></p>
                <p>Média diária <strong>{eur(gasto / dias)}</strong></p>
              </div>
            ) : null}
          </section>
          <section className="chart-panel">{grafico()}</section>
          {tipo === 'gastos' ? listaDeGastos('Gastos por conta', 'ffcontas', contas) : null}
          {tipo === 'gastos' ? listaDeGastos('Gastos por pessoa', 'ffcontas ffpessoas', porPessoa) : null}
        </>
      )}
      <section className="evolution-panel">
        <div className="section-heading">
          <h2>{tipo === 'diario' ? 'Gastos diários' : <>Evolução de {tipo}</>}</h2>
          <span>{eur(tipo === 'receitas' ? recebido : gasto)}</span>
        </div>
        <div key={chave} className={`bar-chart bar-chart-${tipo} ffbarras${barraTocada !== undefined ? ' ffcom-toque' : ''}`} style={tipo === 'diario' ? { gridTemplateColumns: `repeat(${dias},1fr)`, gap: '2px' } : { gridTemplateColumns: `repeat(${Math.max(9, mesesDoAno.length)},1fr)` }}>
          {barras()}
          {tipo !== 'diario' && mesesDoAno.length > 1 ? (() => {
            const vs = mesesDoAno.map((d) => Math.abs(tipo === 'gastos' ? gastos(doMes(movimentos, d)) : receitas(doMes(movimentos, d))));
            const media = vs.reduce((s, v) => s + v, 0) / vs.length, max = Math.max(1, ...vs);
            return media ? <span className="ffmedia-linha" style={{ '--p': media / max } as React.CSSProperties}><b>{`média ${ocultos ? '•••' : `${Math.round(media).toLocaleString('pt-PT')} €`}`}</b></span> : null;
          })() : null}
        </div>
      </section>
      {tipo === 'diario' ? (
        <>
          <section className="ffresumos-dia">
            <article className="ffbloco">
              <p className="ffbloco-rot">Média diária</p>
              <strong className="ffbloco-val">{eur(gasto / dias)}</strong>
              <small>{`${calor.semGastos.length} ${calor.semGastos.length === 1 ? 'dia' : 'dias'} sem despesas`}</small>
            </article>
            <article className="ffbloco">
              {corte && diaMaisCaro ? (
                <>
                  <p className="ffbloco-rot">{`Sem o dia ${diaMaisCaro}`}</p>
                  <strong className="ffbloco-val">{eur((gasto - maior) / Math.max(1, dias - 1))}</strong>
                  <small>média sem o dia mais caro</small>
                </>
              ) : (
                <>
                  <p className="ffbloco-rot">Dia mais caro</p>
                  <strong className="ffbloco-val">{diaMaisCaro ? eur(maior) : '—'}</strong>
                  <small>{diaMaisCaro ? `dia ${diaMaisCaro}` : 'sem gastos'}</small>
                </>
              )}
            </article>
          </section>
          {porDia.length ? (
            <div className="transaction-list ffdias ffdias-analise">
              {porDia.map(([data, v]) => {
                const d = new Date(`${data}T00:00:00`), n = calor.nivel[d.getDate()] ?? 0;
                return (
                  <div key={data} className="ffdia">
                    <i className={`ffponto ffponto-${data > dia(new Date()) ? 'futuro' : n ? `q${n}` : 'sem'}`} aria-hidden="true" />
                    <b>{`${DIAS_SEMANA[d.getDay()]!.charAt(0).toUpperCase()}${DIAS_SEMANA[d.getDay()]!.slice(1)}, ${d.getDate()}`}</b>
                    <span className="amount-negative">{eur(-v)}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
