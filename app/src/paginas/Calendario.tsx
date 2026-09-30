import { anoMes, dia, type Estado, MESES, type Movimento } from '../dados';
import type { aspetosCategorias } from '../movimentos/categorias';
import { LinhaMovimento } from '../movimentos/Movimento';
import { Botao } from '../ui/Botao';
import { Icone } from '../ui/Icone';
import { diasDoMes, doMes } from './calculos';

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const LEGENDA: [string, string][] = [['in', 'Receita'], ['out', 'Despesa'], ['rec', 'Recorrente'], ['tr', 'Transferência']];

/** Tipo do ponto colorido de cada movimento num dia do calendário. */
function tipoDoPonto(m: Movimento): string {
  if (m.revolut || m.movementType === 'transfer') return 'tr';
  if (m.recurring) return 'rec';
  return (m.movementType || (m.amount < 0 ? 'expense' : 'income')) === 'income' ? 'in' : 'out';
}

/** Dia de vencimento: 3.º dia útil a contar do fim do mês. */
function diaDeVencimento(mes: Date): number | null {
  let contados = 0;
  for (let d = diasDoMes(mes); d > 0; d--) {
    const semana = new Date(mes.getFullYear(), mes.getMonth(), d).getDay();
    if (semana !== 0 && semana !== 6 && ++contados === 3) return d;
  }
  return null;
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

  return (
    <main className="detail-view calendar-view">
      <section className="calendar-panel">
        <div className="calendar-weekdays">{DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="calendar-grid">
          {celulas.map((d, i) => {
            if (d === null) return <span key={`empty-${i}`} className="calendar-empty" />;
            const pontos = ['in', 'out', 'rec', 'tr'].filter((c) => doDia(d).some((m) => tipoDoPonto(m) === c));
            const fimDeSemana = new Date(mes.getFullYear(), mes.getMonth(), d).getDay() % 6 === 0;
            return (
              <Botao
                key={d} type="button" variante="ghost" onClick={() => escolherDia(d)}
                className={`${diaEscolhido === d ? 'calendar-day calendar-day-active' : 'calendar-day'}${fimDeSemana ? ' ffcal-we' : ''}${hoje === `${anoMes(mes)}-${String(d).padStart(2, '0')}` ? ' ffcal-today' : ''}`}
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
