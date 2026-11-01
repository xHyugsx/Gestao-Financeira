import { agendado, anoMes, dia, type Estado, gastos, inicioDoMes, MESES, mesDoRendimento, type Movimento, rendimentoDoMes } from '../dados';
import { aspetosCategorias, simplificar } from '../movimentos/categorias';
import { LinhaMovimento } from '../movimentos/Movimento';
import { porConfirmar } from '../movimentos/recorrentes';
import { diaEMes } from '../movimentos/regras';
import { Botao } from '../ui/Botao';
import { formatarEuros, formatarPercentagem, MOEDA } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { RoboVazio } from '../ui/RoboVazio';
import { calorDoMes } from './calculos';
import { fraseDoDia } from './frase';

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const dataDe = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

/** Estado de um dia para o ponto de calor: nível 1–4 (verde → vermelho), sem despesas ou futuro (mesma escala do Calendário). */
type Ponto = 'q1' | 'q2' | 'q3' | 'q4' | 'sem' | 'futuro';

export interface ListaMovimentos {
  expandida: boolean;
  pesquisa: string;
  conta: string;
}

interface Props {
  estado: Estado;
  /** 1.º dia do mês selecionado. */
  mes: Date;
  ocultos: boolean;
  lista: ListaMovimentos;
  mudarLista: (l: ListaMovimentos) => void;
  vibrar: (padrao: number | number[]) => void;
  abrirMovimento: (m: Movimento) => void;
  /** Todos os movimentos, com as cópias saltadas (a frase do dia precisa delas para os recorrentes). */
  todos?: Movimento[];
  /** Abre o Jarvis (tocar na frase do dia). */
  abrirJarvis?: () => void;
}

export function Principal({ estado, mes, ocultos, lista, mudarLista, vibrar, abrirMovimento, todos = estado.transactions, abrirJarvis = () => {} }: Props) {
  const { accounts: contas, transactions: movimentos } = estado;
  const hoje = new Date();
  const eur = (v: number) => formatarEuros(v, ocultos);
  // No dia do ordenado, o círculo passa a mostrar o rendimento do mês seguinte (salários deste mês)
  const mesRendimento = mesDoRendimento(estado, mes, hoje);
  const rendimento = rendimentoDoMes(estado, mesRendimento);
  const rotuloRendimento = anoMes(mesRendimento) === anoMes(mes) ? 'Rendimento mensal' : `Rendimento de ${MESES[mesRendimento.getMonth()]}`;
  const desceu = rendimento.anterior ? rendimento.valor < rendimento.anterior : false;
  const frase = !ocultos && anoMes(mes) === anoMes(hoje) ? fraseDoDia({ transactions: todos, annualExpenses: estado.annualExpenses }, hoje) : null;

  const termo = simplificar(lista.pesquisa.trim());
  const contaFiltro = lista.conta === 'all' || contas.some((c) => c.id === lista.conta) ? lista.conta : 'all';
  const passaPesquisa = (m: Movimento) => !termo
    || simplificar(`${m.title} ${m.detail} ${m.note || ''} ${MOEDA.format(Math.abs(m.amount || m.transferValue || 0))}`).includes(termo);
  const passaConta = (m: Movimento) => contaFiltro === 'all'
    || (contaFiltro === 'principal' ? !m.account || m.account === 'principal'
      : contaFiltro === 'revolut' ? m.account === 'revolut' || m.revolut?.holder === 'Conjunta'
        : m.account === contaFiltro);
  // Só os movimentos do mês escolhido nas setas (por omissão, o mês atual), também em «Ver todas» e na pesquisa.
  // Mais recentes primeiro (no mesmo dia, o último registado primeiro); a app atual mostrava pela ordem de registo.
  // Os agendados (data futura) ficam num grupo à parte, do mais próximo para o mais distante, para não taparem os recentes.
  const doMes = movimentos.filter((m) => (m.date || '').startsWith(anoMes(mes)));
  const porData = [...doMes].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const base = lista.expandida ? porData.filter((m) => passaPesquisa(m) && passaConta(m)) : porData;
  const agendados = base.filter((m) => agendado(m, hoje)).reverse();
  const ateHoje = base.filter((m) => !agendado(m, hoje));
  const visiveis = lista.expandida ? ateHoje : ateHoje.slice(0, 3);
  const linha = (m: Movimento) => <LinhaMovimento key={m.id} movimento={m} contas={contas} aspetos={aspetos} ocultos={ocultos} aoAbrir={abrirMovimento} />;
  const aspetos = aspetosCategorias(estado, mes);

  // Pontos de calor por dia (gasto sem poupança nem investimentos; os níveis são os do Calendário)
  const calores = new Map<string, ReturnType<typeof calorDoMes>>();
  const calorDe = (d: Date) => {
    const k = anoMes(d);
    if (!calores.has(k)) calores.set(k, calorDoMes(movimentos, inicioDoMes(d, 0), hoje));
    return calores.get(k)!;
  };
  const hojeIso = dia(hoje);
  const pontoDe = (d: Date): Ponto => {
    if (dia(d) > hojeIso) return 'futuro';
    const n = calorDe(d).nivel[d.getDate()] ?? 0;
    return n ? (`q${n}` as Ponto) : 'sem';
  };
  const gastoDoDia = (d: Date) => { const c = calorDe(d); return (dia(d) > hojeIso ? c.previsto : c.gasto)[d.getDate()] ?? 0; };
  const rotuloDia = (d: Date): [string, string] => {
    const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1), sub = `${DIAS[d.getDay()]}, ${d.getDate()}`;
    if (dia(d) === hojeIso) return ['Hoje', sub];
    if (dia(d) === dia(ontem)) return ['Ontem', sub];
    return [maiuscula(sub), ''];
  };
  const cabecalhoDia = (d: Date) => {
    const [titulo, sub] = rotuloDia(d), total = gastoDoDia(d);
    return (
      <div key={`d-${dia(d)}`} className="ffdia">
        <i className={`ffponto ffponto-${pontoDe(d)}`} aria-hidden="true" />
        <b>{titulo}{sub ? <small>{sub}</small> : null}</b>
        {total ? <span className="amount-negative">{eur(-total)}</span> : null}
      </div>
    );
  };
  // Lista por dia; em «Ver todas» (sem pesquisa nem filtro), os dias seguidos sem movimentos ficam numa só linha
  const ultimoDia = anoMes(mes) < anoMes(hoje) ? new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate() : anoMes(mes) > anoMes(hoje) ? 0 : hoje.getDate();
  const comVazios = lista.expandida && !termo && contaFiltro === 'all';
  const porDia = new Map<string, Movimento[]>();
  for (const m of visiveis) porDia.set(m.date, [...(porDia.get(m.date) ?? []), m]);
  const linhasPorDia: React.ReactNode[] = [];
  if (comVazios) {
    let vazio: number[] = [];
    const fecharVazio = () => {
      if (!vazio.length) return;
      const a = vazio[vazio.length - 1]!, b = vazio[0]!, d = new Date(mes.getFullYear(), mes.getMonth(), b);
      linhasPorDia.push(
        <div key={`v-${a}`} className="ffdia ffdia-vazio">
          <i className="ffponto ffponto-sem" aria-hidden="true" />
          <b>{vazio.length === 1 ? rotuloDia(d)[0] : `Dias ${a} a ${b}`}<small>sem despesas</small></b>
        </div>,
      );
      vazio = [];
    };
    for (let n = ultimoDia; n >= 1; n--) {
      const d = new Date(mes.getFullYear(), mes.getMonth(), n), l = porDia.get(dia(d));
      if (!l) { vazio.push(n); continue; }
      fecharVazio();
      linhasPorDia.push(cabecalhoDia(d), ...l.map(linha));
    }
    fecharVazio();
  } else {
    for (const [iso, l] of porDia) linhasPorDia.push(cabecalhoDia(dataDe(iso)), ...l.map(linha));
  }

  // Blocos: gastos do mês com os pontos da semana e o próximo agendado
  const gastoMes = gastos(doMes);
  const referencia = anoMes(mes) === anoMes(hoje) ? hoje : anoMes(mes) < anoMes(hoje) ? new Date(mes.getFullYear(), mes.getMonth() + 1, 0) : mes;
  const segunda = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate() - ((referencia.getDay() + 6) % 7));
  const semana = Array.from({ length: 7 }, (_, i) => new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + i));
  const agendadosMes = porData.filter((m) => agendado(m, hoje)).reverse();
  const proximo = agendadosMes[0];
  const valorAgendado = (m: Movimento) => (porConfirmar(m) ? 'A definir' : eur(Math.abs(m.revolut ? m.transferValue || 0 : m.amount || m.transferValue || 0)));

  return (
    <main className="finance-grid ffprincipal">
      <section className="ffhero ffhero-orbita" aria-label={rotuloRendimento}>
        <div className="ffhero-txt">
          <p>{rotuloRendimento}</p>
          <strong className="ffhero-valor">{eur(rendimento.valor)}</strong>
          {rendimento.variacao !== null ? (
            <span className={`ffhero-var ${desceu ? 'amount-negative' : 'amount-positive'}`}>
              <Icone nome={desceu ? 'trending-down' : 'trending-up'} />{' '}{formatarPercentagem(rendimento.variacao)} vs {MESES[inicioDoMes(mesRendimento, -1).getMonth()]}
            </span>
          ) : null}
        </div>
        <svg className="ffhero-anel" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="ffanel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" className="ffanel-1" /><stop offset=".5" className="ffanel-2" /><stop offset="1" className="ffanel-3" />
            </linearGradient>
          </defs>
          <circle className="ffanel-fundo" cx="60" cy="60" r="46" />
          <g className="ffanel-roda"><circle className="ffanel-arco" cx="60" cy="60" r="46" /></g>
          <g className="ffanel-orbita"><ellipse cx="60" cy="60" rx="58" ry="20" transform="rotate(-25 60 60)" /><circle cx="104" cy="44" r="4" /></g>
          <circle className="ffanel-centro" cx="60" cy="60" r="20" />
          <text x="60" y="65" textAnchor="middle">{MESES[mesRendimento.getMonth()]!.slice(0, 3)}</text>
        </svg>
      </section>
      <section className="ffblocos" aria-label="Resumo do mês">
        {frase ? (
          <button type="button" className="ffdica" aria-label={`Observação do dia: ${frase} Abrir o Jarvis`} onClick={abrirJarvis}>
            <i className="ffdica-robo" aria-hidden="true" />
            <span><small>Jarvis · hoje</small><p>{frase}</p></span>
          </button>
        ) : null}
        <article className="ffbloco ffbloco-gastos">
          <p className="ffbloco-rot">{`Gastos em ${MESES[mes.getMonth()]}`}</p>
          <strong className="ffbloco-val amount-negative">{eur(gastoMes)}</strong>
          <div className="ffsemana" aria-hidden="true">
            {semana.map((d) => (
              <span key={dia(d)} className={dia(d) === hojeIso ? 'ffsemana-hoje' : undefined}>
                <i className={`ffponto ffponto-${pontoDe(d)}`} />{LETRAS[(d.getDay() + 6) % 7]}
              </span>
            ))}
          </div>
        </article>
        {proximo ? (
          <button type="button" className="ffbloco ffagendados-resumo" onClick={() => mudarLista({ expandida: true, pesquisa: '', conta: 'all' })}>
            <p className="ffbloco-rot">{agendadosMes.length === 1 ? 'Agendado' : `${agendadosMes.length} agendados`}</p>
            <strong className="ffbloco-val">{valorAgendado(proximo)}</strong>
            <small>{`${proximo.title.trim()} · ${diaEMes(proximo.date)}`}</small>
          </button>
        ) : (
          <article className="ffbloco ffbloco-sem-agenda">
            <p className="ffbloco-rot">Agendado</p>
            <strong className="ffbloco-val">—</strong>
            <small>{`Nada agendado em ${MESES[mes.getMonth()]}`}</small>
          </article>
        )}
      </section>
      <section className="transactions-panel">
        <div className="section-heading">
          <h2>Movimentos</h2>
          <Botao variante="ghost" tamanho="pequeno" onClick={() => mudarLista({ expandida: !lista.expandida, pesquisa: '', conta: 'all' })}>
            {lista.expandida ? 'Ver menos' : 'Ver todas'}
          </Botao>
        </div>
        {lista.expandida ? (
          <div className="tx-search">
            <Icone nome="search" />
            <input
              type="search" value={lista.pesquisa} onChange={(e) => mudarLista({ ...lista, pesquisa: e.target.value })}
              placeholder="Pesquisar por descrição, categoria ou valor" aria-label="Pesquisar transações"
            />
            {lista.pesquisa ? (
              <button type="button" aria-label="Limpar pesquisa" onClick={() => mudarLista({ ...lista, pesquisa: '' })}><Icone nome="x" /></button>
            ) : null}
          </div>
        ) : null}
        {lista.expandida && contas.length > 1 ? (
          <div className="ffacc-row" role="radiogroup" aria-label="Filtrar por conta">
            {[{ id: 'all', name: 'Todas' }, ...contas].map((c) => (
              <button
                key={c.id} type="button" role="radio" aria-checked={contaFiltro === c.id} className={contaFiltro === c.id ? 'on' : undefined}
                onClick={() => { mudarLista({ ...lista, conta: c.id }); vibrar(8); }}
              >{c.name}</button>
            ))}
          </div>
        ) : null}
        {!visiveis.length && !agendados.length ? (
          <div className="ffvazio">
          <RoboVazio />
          <p className="tx-search-empty">
            {lista.expandida && termo ? `Sem resultados para «${lista.pesquisa.trim()}» em ${MESES[mes.getMonth()]}.`
              : lista.expandida && contaFiltro !== 'all' ? `Sem movimentos nesta conta em ${MESES[mes.getMonth()]}.`
                : `Sem movimentos em ${MESES[mes.getMonth()]}.`}
          </p>
          </div>
        ) : (
          <>
            {lista.expandida && agendados.length ? (
              <>
                <h3 className="ffgrupo">Agendados</h3>
                <div className="transaction-list ffagendados">{agendados.map(linha)}</div>
              </>
            ) : null}
            <div className="transaction-list ffdias">{linhasPorDia}</div>
          </>
        )}
      </section>
    </main>
  );
}
