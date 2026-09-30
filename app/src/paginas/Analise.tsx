import { type Estado, gastos, inicioDoMes } from '../dados';
import { formatarEuros, formatarPercentagem } from '../ui/formatos';
import { Segmentado } from '../ui/Segmentado';
import { categoriasDoMes, CORES, diasDoMes, doMes, legendasDoGrafico, percentagem, receitas, variacao } from './calculos';

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
  const mesesDoAno = Array.from({ length: mes.getMonth() + 1 }, (_, i) => new Date(mes.getFullYear(), i, 1));

  const grafico = () => {
    const l = categoriasDoMes(estado, mes, tipo === 'receitas' ? 'receitas' : 'despesas').filter((e) => e.amount > 0);
    const total = l.reduce((s, e) => s + e.amount, 0);
    let fim = 0;
    const fatias = l.map((e) => { const inicio = fim; fim += (e.amount / total) * 100; return `${CORES[e.tone] || 'var(--primary)'} ${inicio}% ${fim}%`; });
    return (
      <>
        <div className="donut-wrap">
          <div className={`donut donut-${tipo}`} style={fatias.length ? { background: `conic-gradient(${fatias.join(',')})` } : { background: 'color-mix(in oklab, var(--primary) 15%, transparent)' }}>
            <div>
              <strong>{eur(tipo === 'gastos' ? gasto : recebido)}</strong>
              <span>{tipo === 'gastos' ? 'Gastos totais' : 'Receitas totais'}</span>
              <small className={tipo === 'receitas' ? 'amount-positive' : 'amount-negative'}>
                {tipo === 'gastos' && gastoAnterior ? `${evolucao > 0 ? '↑' : '↓'} ${formatarPercentagem(evolucao)}` : ''}
              </small>
            </div>
          </div>
          {l.length > 0 ? <svg className="donut-callouts" viewBox="0 0 340 250" aria-hidden="true" dangerouslySetInnerHTML={{ __html: legendasDoGrafico(l, total) }} /> : null}
        </div>
        {l.length ? (
          <div className="chart-legend chart-legend-compact">
            {l.map((e) => (
              <div key={e.name}>
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
    if (tipo === 'diario') {
      const valores = Array.from({ length: dias }, (_, i) => gastos(doMesAtual.filter((m) => Number(m.date.slice(8, 10)) === i + 1)));
      const maximo = Math.max(1, ...valores);
      return valores.map((v, i) => (
        <div key={i}>
          <i style={{ height: `${Math.max(4, (v / maximo) * 100)}%` }} />
          <span>{i + 1 === 1 || (i + 1) % 5 === 0 || i + 1 === dias ? String(i + 1) : ''}</span>
        </div>
      ));
    }
    const valores = mesesDoAno.map((d) => (tipo === 'gastos' ? gastos(doMes(movimentos, d)) : receitas(doMes(movimentos, d))));
    const maximo = Math.max(1, ...valores.map((v) => Math.abs(v)));
    return mesesDoAno.map((d, i) => (
      <div key={i}>
        <i style={{ height: `${Math.max(4, (Math.abs(valores[i]!) / maximo) * 100)}%` }} />
        <span>{MESES_CURTOS[d.getMonth()]}</span>
      </div>
    ));
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
                <section className="metric-panel expense-panel">
                  <p>Média mensal</p>
                  <strong>{eur(mesesDoAno.map((d) => gastos(doMes(movimentos, d))).reduce((s, v) => s + v, 0) / mesesDoAno.length)}</strong>
                </section>
                <section className="metric-panel expense-panel">
                  <p>Média Diária</p>
                  <strong>{eur(gasto / dias)}</strong>
                </section>
              </div>
            </section>
          ) : null}
          <section className="chart-panel">{grafico()}</section>
        </>
      )}
      <section className="evolution-panel">
        <div className="section-heading">
          <h2>{tipo === 'diario' ? 'Gastos diários' : <>Evolução de {tipo}</>}</h2>
          <span>{eur(tipo === 'receitas' ? recebido : gasto)}</span>
        </div>
        <div className={`bar-chart bar-chart-${tipo}`} style={tipo === 'diario' ? { gridTemplateColumns: `repeat(${dias},1fr)`, gap: '1px' } : undefined}>
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
