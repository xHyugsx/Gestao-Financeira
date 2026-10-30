import { useState } from 'react';
import { type Estado, gastos, inicioDoMes, MESES, type Movimento, type Salarios } from '../dados';
import { ArtigoMovimento } from '../movimentos/Movimento';
import { reporMes } from '../movimentos/recorrentes';
import { lerValor } from '../movimentos/regras';
import { Botao } from '../ui/Botao';
import { formatarEuros, formatarPercentagem } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { RoboVazio } from '../ui/RoboVazio';
import { Segmentado } from '../ui/Segmentado';
import { AnoEmRevista } from './AnoEmRevista';
import { categoriasDoMes, doMes, fechoDoMes, percentagem, receitas, variacao } from './calculos';
import { type DespesaAnual, despesasAnuais, estadoAnual, movimentoDoPagamento, renovar, totalProximos12, valorAnual } from './anuais';
import { recorrentesDoMes } from './subscricoes';

export type SeccaoResumo = 'resumo' | 'recorrentes' | 'anuais' | 'fecho' | 'salarios';
export type PeriodoResumo = 'mes' | 'trimestre' | 'ano';

const anoMesInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * Pessoas da tabela de salários: as que já têm salários guardados (a app atual tem os nomes fixos no código;
 * aqui vêm dos dados, para não os pôr no repositório público) ou, sem nenhum, os membros do perfil.
 */
export function pessoasDosSalarios(salarios: Salarios, membros: string[]): string[] {
  const anos = Object.keys(salarios).sort().reverse();
  for (const a of anos) { const p = Object.keys(salarios[a] ?? {}); if (p.length) return p; }
  return membros.slice(0, 2);
}

interface Props {
  estado: Estado;
  mes: Date;
  ocultos: boolean;
  seccao: SeccaoResumo;
  mudarSeccao: (s: SeccaoResumo) => void;
  periodo: PeriodoResumo;
  mudarPeriodo: (p: PeriodoResumo) => void;
  mudarEstado: (f: (e: Estado) => Estado) => void;
  abrirMovimento?: (m: Movimento) => void;
  /** Todos os movimentos, com as cópias saltadas (os recorrentes precisam delas para as datas da série). */
  todos?: Movimento[];
}

export function Resumo({ estado, mes, ocultos, seccao, mudarSeccao, periodo, mudarPeriodo, mudarEstado, abrirMovimento = () => {}, todos = estado.transactions }: Props) {
  const [revista, setRevista] = useState(false);
  const [anualVariavel, setAnualVariavel] = useState(false);
  const eur = (v: number) => formatarEuros(v, ocultos);
  const movimentos = estado.transactions;
  const hoje = new Date();
  const doMesAtual = doMes(movimentos, mes);
  const gasto = gastos(doMesAtual), gastoAnterior = gastos(doMes(movimentos, inicioDoMes(mes, -1)));
  const recebido = receitas(doMesAtual);
  const evolucao = variacao(gasto, gastoAnterior);
  const maior = categoriasDoMes(estado, mes, 'despesas')[0];
  const anuais = despesasAnuais(estado.annualExpenses);

  const resumo = () => (
    <>
      <button type="button" className="ffrev-abrir" onClick={() => setRevista(true)}>
        <Icone nome="gift" /><span><strong>Ano em revista {mes.getFullYear()}</strong><small>O ano em números, ecrã a ecrã</small></span><Icone nome="chevron-right" />
      </button>
      <Segmentado
        valor={periodo} rotulo="Período do resumo" aoMudar={mudarPeriodo}
        opcoes={[{ valor: 'mes', rotulo: 'Este mês' }, { valor: 'trimestre', rotulo: 'Últimos 3 meses' }, { valor: 'ano', rotulo: 'Este ano' }]}
      />
      <section className="summary-intro">
        <span><Icone nome="chart-column" /></span>
        <div>
          <h2>Resumo de {periodo === 'mes' ? MESES[mes.getMonth()] : periodo === 'trimestre' ? '3 meses' : String(mes.getFullYear())}</h2>
          <p>{gasto ? `Gastou ${eur(gasto)} e recebeu ${eur(recebido)} neste mês.` : 'Ainda não há movimentos registados neste mês.'}</p>
        </div>
      </section>
      <section className="summary-grid">
        <article><span>Gastos</span><strong className="amount-negative">{eur(gasto)}</strong></article>
        <article><span>Receitas</span><strong className="amount-positive">{eur(recebido)}</strong></article>
      </section>
      {gastoAnterior > 0 ? (
        <section className={evolucao <= 0 ? 'insight-card insight-good' : 'insight-card'}>
          <Icone nome="trending-up" />
          <div>
            <h2>{evolucao <= 0 ? 'Boa evolução!' : 'Atenção aos gastos'}</h2>
            <p>Os seus gastos {evolucao <= 0 ? 'diminuíram' : 'aumentaram'} {formatarPercentagem(evolucao)} em relação ao mês anterior.</p>
          </div>
        </section>
      ) : null}
      {maior && maior.amount > 0 ? (
        <section className="insight-card">
          <Icone nome="house" />
          <div>
            <p>Maior categoria</p>
            <h2>{maior.name}</h2>
            <strong>{eur(maior.amount)}</strong>
            <small>{percentagem(maior.share)} dos seus gastos</small>
          </div>
        </section>
      ) : null}
    </>
  );

  const recorrentes = () => {
    const r = recorrentesDoMes(todos, mes, hoje);
    const total = r.pago + r.falta;
    const ROTULO = { pago: 'Pago', 'por pagar': 'Por pagar', atrasado: 'Atrasado', 'por confirmar': 'Por confirmar', agendado: 'Agendado', saltado: 'Saltado' } as const;
    return (
      <>
        <div className="view-heading"><p className="eyebrow">{MESES[mes.getMonth()]}</p><h2>Recorrentes e subscrições</h2></div>
        <section className="summary-grid">
          <article><span>Pago</span><strong className="amount-positive">{eur(r.pago)}</strong></article>
          <article><span>Falta pagar</span><strong className={r.falta ? 'amount-negative' : ''}>{eur(r.falta)}</strong></article>
        </section>
        {total > 0 ? <div className="ffrec-barra" aria-hidden="true"><b style={{ transform: `scaleX(${r.pago / total})` }} /></div> : null}
        <section className="transactions-panel">
          <div className="transaction-list">
            {r.lista.length ? r.lista.map((i) => (i.estado === 'saltado' ? (
              // Mês saltado («só este mês»): não abre o movimento; «Repor» volta a pô-lo nas contas
              <article key={`${i.titulo}-${i.movimento.id}`} className="transaction-row ffrec-saltado">
                <div className="transaction-main">
                  <span className="transaction-icon ffrec-ic-saltado"><Icone nome="calendar-clock" /></span>
                  <div className="min-w-0"><h3>{i.titulo}</h3><p>Dia {i.dia} · {i.periodicidade}</p></div>
                </div>
                <div className="ffrec-dir">
                  <Botao type="button" tamanho="pequeno" variante="ghost" onClick={() => mudarEstado((s) => ({ ...s, transactions: reporMes(s.transactions, i.movimento) }))}>Repor</Botao>
                  <small className="ffrec-saltado-rotulo">Saltado</small>
                </div>
              </article>
            ) : (
              <ArtigoMovimento key={`${i.titulo}-${i.movimento.id}`} movimento={i.movimento} aoAbrir={abrirMovimento}>
                <div className="transaction-main">
                  <span className={`transaction-icon ffrec-ic-${i.estado.replace(' ', '-')}`}><Icone nome={i.estado === 'pago' ? 'receipt' : 'calendar-clock'} /></span>
                  <div className="min-w-0">
                    <h3>{i.titulo}</h3>
                    <p>Dia {i.dia} · {i.periodicidade}{i.subiu !== null ? <span className="tx-acc ffrec-subiu">↑ {formatarPercentagem(i.subiu)}</span> : null}</p>
                  </div>
                </div>
                <div className="ffrec-dir">
                  <strong className={i.estimado ? 'ffrec-estimado' : undefined}>{i.valor ? `${i.estimado ? '≈ ' : ''}${eur(i.valor)}` : 'A definir'}</strong>
                  <small className={`ffrec-${i.estado.replace(' ', '-')}`}>{ROTULO[i.estado]}</small>
                </div>
              </ArtigoMovimento>
            ))) : <div className="vet-empty ffvazio-linha"><RoboVazio pequeno />Sem recorrentes neste mês. Marque um movimento como «Recorrente» para aparecer aqui.</div>}
          </div>
        </section>
        {r.anual > 0 ? (
          <section className="summary-grid">
            <article><span>Custo anual dos recorrentes</span><strong className="summary-blue">{eur(r.anual)}</strong></article>
            <article><span>Em média por mês</span><strong>{eur(r.anual / 12)}</strong></article>
          </section>
        ) : null}
      </>
    );
  };

  const ROTULO_ANUAL = { prevista: 'Prevista', 'por pagar': 'Por pagar', 'em atraso': 'Em atraso' } as const;
  const mudarAnuais = (f: (l: DespesaAnual[]) => DespesaAnual[]) => mudarEstado((s) => ({ ...s, annualExpenses: f(s.annualExpenses as DespesaAnual[]) }));
  const renovarAnual = (e: DespesaAnual) => mudarAnuais((l) => l.map((x) => (x.id === e.id ? renovar(x, hoje) : x)));
  const pagarAnual = (e: DespesaAnual) => {
    // Regista o pagamento (hoje), passa a despesa para o ano seguinte e abre o movimento para acertar valor, categoria ou conta
    const m = movimentoDoPagamento(e, movimentos, hoje, Date.now());
    mudarEstado((s) => ({ ...s, transactions: [m, ...s.transactions], annualExpenses: (s.annualExpenses as DespesaAnual[]).map((x) => (x.id === e.id ? renovar(x, hoje) : x)) }));
    abrirMovimento(m);
  };
  const despesasAnuaisSeccao = () => {
    const total = totalProximos12(anuais, hoje, movimentos);
    // Valor variável: troca entre fixo e «a definir todos os anos»; ao passar a fixo fica com a estimativa atual
    const trocarTipo = (e: DespesaAnual) => mudarAnuais((l) => l.map((x) => (x.id !== e.id ? x
      : e.variable ? { ...x, variable: undefined, value: valorAnual(e, movimentos) } : { ...x, variable: true })));
    const ordenadas = [...anuais].sort((a, b) => a.year - b.year || a.month - b.month);
    return (
      <>
        <div className="view-heading"><p className="eyebrow">Não mensais</p><h2>Despesas anuais</h2></div>
        <section className="summary-grid">
          <article><span>Próximos 12 meses</span><strong className="amount-negative">{eur(total)}</strong></article>
          <article><span>Reserva mensal sugerida</span><strong className="summary-blue">{eur(total / 12)}</strong></article>
        </section>
        <section className="transactions-panel">
          <div className="transaction-list">
            {ordenadas.length ? ordenadas.map((e) => {
              const estadoE = estadoAnual(e, hoje), cls = estadoE.replace(' ', '-');
              return (
                <article key={e.id} className={`transaction-row ffanual-${cls}`}>
                  <div className="transaction-main">
                    <span className="transaction-icon transaction-icon-car"><Icone nome="calendar-clock" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <h3>{e.name}</h3>
                      <p>Previsto: {MESES[e.month - 1]} {e.year}{estadoE !== 'prevista' ? <span className={`tx-acc ffanual-estado ffanual-estado-${cls}`}>{ROTULO_ANUAL[estadoE]}</span> : null}{e.variable ? <span className="tx-acc ffconfirmar ffanual-variavel">Valor a definir</span> : null}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {e.variable
                      ? <strong className="amount-negative ffanual-estimativa">{valorAnual(e, movimentos) ? `≈ −${eur(valorAnual(e, movimentos))}` : '—'}</strong>
                      : <strong className="amount-negative">−{eur(e.value)}</strong>}
                    {!e.variable || valorAnual(e, movimentos) ? (
                      <Botao variante="ghost" tamanho="icone" aria-label={`${e.variable ? 'Passar a valor fixo' : 'Passar a valor variável'}: ${e.name}`} title={e.variable ? 'Passar a valor fixo' : 'Passar a valor variável'} onClick={() => trocarTipo(e)}>
                        <Icone nome="arrow-right-left" />
                      </Botao>
                    ) : null}
                    <Botao variante="ghost" tamanho="icone" aria-label={`Eliminar ${e.name}`} onClick={() => mudarAnuais((l) => l.filter((x) => x.id !== e.id))}>
                      <Icone nome="trash-2" />
                    </Botao>
                  </div>
                  {estadoE !== 'prevista' ? (
                    <div className="ffanual-acoes">
                      <Botao type="button" tamanho="pequeno" onClick={() => pagarAnual(e)}>Registar pagamento</Botao>
                      <Botao type="button" tamanho="pequeno" variante="ghost" onClick={() => renovarAnual(e)}>Renovar sem registar</Botao>
                    </div>
                  ) : null}
                </article>
              );
            }) : <div className="vet-empty ffvazio-linha"><RoboVazio pequeno />Sem despesas anuais registadas.</div>}
          </div>
        </section>
        <form
          className="vet-breakdown"
          onSubmit={(ev) => {
            ev.preventDefault();
            const f = new FormData(ev.currentTarget);
            const nome = String(f.get('name') || '').trim(), texto = String(f.get('value') || '').trim(), valor = texto ? lerValor(texto) : 0;
            const [ano, mesPrevisto] = String(f.get('month') || anoMesInput(new Date())).split('-').map(Number);
            // Valor variável: o valor é opcional (estimativa); todos os anos aparece «Valor a definir»
            if (nome && Number.isFinite(valor) && (valor || anualVariavel) && ano && mesPrevisto) {
              mudarEstado((s) => ({ ...s, annualExpenses: [...s.annualExpenses, { id: Date.now(), name: nome, value: Math.abs(valor), month: mesPrevisto, year: ano, ...(anualVariavel ? { variable: true } : {}) }] }));
            }
            ev.currentTarget.reset();
            setAnualVariavel(false);
          }}
        >
          <h3>Nova despesa anual</h3>
          <label className="grid gap-1 text-xs">Descrição<input name="name" required placeholder="Ex.: IUC - Clio" className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="grid gap-1 text-xs">{anualVariavel ? 'Valor estimado (€, opcional)' : 'Valor (€)'}<input name="value" required={!anualVariavel} inputMode="decimal" placeholder="0,00" className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="checkbox-row text-xs"><input type="checkbox" name="variable" checked={anualVariavel} onChange={(x) => setAnualVariavel(x.target.checked)} /> Valor variável (a definir todos os anos)</label>
          <label className="grid gap-1 text-xs">
            Mês previsto
            <input name="month" type="month" required defaultValue={anoMesInput(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1))} className="rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <Botao type="submit"><Icone nome="plus" /> Adicionar</Botao>
        </form>
      </>
    );
  };

  const fecho = () => {
    const f = fechoDoMes(movimentos, mes);
    const linhas: [string, number, string][] = [
      ['Rendimento mensal', f.salario, 'amount-positive'], ['Outras receitas', f.outras, 'amount-positive'], ['Despesas', f.despesas, 'amount-negative'],
      ['↳ das quais combustível', f.combustivel, 'text-muted-foreground'], ['Poupança', f.poupanca, 'summary-blue'], ['Investimentos', f.investimentos, 'summary-blue'],
    ];
    return (
      <>
        <div className="view-heading"><p className="eyebrow">Fecho</p><h2>{`${MESES[mes.getMonth()]} ${mes.getFullYear()}`}</h2></div>
        <section className="vet-breakdown">
          <h3><Icone nome="scale" className="inline size-3.5" /> {f.saldo >= 0 ? 'Mês positivo' : 'Mês negativo'}</h3>
          {linhas.map(([rotulo, v, classe]) => <div key={rotulo}><span>{rotulo}</span><strong className={classe}>{eur(v)}</strong></div>)}
          <div className="border-t border-border pt-2">
            <span><b>Saldo antes de poupança/investimentos</b></span>
            <strong className={f.saldo >= 0 ? 'amount-positive' : 'amount-negative'}>{eur(f.saldo)}</strong>
          </div>
        </section>
        <p className="text-xs text-muted-foreground">Use as setas do mês no topo para ver outros meses. Poupança e investimentos não entram nas despesas.</p>
      </>
    );
  };

  const salarios = () => {
    const ano = String(mes.getFullYear());
    const pessoas = pessoasDosSalarios(estado.salaries, estado.profile.members);
    const doAno = estado.salaries[ano];
    const valor = (p: string, i: number) => doAno?.[p]?.[i] ?? 0;
    const totais = pessoas.map((p) => Array.from({ length: 12 }, (_, i) => valor(p, i)).reduce((s, v) => s + v, 0));
    const global = totais.reduce((s, v) => s + v, 0);
    const gravar = (pessoa: string, i: number, texto: string) => {
      const v = Math.max(0, lerValor(texto) || 0);
      mudarEstado((s) => {
        const atual = s.salaries[ano] ?? Object.fromEntries(pessoas.map((p) => [p, Array(12).fill(0)]));
        const lista = [...(atual[pessoa] ?? Array(12).fill(0))];
        lista[i] = v;
        return { ...s, salaries: { ...s.salaries, [ano]: { ...atual, [pessoa]: lista } } };
      });
    };
    return (
      <>
        <div className="view-heading"><p className="eyebrow">Vencimentos</p><h2>Salários {ano}</h2></div>
        <section className="summary-grid">
          {pessoas.map((p, k) => <article key={p}><span>Total {p}</span><strong className="amount-positive">{eur(totais[k]!)}</strong></article>)}
          <article><span>Total global</span><strong className="summary-blue">{eur(global)}</strong></article>
          <article><span>Média mensal</span><strong>{eur(global / 12)}</strong></article>
        </section>
        <section className="salary-table-wrap">
          <table className="salary-table">
            <thead><tr><th>Mês</th>{pessoas.map((p) => <th key={p}>{p}</th>)}<th>Total</th></tr></thead>
            <tbody>
              {MESES.map((nomeMes, i) => (
                <tr key={nomeMes}>
                  <th scope="row">{nomeMes}</th>
                  {pessoas.map((p) => (
                    <td key={p}>
                      <input
                        key={`${ano}-${p}-${i}-${valor(p, i)}`} inputMode="decimal" aria-label={`Salário de ${p} em ${nomeMes}`}
                        defaultValue={valor(p, i) ? String(valor(p, i)).replace('.', ',') : ''} placeholder="0,00"
                        onBlur={(e) => gravar(p, i, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      />
                    </td>
                  ))}
                  <td className="salary-total">{eur(pessoas.reduce((s, p) => s + valor(p, i), 0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><th>Total</th>{totais.map((t, k) => <td key={pessoas[k]}>{eur(t)}</td>)}<td>{eur(global)}</td></tr></tfoot>
          </table>
        </section>
        <p className="text-xs text-muted-foreground">Toque num valor para o editar. Use as setas no topo para mudar de ano.</p>
      </>
    );
  };

  return (
    <main className="detail-view">
      <Segmentado
        valor={seccao} rotulo="Secção do resumo" aoMudar={mudarSeccao} classe="ffseg-2l"
        opcoes={[{ valor: 'resumo', rotulo: 'Resumo' }, { valor: 'recorrentes', rotulo: 'Recorrentes' }, { valor: 'anuais', rotulo: 'Despesas anuais' }, { valor: 'fecho', rotulo: 'Fecho de mês' }, { valor: 'salarios', rotulo: 'Salários' }]}
      />
      <AnoEmRevista estado={estado} ano={mes.getFullYear()} ocultos={ocultos} aberto={revista} fechar={() => setRevista(false)} />
      {seccao === 'resumo' ? resumo() : null}
      {seccao === 'recorrentes' ? recorrentes() : null}
      {seccao === 'anuais' ? despesasAnuaisSeccao() : null}
      {seccao === 'fecho' ? fecho() : null}
      {seccao === 'salarios' ? salarios() : null}
    </main>
  );
}
