import { anoMes, dia, diaDeVencimento, type Estado, MESES, type Movimento } from '../dados';
import type { aspetosCategorias } from '../movimentos/categorias';
import { LinhaMovimento } from '../movimentos/Movimento';
import { Botao } from '../ui/Botao';
import { Icone } from '../ui/Icone';
import { formatarEuros } from '../ui/formatos';
import { calorDoMes, diasDoMes, doMes } from './calculos';

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const LEGENDA: [string, string][] = [['in', 'Receita'], ['out', 'Despesa'], ['rec', 'Recorrente'], ['tr', 'Transferência']];

/** Tipo do ponto colorido de cada movimento num dia do calendário. */
function tipoDoPonto(m: Movimento): string {
  if (m.revolut || m.movementType === 'transfer') return 'tr';
  if (m.recurring) return 'rec';
  return (m.movementType || (m.amount < 0 ? 'expense' : 'income')) === 'income' ? 'in' : 'out';
}


interface Props {
  estado: Estado;
  mes: Date;
  ocultos: boolean;
  diaEscolhido: number;
  escolherDia: (d: number) => void;
  aspetos: ReturnType<typeof aspetosCategorias>;
  abrirMovimento: (m: Movimento) => void;
}

export function Calendario({ estado, mes, ocultos, diaEscolhido, escolherDia, aspetos, abrirMovimento }: Props) {
  const doMesAtual = doMes(estado.transactions, mes);
  const vazios = (mes.getDay() + 6) % 7;
  const celulas = [...Array<null>(vazios).fill(null), ...Array.from({ length: diasDoMes(mes) }, (_, i) => i + 1)];
  const vencimento = diaDeVencimento(mes);
  const hoje = dia(new Date());
  const doDia = (d: number) => doMesAtual.filter((m) => Number(m.date.slice(-2)) === d);
  const escolhidos = doDia(diaEscolhido);
  const calor = calorDoMes(estado.transactions, mes);

  return (
    <main className="detail-view calendar-view">
      <section className="calendar-panel">
        <div className="calendar-weekdays">{DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}</div>
        <div key={anoMes(mes)} className="calendar-grid">
          {celulas.map((d, i) => {
            if (d === null) return <span key={`empty-${i}`} className="calendar-empty" style={{ '--i': i } as React.CSSProperties} />;
            const pontos = ['in', 'out', 'rec', 'tr'].filter((c) => doDia(d).some((m) => tipoDoPonto(m) === c));
            const fimDeSemana = new Date(mes.getFullYear(), mes.getMonth(), d).getDay() % 6 === 0;
            return (
              <Botao
                key={d} type="button" variante="ghost" onClick={() => escolherDia(d)} style={{ '--i': i } as React.CSSProperties}
                className={`${diaEscolhido === d ? 'calendar-day calendar-day-active' : 'calendar-day'}${fimDeSemana ? ' ffcal-we' : ''}${hoje === `${anoMes(mes)}-${String(d).padStart(2, '0')}` ? ' ffcal-today' : ''}${calor.nivel[d] ? ` ffcal-q${calor.nivel[d]}` : calor.previsto[d] ? ' ffcal-futuro' : calor.semGastos.includes(d) ? ' ffcal-zero' : ''}`}
                aria-label={calor.gasto[d] ? `${d}: gasto ${formatarEuros(calor.gasto[d]!, ocultos)}` : calor.previsto[d] ? `${d}: agendado ${formatarEuros(calor.previsto[d]!, ocultos)}` : calor.semGastos.includes(d) ? `${d}: sem despesas` : undefined}
              >
                <span>{d}</span>
                {pontos.length ? <span className="ffdots" aria-hidden="true">{pontos.map((c) => <i key={c} className={`ffd-${c}`} />)}</span> : null}
                {d === vencimento ? <span className="calendar-payday" aria-label="Dia de vencimento">€</span> : null}
              </Botao>
            );
          })}
        </div>
        <div className="ffcal-legend">
          {LEGENDA.map(([c, l]) => <span key={c}><i className={`ffd-${c}`} />{l}</span>)}
          <span key="sal"><b>€</b>Salário</span>
        </div>
        <div className="ffcal-calor" aria-label="Gasto por dia">
          <span>Menos</span>{[1, 2, 3, 4].map((n) => <i key={n} className={`ffcal-q${n}`} />)}<span>Mais</span>
          <span className="ffcal-zero-leg"><i className="ffcal-zero" />Sem despesas</span>
          {calor.previsto.some(Boolean) ? <span className="ffcal-zero-leg"><i className="ffcal-futuro" />Agendado</span> : null}
        </div>
        {calor.maisCaro !== null || calor.semGastos.length ? (
          <p className="ffcal-resumo">
            {calor.semGastos.length ? `${calor.semGastos.length} ${calor.semGastos.length === 1 ? 'dia' : 'dias'} sem despesas` : 'Todos os dias com despesas'}
            {calor.maisCaro !== null ? ` · dia mais caro: ${calor.maisCaro} (${formatarEuros(calor.gasto[calor.maisCaro]!, ocultos)})` : ''}
          </p>
        ) : null}
      </section>
      <section className="calendar-movements">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{diaEscolhido} de {MESES[mes.getMonth()]}</p>
            <h2>Movimentos do dia</h2>
          </div>
          <strong>{escolhidos.length}</strong>
        </div>
        <div className="transaction-list">
          {escolhidos.length ? escolhidos.map((m) => (
            <LinhaMovimento key={m.id} movimento={m} contas={estado.accounts} aspetos={aspetos} ocultos={ocultos} aoAbrir={abrirMovimento} />
          )) : (
            <div className="calendar-empty-state">
              <Icone nome="calendar-days" />
              <h3>Sem movimentos</h3>
              <p>Não existem movimentos registados nesta data.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
