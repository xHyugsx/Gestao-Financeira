import { type Estado, MESES, type Movimento } from '../dados';
import { ArtigoMovimento, TextoMovimento } from '../movimentos/Movimento';
import { formatarEuros, formatarPercentagem } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { eCombustivel } from './calculos';

interface Props {
  estado: Estado;
  mes: Date;
  /** Data de hoje (para saber quantos meses do ano já passaram). */
  agora: Date;
  ocultos: boolean;
  abrirMovimento: (m: Movimento) => void;
}

export function Combustivel({ estado, mes, agora, ocultos, abrirMovimento }: Props) {
  const eur = (v: number) => formatarEuros(v, ocultos);
  const soma = (l: Movimento[]) => l.reduce((s, m) => s + Math.abs(m.amount), 0);
  const ano = mes.getFullYear();
  const doAno = estado.transactions.filter((m) => eCombustivel(m) && m.date.startsWith(`${ano}-`));
  const doMesAtual = doAno.filter((m) => Number(m.date.slice(5, 7)) === mes.getMonth() + 1).sort((a, b) => b.date.localeCompare(a.date));
  const porMes = MESES.map((_, i) => soma(doAno.filter((m) => Number(m.date.slice(5, 7)) === i + 1)));
  const maximo = Math.max(...porMes, 1);
  const total = porMes.reduce((s, v) => s + v, 0);
  const meses = ano < agora.getFullYear() ? 12 : ano > agora.getFullYear() ? 0 : agora.getMonth() + 1;
  const gastoMes = soma(doMesAtual);

  const tendencia = () => {
    const media = total / meses, v = ((gastoMes - media) / media) * 100;
    return <small className={v <= 0 ? 'fuel-trend-corner positive' : 'fuel-trend-corner negative'}>{v <= 0 ? '↓ ' : '↑ '}{formatarPercentagem(v)}</small>;
  };

  return (
    <main className="detail-view fuel-view">
      <section className="summary-grid">
        <article><span>Gasto no mês</span><strong className="amount-negative">{eur(gastoMes)}</strong></article>
        <article><span>N.º de abastecimentos</span><strong>{doMesAtual.length}</strong></article>
        <article><span>Total {ano}</span><strong className="amount-negative">{eur(total)}</strong></article>
        <article className="fuel-average-card">
          <span>Média mensal {ano}</span>
          <strong className="amount-negative">{meses ? eur(total / meses) : '—'}</strong>
          <div className="fuel-average-foot">
            {meses > 0 ? <small>Sobre {meses} {meses === 1 ? 'mês' : 'meses'}</small> : null}
            {meses > 0 && total > 0 ? tendencia() : null}
          </div>
        </article>
      </section>
      <section className="vet-breakdown">
        <h3>Gasto mensal em combustível</h3>
        {porMes.map((v, i) => (
          <div key={i}>
            <span>{MESES[i]?.slice(0, 3)}</span>
            <strong>{eur(v)}</strong>
            <progress max={maximo} value={v} aria-label={`${MESES[i]}: ${eur(v)}`} />
          </div>
        ))}
      </section>
      <section className="transactions-panel">
        <div className="section-heading"><h2>Abastecimentos de {MESES[mes.getMonth()]}</h2></div>
        <div className="transaction-list">
          {doMesAtual.length ? doMesAtual.map((m) => (
            <ArtigoMovimento key={m.id} movimento={m} aoAbrir={abrirMovimento}>
              <div className="transaction-main">
                <span className="transaction-icon transaction-icon-car"><Icone nome="fuel" aria-hidden="true" /></span>
                <TextoMovimento movimento={m} contas={estado.accounts} />
              </div>
              <strong className="amount-negative">−{eur(Math.abs(m.amount))}</strong>
            </ArtigoMovimento>
          )) : <div className="vet-empty">Sem gastos de combustível neste mês.</div>}
        </div>
      </section>
    </main>
  );
}
