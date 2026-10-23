import { agendado, anoMes, type Estado, MESES, type Movimento, rendimentoDoMes } from '../dados';
import { aspetosCategorias, simplificar } from '../movimentos/categorias';
import { LinhaMovimento } from '../movimentos/Movimento';
import { diaEMes } from '../movimentos/regras';
import { Botao } from '../ui/Botao';
import { formatarEuros, formatarPercentagem, MOEDA } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { fraseDoDia } from './frase';

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
}

export function Principal({ estado, mes, ocultos, lista, mudarLista, vibrar, abrirMovimento, todos = estado.transactions }: Props) {
  const { accounts: contas, transactions: movimentos } = estado;
  const hoje = new Date();
  const eur = (v: number) => formatarEuros(v, ocultos);
  const rendimento = rendimentoDoMes(estado, mes);
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

  return (
    <main className="finance-grid">
      <section className="ffhero" aria-label="Rendimento mensal">
        <div className="ffhero-ring">
          <p>Rendimento mensal</p>
          <strong className="ffhero-valor">{eur(rendimento.valor)}</strong>
          {rendimento.variacao !== null ? (
            <span className={desceu ? 'amount-negative' : 'amount-positive'}>
              <Icone nome={desceu ? 'trending-down' : 'trending-up'} />{' '}{formatarPercentagem(rendimento.variacao)}
            </span>
          ) : null}
        </div>
      </section>
      {frase ? (
        <section className="ffdica" aria-label="Observação do dia"><Icone nome="bot" /><p>{frase}</p></section>
      ) : null}
      <section className="transactions-panel">
        <div className="section-heading">
          <h2>Transações recentes</h2>
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
          <p className="tx-search-empty">
            {lista.expandida && termo ? `Sem resultados para «${lista.pesquisa.trim()}» em ${MESES[mes.getMonth()]}.`
              : lista.expandida && contaFiltro !== 'all' ? `Sem movimentos nesta conta em ${MESES[mes.getMonth()]}.`
                : `Sem movimentos em ${MESES[mes.getMonth()]}.`}
          </p>
        ) : (
          <>
            {lista.expandida && agendados.length ? (
              <>
                <h3 className="ffgrupo">Agendados</h3>
                <div className="transaction-list ffagendados">{agendados.map(linha)}</div>
                {visiveis.length ? <h3 className="ffgrupo">Até hoje</h3> : null}
              </>
            ) : null}
            <div className="transaction-list">{visiveis.map(linha)}</div>
            {!lista.expandida && agendados.length ? (
              <button type="button" className="ffagendados-resumo" onClick={() => mudarLista({ expandida: true, pesquisa: '', conta: 'all' })}>
                <Icone nome="calendar-clock" />
                <span>
                  {agendados.length === 1 ? '1 agendado' : `${agendados.length} agendados`} · próximo: {agendados[0]!.title.trim()}, {diaEMes(agendados[0]!.date)}
                </span>
              </button>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
