import { type Conta, type Estado, type Movimento, limiteSaldoBaixo, rendimentoDoMes, saldoDaConta, tendencia } from '../dados';
import { aspetosCategorias, simplificar } from '../movimentos/categorias';
import { LinhaMovimento } from '../movimentos/Movimento';
import { Botao } from '../ui/Botao';
import { formatarEuros, formatarPercentagem, MOEDA } from '../ui/formatos';
import { Icone } from '../ui/Icone';

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
  irPara: (pagina: string) => void;
  vibrar: (padrao: number | number[]) => void;
  emConstrucao: (oque: string) => void;
  abrirMovimento: (m: Movimento) => void;
}

const CONTAS_POR_OMISSAO: [Conta, Conta] = [{ id: 'principal', name: 'Principal', balance: 0 }, { id: 'revolut', name: 'Revolut Conjunta', balance: 0 }];

export function Principal({ estado, mes, ocultos, lista, mudarLista, irPara, vibrar, emConstrucao, abrirMovimento }: Props) {
  const { accounts: contas, transactions: movimentos } = estado;
  const hoje = new Date();
  const eur = (v: number) => formatarEuros(v, ocultos);
  const saldo = (c: Conta | undefined) => saldoDaConta(c, movimentos, hoje);
  const nivel = (c: Conta | undefined) => {
    const v = saldo(c).atual, l = limiteSaldoBaixo(c);
    return v < 0 ? ' acc-neg' : l != null && v < l ? ' acc-low' : '';
  };
  const tendenciaDe = (c: Conta | undefined) => {
    const s = saldo(c), t = tendencia(s), rotulo = s.nova ? 'início do mês' : s.mesAnterior;
    if (t === null) return <span className="account-trend">{`— vs. ${rotulo}`}</span>;
    return <span className={`account-trend ${t >= 0 ? 'account-up' : 'account-down'}`}>{`${t >= 0 ? '↑' : '↓'} ${formatarPercentagem(t)} vs. ${rotulo}`}</span>;
  };

  const principal = contas.find((c) => c.id === 'principal') ?? CONTAS_POR_OMISSAO[0];
  const revolut = contas.find((c) => c.id === 'revolut') ?? CONTAS_POR_OMISSAO[1];
  const extra = contas.filter((c) => c.id !== 'principal' && c.id !== 'revolut');
  const rendimento = rendimentoDoMes(estado, mes);
  const desceu = rendimento.anterior ? rendimento.valor < rendimento.anterior : false;

  const termo = simplificar(lista.pesquisa.trim());
  const contaFiltro = lista.conta === 'all' || contas.some((c) => c.id === lista.conta) ? lista.conta : 'all';
  const passaPesquisa = (m: Movimento) => !termo
    || simplificar(`${m.title} ${m.detail} ${m.note || ''} ${MOEDA.format(Math.abs(m.amount || m.transferValue || 0))}`).includes(termo);
  const passaConta = (m: Movimento) => contaFiltro === 'all'
    || (contaFiltro === 'principal' ? !m.account || m.account === 'principal'
      : contaFiltro === 'revolut' ? m.account === 'revolut' || m.revolut?.holder === 'Conjunta'
        : m.account === contaFiltro);
  // Mais recentes primeiro (no mesmo dia, o último registado primeiro); a app atual mostrava pela ordem de registo
  const porData = [...movimentos].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const visiveis = lista.expandida ? porData.filter((m) => passaPesquisa(m) && passaConta(m)) : porData.slice(0, 3);
  const aspetos = aspetosCategorias(estado, mes);
  const editarContas = () => emConstrucao('As definições das contas');

  return (
    <main className="finance-grid">
      <section className="ffhero" aria-label="Rendimento mensal">
        <div className="ffhero-ring">
          <p>Rendimento mensal</p>
          <strong className={desceu ? 'amount-negative' : 'amount-positive'}>{eur(rendimento.valor)}</strong>
          {rendimento.variacao !== null ? (
            <span className={desceu ? 'amount-negative' : 'amount-positive'}>
              <Icone nome={desceu ? 'trending-down' : 'trending-up'} />{' '}{formatarPercentagem(rendimento.variacao)}
            </span>
          ) : null}
        </div>
      </section>
      <section className={`balance-panel ffacc-card${nivel(principal)}`}>
        <div className="panel-signal" aria-hidden="true" />
        <p>Saldo {principal.name ?? 'Principal'}</p>
        <strong>{eur(saldo(principal).atual)}</strong>
        <div className="trend-row positive">
          {tendenciaDe(principal)}
          <span className="mini-bars" aria-hidden="true"><i /><i /><i /><i /></span>
        </div>
      </section>
      <section
        className={`metric-panel current-panel${nivel(revolut)}`} role="button" tabIndex={0} aria-label="Ver Resumo"
        onClick={() => irPara('resumo')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') irPara('resumo'); }}
      >
        <p>Saldo {revolut.name}</p>
        <strong>{eur(saldo(revolut).atual)}</strong>
        {tendenciaDe(revolut)}
      </section>
      {extra.map((c, i) => (
        <section
          key={c.id} className={`metric-panel account-extra-panel${nivel(c)}${extra.length % 2 === 1 && i === extra.length - 1 ? ' span-full' : ''}`}
          role="button" tabIndex={0} aria-label={`Editar ${c.name}`}
          onClick={editarContas} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') editarContas(); }}
        >
          <p>Saldo {c.name}</p>
          <strong>{eur(saldo(c).atual)}</strong>
          {tendenciaDe(c)}
        </section>
      ))}
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
        {lista.expandida && (termo || contaFiltro !== 'all') && !visiveis.length ? (
          <p className="tx-search-empty">{termo ? `Sem resultados para «${lista.pesquisa.trim()}».` : 'Sem movimentos nesta conta.'}</p>
        ) : (
          <div className="transaction-list">
            {visiveis.map((m) => (
              <LinhaMovimento
                key={m.id} movimento={m} contas={contas} aspetos={aspetos} ocultos={ocultos}
                aoAbrir={abrirMovimento}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
