import { useState } from 'react';
import { anoMes, dia, type Estado, gastos, inicioDoMes } from '../dados';
import { formatarEuros, formatarPercentagem } from '../ui/formatos';
import { Segmentado } from '../ui/Segmentado';
import { pessoasDaFamilia } from '../movimentos/pessoas';
import { caminhoDaFatia, categoriasDoMes, CORES, coresDistintas, diasDoMes, doMes, fatiasComSeta, type GastoConta, gastosPorConta, gastosPorPessoa, legendasDoGrafico, percentagem, receitas, variacao } from './calculos';

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
  // o destaque (fatia ou barra tocada) só vale para o gráfico em que foi escolhido
  const chave = `${tipo}-${anoMes(mes)}`;
  const [toque, setToque] = useState<{ chave: string; fatia?: string; barra?: number }>({ chave: '' });
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
    const l = coresDistintas(categoriasDoMes(estado, mes, tipo === 'receitas' ? 'receitas' : 'despesas')).filter((e) => e.amount > 0);
    const total = l.reduce((s, e) => s + e.amount, 0);
    const escolhida = l.find((e) => e.name === destaque);
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
            <svg
              className="donut-callouts" viewBox="0 0 340 250" aria-hidden="true" style={{ animationDelay: `${l.length * 70 + 250}ms` }}
              dangerouslySetInnerHTML={{ __html: legendasDoGrafico(fatiasComSeta(l, total), total) }}
            />
          ) : null}
        </div>
        {l.length ? (
          <div className={`chart-legend chart-legend-compact ffdonut-legenda${escolhida ? ' ffcom-destaque' : ''}`}>
            {l.map((e) => (
              <div key={e.name} className={e.name === destaque ? 'ffdestaque' : undefined} aria-pressed={e.name === destaque} {...comoBotao(() => tocarFatia(e.name))}>
                <span className={`legend-dot tone-${e.tone}`} />
                <span>{e.name}</span>
                <strong>{eur(e.amount)}</strong>
                <small>{percentagem(e.share)}</small>
              </div>
            ))}
          </div>
        ) : <p className="chart-empty">{tipo === 'receitas' ? 'Sem receitas neste mês.' : 'Sem gastos neste mês.'}</p>}
      </>
    );
  };

  const barras = () => {
    const diario = tipo === 'diario';
    const valores = diario
      ? Array.from({ length: dias }, (_, i) => gastos(doMesAtual.filter((m) => Number(m.date.slice(8, 10)) === i + 1)))
      : mesesDoAno.map((d) => Math.abs(tipo === 'gastos' ? gastos(doMes(movimentos, d)) : receitas(doMes(movimentos, d))));
    const maximo = Math.max(1, ...valores), n = valores.length;
    const hoje = dia(new Date());
    return valores.map((v, i) => {
      const rotulo = diario ? (i + 1 === 1 || (i + 1) % 5 === 0 || i + 1 === dias ? String(i + 1) : '') : MESES_CURTOS[mesesDoAno[i]!.getMonth()]!;
      const nome = diario ? `${i + 1} ${MESES_CURTOS[mes.getMonth()]!.toLowerCase()}` : MESES_CURTOS[mesesDoAno[i]!.getMonth()]!;
      const atual = diario ? `${anoMes(mes)}-${String(i + 1).padStart(2, '0')}` === hoje : i === n - 1;
      const lado = i < n / 4 ? ' ffesq' : i >= (n * 3) / 4 ? ' ffdir' : '';
      return (
        <div
          key={i} className={`${atual ? 'ffbarra-atual' : ''}${i === barraTocada ? ' ffbarra-tocada' : ''}`.trim() || undefined}
          aria-label={`${nome}: ${eur(v)}`} aria-pressed={i === barraTocada} {...comoBotao(() => tocarBarra(i))}
        >
          <i style={{ height: `${Math.max(4, (v / maximo) * 100)}%`, '--i': i } as React.CSSProperties}>
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
          {tipo === 'gastos' ? (
            <section className="chart-panel">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '.75rem' }}>
                <section className="metric-panel expense-panel ffmedias">
                  <p>Média mensal</p>
                  <strong>{eur(mesesDoAno.map((d) => gastos(doMes(movimentos, d))).reduce((s, v) => s + v, 0) / mesesDoAno.length)}</strong>
                </section>
                <section className="metric-panel expense-panel ffmedias">
                  <p>Média Diária</p>
                  <strong>{eur(gasto / dias)}</strong>
                </section>
              </div>
            </section>
          ) : null}
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
        <div key={chave} className={`bar-chart bar-chart-${tipo} ffbarras${barraTocada !== undefined ? ' ffcom-toque' : ''}`} style={tipo === 'diario' ? { gridTemplateColumns: `repeat(${dias},1fr)`, gap: '1px' } : { gridTemplateColumns: `repeat(${Math.max(9, mesesDoAno.length)},1fr)` }}>
          {barras()}
        </div>
      </section>
      {tipo === 'diario' ? (
        <section className="chart-panel">
          <div className="chart-legend">
            {porDia.map(([data, v]) => (
              <div key={data}>
                <span className="legend-dot tone-violet" />
                <span>{new Date(`${data}T00:00:00`).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</span>
                <strong>{eur(v)}</strong>
                <small />
                <em />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
