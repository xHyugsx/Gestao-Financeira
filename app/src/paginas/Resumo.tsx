import { useEffect, useRef, useState } from 'react';
import { anoMes, type Estado, gastos, inicioDoMes, MESES, type Movimento, type Salarios } from '../dados';
import { aspetoDoMovimento, aspetosCategorias } from '../movimentos/categorias';
import { ArtigoMovimento } from '../movimentos/Movimento';
import { reporMes } from '../movimentos/recorrentes';
import { lerValor } from '../movimentos/regras';
import { Botao } from '../ui/Botao';
import { formatarEuros, formatarPercentagem } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { RoboVazio } from '../ui/RoboVazio';
import { Segmentado } from '../ui/Segmentado';
import type { NomeIcone } from '../ui/icones';
import { vibrarCurto } from '../ui/vibracao';
import { AnoEmRevista } from './AnoEmRevista';
import { calorDoMes, categoriasDoMes, CORES, doMes, fechoDoMes, maiorSequencia, receitas, variacao } from './calculos';
import { type DespesaAnual, despesasAnuais, estadoAnual, movimentoDoPagamento, renovar, totalProximos12, valorAnual } from './anuais';
import { type EstadoRecorrente, recorrentesDoMes } from './subscricoes';

export type SeccaoResumo = 'resumo' | 'recorrentes' | 'anuais' | 'fecho' | 'salarios';
export type PeriodoResumo = 'mes' | 'trimestre' | 'ano';

const anoMesInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const SECCOES: { valor: SeccaoResumo; rotulo: string }[] = [
  { valor: 'resumo', rotulo: 'Resumo' }, { valor: 'recorrentes', rotulo: 'Recorrentes' }, { valor: 'anuais', rotulo: 'Despesas anuais' },
  { valor: 'fecho', rotulo: 'Fecho do Mês' }, { valor: 'salarios', rotulo: 'Salários' },
];
const ESTADOS: { estado: EstadoRecorrente; rotulo: string }[] = [
  { estado: 'atrasado', rotulo: 'Atrasado' }, { estado: 'por pagar', rotulo: 'Por pagar' }, { estado: 'por confirmar', rotulo: 'Por confirmar' },
  { estado: 'agendado', rotulo: 'Agendado' }, { estado: 'pago', rotulo: 'Pago' }, { estado: 'saltado', rotulo: 'Saltado' },
];
const COR_PESSOA = ['azul', 'rosa', 'cyan', 'amber', 'emerald'];
const reduzMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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


/** Ícone colorido (mesmo aspeto dos ícones das categorias na Análise). */
const IconeCor = ({ nome, tom }: { nome: NomeIcone; tom: string }) => (
  <span className="ffcat-ic" style={{ '--c': CORES[tom] ?? tom } as React.CSSProperties} aria-hidden="true"><Icone nome={nome} /></span>
);

export function Resumo({ estado, mes, ocultos, seccao, mudarSeccao, periodo, mudarPeriodo, mudarEstado, abrirMovimento = () => {}, todos = estado.transactions }: Props) {
  const [revista, setRevista] = useState(false);
  const [anualVariavel, setAnualVariavel] = useState(false);
  const chips = useRef<HTMLElement>(null);
  const eur = (v: number) => formatarEuros(v, ocultos);
  const movimentos = estado.transactions;
  const hoje = new Date();
  const doMesAtual = doMes(movimentos, mes);
  const gasto = gastos(doMesAtual), gastoAnterior = gastos(doMes(movimentos, inicioDoMes(mes, -1)));
  const recebido = receitas(doMesAtual);
  const evolucao = variacao(gasto, gastoAnterior);
  const categorias = categoriasDoMes(estado, mes, 'despesas');
  const maior = categorias[0];
  const anuais = despesasAnuais(estado.annualExpenses);
  const nomeMes = MESES[mes.getMonth()]!, mesAnterior = MESES[inicioDoMes(mes, -1).getMonth()]!;

  // o separador escolhido fica sempre à vista na linha que desliza
  useEffect(() => {
    const c = chips.current, b = c?.querySelector<HTMLElement>('.ffchip-on');
    if (!c || !b) return;
    c.scrollTo?.({ left: b.offsetLeft - (c.clientWidth - b.offsetWidth) / 2, behavior: reduzMovimento() ? 'auto' : 'smooth' });
  }, [seccao]);

  const resumo = () => {
    const calor = calorDoMes(movimentos, mes, hoje);
    const seguidos = maiorSequencia(calor.semGastos);
    // categoria que mais pesou na subida (ou na descida) face ao mês anterior
    const destaque = gastoAnterior > 0 && evolucao !== 0
      ? [...categorias].sort((a, b) => (evolucao > 0 ? (b.amount - b.anterior) - (a.amount - a.anterior) : (a.amount - a.anterior) - (b.amount - b.anterior)))[0]
      : undefined;
    const mudou = destaque && (evolucao > 0 ? destaque.amount > destaque.anterior : destaque.amount < destaque.anterior) ? destaque : undefined;
    const rotulo = periodo === 'mes' ? maiuscula(nomeMes) : periodo === 'trimestre' ? '3 meses' : String(mes.getFullYear());
    return (
      <>
        <button type="button" className="ffrev-abrir" onClick={() => setRevista(true)}>
          <span className="ffrev-ic"><Icone nome="gift" /></span>
          <span className="ffrev-txt"><span className="ffrev-stories" aria-hidden="true"><i /><i /><i /><i /><i /></span><strong>Ano em revista {mes.getFullYear()}</strong><small>O teu ano em números, ecrã a ecrã</small></span>
        </button>
        <Segmentado
          valor={periodo} rotulo="Período do resumo" aoMudar={mudarPeriodo}
          opcoes={[{ valor: 'mes', rotulo: 'Este mês' }, { valor: 'trimestre', rotulo: 'Últimos 3 meses' }, { valor: 'ano', rotulo: 'Este ano' }]}
        />
        <section className="ffresumo-mes ffres-mes" aria-label="Resumo do mês">
          <p className="ffbloco-rot">{rotulo} em números</p>
          <div className="ffduas">
            <div><p>Gastos</p><strong className="amount-negative ffres-gastos">{eur(gasto)}</strong></div>
            <div><p>Receitas</p><strong className="amount-positive ffres-receitas">{eur(recebido)}</strong></div>
          </div>
          {gasto || gastoAnterior ? (
            <div className="ffres-linha">
              {gastoAnterior > 0 ? (
                <span className={`ffhero-var ${evolucao > 0 ? 'amount-negative' : 'amount-positive'}`}>{`${evolucao > 0 ? '↑' : evolucao < 0 ? '↓' : '='} ${formatarPercentagem(evolucao)} vs ${mesAnterior}`}</span>
              ) : <span />}
              {maior && maior.amount > 0 ? <small>{`${Math.round(maior.share)}% em ${maior.name}`}</small> : null}
            </div>
          ) : <p className="ffres-vazio">Ainda não há movimentos registados neste mês.</p>}
        </section>
        {gasto > 0 ? (
          <section className="ffcartao ffideias" aria-label="O que se destaca">
            <p className="ffbloco-rot">O que se destaca</p>
            {gastoAnterior > 0 ? (
              <div className="ffideia">
                <IconeCor nome={evolucao > 0 ? 'trending-up' : 'trending-down'} tom={evolucao > 0 ? 'var(--despesa)' : 'var(--positive)'} />
                <p>
                  {evolucao === 0 ? <>Os gastos estão <b>iguais</b> aos de {mesAnterior}.</>
                    : <>Os gastos <b>{evolucao > 0 ? 'aumentaram' : 'diminuíram'} {formatarPercentagem(evolucao)}</b> face a {mesAnterior}</>}
                  {mudou ? <> — sobretudo em <b>{mudou.name}</b> ({mudou.anterior ? `${mudou.amount > mudou.anterior ? '+' : '−'}${formatarPercentagem(variacao(mudou.amount, mudou.anterior))}` : 'nova'}).</> : evolucao ? '.' : null}
                </p>
              </div>
            ) : null}
            {maior && maior.amount > 0 ? (
              <div className="ffideia">
                <IconeCor nome={maior.icone} tom={maior.tone} />
                <p>A maior categoria é <b>{maior.name}: {eur(maior.amount)}</b> ({Math.round(maior.share)}% dos gastos).</p>
              </div>
            ) : null}
            {anoMes(mes) <= anoMes(hoje) ? (
              <div className="ffideia">
                <IconeCor nome="calendar-days" tom="green" />
                <p><b>{calor.semGastos.length} {calor.semGastos.length === 1 ? 'dia' : 'dias'} sem despesas</b>{seguidos > 1 ? <> — o melhor foram {seguidos} seguidos.</> : '.'}</p>
              </div>
            ) : null}
          </section>
        ) : null}
      </>
    );
  };

  const recorrentes = () => {
    const r = recorrentesDoMes(todos, mes, hoje);
    const total = r.pago + r.falta;
    const aspetos = aspetosCategorias(estado, mes);
    const soma = (...e: EstadoRecorrente[]) => r.lista.filter((i) => e.includes(i.estado)).reduce((s, i) => s + i.valor, 0);
    const partes = [
      { rotulo: 'Pago', valor: r.pago, cls: 'pago' }, { rotulo: 'Por pagar', valor: soma('por pagar', 'atrasado'), cls: 'por-pagar' },
      { rotulo: 'Por confirmar', valor: soma('por confirmar'), cls: 'por-confirmar' }, { rotulo: 'Agendado', valor: soma('agendado'), cls: 'agendado' },
    ].filter((x) => x.valor > 0);
    return (
      <>
        {r.lista.length ? (
          <section className="ffresumo-mes ffrec-cartao" aria-label="Recorrentes do mês">
            <p className="ffbloco-rot">Recorrentes de {nomeMes}</p>
            <p className="ffrec-total"><strong className="ffresumo-valor ffrec-v-pago">{eur(r.pago)}</strong><span>de {eur(total)}</span></p>
            {total > 0 ? <div className="ffpilha" aria-hidden="true">{partes.map((x) => <i key={x.cls} className={`ffrec-parte-${x.cls}`} style={{ flex: x.valor }} />)}</div> : null}
            <div className="ffrec-leg">
              {partes.map((x) => <span key={x.cls}><i className={`ffrec-parte-${x.cls}`} />{x.rotulo} {x.cls === 'por-confirmar' ? '≈ ' : ''}{eur(x.valor)}</span>)}
            </div>
            <div className="ffmedias"><p>Falta pagar <strong className="ffrec-v-falta">{eur(r.falta)}</strong></p></div>
          </section>
        ) : null}
        {r.lista.length ? ESTADOS.map(({ estado: e, rotulo }) => {
          const doEstado = r.lista.filter((i) => i.estado === e);
          if (!doEstado.length) return null;
          return (
            <section key={e} className={`ffrec-grupo ffrec-grupo-${e.replace(' ', '-')}`}>
              <p className="ffgrupo"><span>{rotulo}</span><span>{doEstado.length}</span></p>
              <div className="transaction-list">
                {doEstado.map((i) => (i.estado === 'saltado' ? (
                  // Mês saltado («só este mês»): não abre o movimento; «Repor» volta a pô-lo nas contas
                  <article key={`${i.titulo}-${i.movimento.id}`} className="transaction-row ffrec-saltado">
                    <div className="transaction-main">
                      <IconeCor nome="calendar-clock" tom="outras" />
                      <div className="min-w-0"><h3>{i.titulo}</h3><p>Dia {i.dia} · {i.periodicidade}</p></div>
                    </div>
                    <div className="ffrec-dir">
                      <Botao type="button" tamanho="pequeno" variante="ghost" onClick={() => mudarEstado((s) => ({ ...s, transactions: reporMes(s.transactions, i.movimento) }))}>Repor</Botao>
                      <small className="ffest ffest-saltado">Saltado</small>
                    </div>
                  </article>
                ) : (
                  <ArtigoMovimento key={`${i.titulo}-${i.movimento.id}`} movimento={i.movimento} aoAbrir={abrirMovimento}>
                    <div className="transaction-main">
                      {(() => { const a = aspetoDoMovimento(i.movimento, aspetos); return <IconeCor nome={a?.icone ?? 'calendar-clock'} tom={a?.tone ?? 'violet'} />; })()}
                      <div className="min-w-0">
                        <h3>{i.titulo}</h3>
                        <p>Dia {i.dia} · {i.periodicidade}{i.subiu !== null ? <span className="ffrec-subiu"> · ↑ {formatarPercentagem(i.subiu)}</span> : null}</p>
                      </div>
                    </div>
                    <div className="ffrec-dir">
                      <strong className={i.estimado ? 'ffrec-estimado' : undefined}>{i.valor ? `${i.estimado ? '≈ ' : ''}${eur(i.valor)}` : 'A definir'}</strong>
                      <small className={`ffest ffest-${i.estado.replace(' ', '-')}`}>{i.estado === 'por confirmar' ? 'Confirmar valor' : rotulo}</small>
                    </div>
                  </ArtigoMovimento>
                )))}
              </div>
            </section>
          );
        }) : <div className="vet-empty ffvazio-linha"><RoboVazio pequeno />Sem recorrentes neste mês. Marque um movimento como «Recorrente» para aparecer aqui.</div>}
        {r.anual > 0 ? (
          <section className="ffcal-resumos ffrec-anual">
            <article className="ffbloco"><p className="ffbloco-rot">Custo anual</p><strong className="ffbloco-val ffrec-v-custo">{eur(r.anual)}</strong><small>se nada mudar</small></article>
            <article className="ffbloco"><p className="ffbloco-rot">Por mês</p><strong className="ffbloco-val">{eur(r.anual / 12)}</strong><small>em média</small></article>
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
    // os próximos 12 meses em pontos: o tamanho do ponto é o valor previsto nesse mês
    const meses12 = Array.from({ length: 12 }, (_, k) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + k, 1);
      const v = anuais.filter((e) => e.year === d.getFullYear() && e.month === d.getMonth() + 1).reduce((s, e) => s + valorAnual(e, movimentos), 0);
      return { k, nome: MESES[d.getMonth()]!.slice(0, 3), v };
    });
    const maximo = Math.max(1, ...meses12.map((x) => x.v));
    const mesesAte = (e: DespesaAnual) => (e.year - hoje.getFullYear()) * 12 + e.month - 1 - hoje.getMonth();
    const linha = (e: DespesaAnual) => {
      const estadoE = estadoAnual(e, hoje), cls = estadoE.replace(' ', '-'), faltam = mesesAte(e);
      return (
        <article key={e.id} className={`transaction-row ffanual ffanual-${cls}`}>
          <div className="transaction-main">
            <IconeCor nome="calendar-clock" tom={estadoE === 'prevista' ? 'cyan' : 'red'} />
            <div className="min-w-0">
              <h3>{e.name}</h3>
              <p>{MESES[e.month - 1]} {e.year}{estadoE === 'prevista' && faltam > 0 && faltam <= 12 ? ` · daqui a ${faltam} ${faltam === 1 ? 'mês' : 'meses'}` : ''}</p>
            </div>
          </div>
          <div className="ffanual-dir">
            {e.variable
              ? <strong className="amount-negative ffanual-estimativa">{valorAnual(e, movimentos) ? `≈ −${eur(valorAnual(e, movimentos))}` : '—'}</strong>
              : <strong className="amount-negative">−{eur(e.value)}</strong>}
            {estadoE !== 'prevista' ? <small className={`ffest ffanual-estado ffanual-estado-${cls}`}>{ROTULO_ANUAL[estadoE]}</small> : null}
            {e.variable ? <small className="ffest ffest-por-confirmar ffanual-variavel">Valor a definir</small> : null}
          </div>
          <div className="ffanual-botoes">
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
    };
    const porPagar = ordenadas.filter((e) => estadoAnual(e, hoje) !== 'prevista'), aSeguir = ordenadas.filter((e) => estadoAnual(e, hoje) === 'prevista');
    return (
      <>
        <section className="ffresumo-mes ffanu-cartao" aria-label="Despesas anuais dos próximos 12 meses">
          <div className="ffanu-topo">
            <div><p className="ffbloco-rot">Próximos 12 meses</p><strong className="ffresumo-valor ffanu-total">{eur(total)}</strong></div>
            <div className="ffanu-reserva-box"><p className="ffbloco-rot">Reservar/mês</p><strong className="ffanu-reserva">{eur(total / 12)}</strong></div>
          </div>
          <div className="ffanu-meses" aria-hidden="true">
            {meses12.map((x) => (
              <span key={x.k} className={`${x.v ? '' : 'ffanu-vazio'}${x.k === 0 ? ' ffanu-hoje' : ''}`}>
                <i style={x.v ? { '--t': `${0.5 + (x.v / maximo) * 1.4}rem` } as React.CSSProperties : undefined} />{x.nome}
              </span>
            ))}
          </div>
        </section>
        {porPagar.length ? <><p className="ffgrupo"><span>Por pagar</span><span>{porPagar.length}</span></p><div className="transaction-list ffanu-lista">{porPagar.map(linha)}</div></> : null}
        {aSeguir.length ? <><p className="ffgrupo"><span>A seguir</span><span>{aSeguir.length}</span></p><div className="transaction-list ffanu-lista">{aSeguir.map(linha)}</div></> : null}
        {!ordenadas.length ? <div className="transaction-list"><div className="vet-empty ffvazio-linha"><RoboVazio pequeno />Sem despesas anuais registadas.</div></div> : null}
        <form
          className="vet-breakdown ffanu-form"
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
    // cascata: rendimento + outras receitas − despesas = resultado
    const entradas = f.salario + f.outras;
    const passos: { rotulo: string; de: number; ate: number; texto: string; cls: string }[] = [
      { rotulo: 'Rendimento', de: 0, ate: f.salario, texto: eur(f.salario), cls: 'rend' },
      { rotulo: 'Outras receitas', de: f.salario, ate: entradas, texto: `+${eur(f.outras)}`, cls: 'outras' },
      { rotulo: 'Despesas', de: entradas - f.despesas, ate: entradas, texto: `−${eur(f.despesas)}`, cls: 'desp' },
      { rotulo: 'Resultado', de: Math.min(0, f.saldo), ate: Math.max(0, f.saldo), texto: eur(f.saldo), cls: f.saldo >= 0 ? 'res-pos' : 'res-neg' },
    ];
    const baixo = Math.min(0, ...passos.map((x) => x.de)), alto = Math.max(1, ...passos.map((x) => x.ate)), escala = alto - baixo || 1;
    const linhas: [string, number, string][] = [
      ['Despesas', f.despesas, 'despesa'], ['↳ das quais combustível', f.combustivel, ''], ['Poupança', f.poupanca, 'poupanca'], ['Investimentos', f.investimentos, 'invest'],
    ];
    return (
      <>
        <section className="ffresumo-mes fffecho-cartao" aria-label="Fecho do mês">
          <p className="ffbloco-rot">Fecho de {nomeMes} {mes.getFullYear()}</p>
          <strong className={`ffresumo-valor fffecho-saldo ${f.saldo >= 0 ? 'amount-positive' : 'amount-negative'}`}>{eur(f.saldo)}</strong>
          <p className="fffecho-sub">antes de poupança e investimentos · <b className={f.saldo >= 0 ? 'amount-positive' : 'amount-negative'}>{f.saldo >= 0 ? 'mês positivo' : 'mês negativo'}</b></p>
          <div className="ffcascata" role="img" aria-label={`Rendimento ${eur(f.salario)}, outras receitas ${eur(f.outras)}, despesas ${eur(f.despesas)}, resultado ${eur(f.saldo)}`}>
            {passos.map((x, k) => (
              <div key={x.cls} style={{ '--b': `${((x.de - baixo) / escala) * 100}%`, '--h': `${((x.ate - x.de) / escala) * 100}%`, '--k': k } as React.CSSProperties}>
                <span className="ffcascata-area"><i className={`ffcascata-${x.cls}`} /><b>{x.texto}</b></span>
                <small>{x.rotulo}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="ffcartao fffecho-lista" aria-label="Para onde foi">
          <p className="ffbloco-rot">Para onde foi</p>
          {linhas.map(([rotulo, v, cls]) => (
            <div key={rotulo} className={cls ? '' : 'fffecho-sub-linha'}><span>{cls ? <i className={`fffecho-${cls}`} /> : null}{rotulo}</span><strong>{eur(v)}</strong></div>
          ))}
        </section>
        <p className="fffecho-nota">Poupança e investimentos não contam como despesa.</p>
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
    const comValor = Array.from({ length: 12 }, (_, i) => pessoas.some((p) => valor(p, i) > 0)).filter(Boolean).length;
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
        <section className="ffresumo-mes ffsal-cartao" aria-label={`Salários ${ano}`}>
          <div className="ffanu-topo">
            <div><p className="ffbloco-rot">Salários {ano}</p><strong className="ffresumo-valor ffsal-total">{eur(global)}</strong></div>
            <div className="ffanu-reserva-box"><p className="ffbloco-rot">Média/mês</p><strong className="ffsal-media">{eur(comValor ? global / comValor : 0)}</strong></div>
          </div>
        </section>
        {pessoas.length ? (
          <section className="ffsal-pessoas">
            {pessoas.map((p, k) => {
              const cor = CORES[COR_PESSOA[k % COR_PESSOA.length]!]!, valores = Array.from({ length: 12 }, (_, i) => valor(p, i)), maximo = Math.max(1, ...valores);
              return (
                <article key={p} className="ffbloco ffsal-pessoa" style={{ '--c': cor } as React.CSSProperties}>
                  <p className="ffbloco-rot"><i aria-hidden="true" />{p}</p>
                  <strong className="ffbloco-val">{eur(totais[k]!)}</strong>
                  <span className="ffsal-spark" aria-hidden="true">{valores.map((v, i) => <i key={i} className={v ? '' : 'ffsal-zero'} style={{ height: `${v ? 15 + (v / maximo) * 85 : 12}%` }} />)}</span>
                </article>
              );
            })}
          </section>
        ) : null}
        <section className="salary-table-wrap">
          <table className="salary-table">
            <thead><tr><th>Mês</th>{pessoas.map((p) => <th key={p}>{p}</th>)}<th>Total</th></tr></thead>
            <tbody>
              {MESES.map((nomeM, i) => (
                <tr key={nomeM} className={i === mes.getMonth() ? 'ffsal-atual' : undefined}>
                  <th scope="row">{maiuscula(nomeM)}</th>
                  {pessoas.map((p) => (
                    <td key={p}>
                      <input
                        key={`${ano}-${p}-${i}-${valor(p, i)}`} inputMode="decimal" aria-label={`Salário de ${p} em ${nomeM}`}
                        defaultValue={valor(p, i) ? String(valor(p, i)).replace('.', ',') : ''} placeholder="—"
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
        <p className="fffecho-nota">Toque num valor para o editar. Use as setas no topo para mudar de ano.</p>
      </>
    );
  };

  return (
    <main className="detail-view ffresumo">
      <nav className="ffchips" ref={chips} aria-label="Secção do resumo">
        {SECCOES.map((o) => (
          <button
            key={o.valor} type="button" className={`ffchip${seccao === o.valor ? ' ffchip-on' : ''}`} aria-pressed={seccao === o.valor}
            onClick={() => { if (o.valor !== seccao) vibrarCurto(); mudarSeccao(o.valor); }}
          >{o.rotulo}</button>
        ))}
      </nav>
      <AnoEmRevista estado={estado} ano={mes.getFullYear()} ocultos={ocultos} aberto={revista} fechar={() => setRevista(false)} />
      {seccao === 'resumo' ? resumo() : null}
      {seccao === 'recorrentes' ? recorrentes() : null}
      {seccao === 'anuais' ? despesasAnuaisSeccao() : null}
      {seccao === 'fecho' ? fecho() : null}
      {seccao === 'salarios' ? salarios() : null}
    </main>
  );
}
