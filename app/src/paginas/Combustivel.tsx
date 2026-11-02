import { type Estado, MESES, type Movimento } from '../dados';
import { ArtigoMovimento, TextoMovimento } from '../movimentos/Movimento';
import { formatarEuros, formatarPercentagem } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { RoboVazio } from '../ui/RoboVazio';
import { CORES, eCombustivel } from './calculos';
import { combustivelPorViatura, viaturasDe } from '../movimentos/viaturas';

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
  const total = porMes.reduce((s, v) => s + v, 0);
  const meses = ano < agora.getFullYear() ? 12 : ano > agora.getFullYear() ? 0 : agora.getMonth() + 1;
  const gastoMes = soma(doMesAtual);
  // carros e mota à parte: os carros são os que mais se usam (decisão do dono)
  const viaturas = viaturasDe(estado);
  const doMesV = combustivelPorViatura(doMesAtual, viaturas), doAnoV = combustivelPorViatura(doAno, viaturas);
  const carros = viaturas.filter((v) => v.type === 'carro'), motas = viaturas.filter((v) => v.type === 'mota');
  const CORES_CARROS = ['cyan', 'violet', 'amber', 'emerald'];

  const media = meses ? total / meses : 0, varMedia = media ? ((gastoMes - media) / media) * 100 : 0;
  const corCarro = (k: number) => CORES[CORES_CARROS[k % CORES_CARROS.length]!]!;
  // últimos 6 meses (até ao mês escolhido): carros, mota e sem viatura na mesma barra
  const ultimos = Array.from({ length: 6 }, (_, k) => new Date(mes.getFullYear(), mes.getMonth() - 5 + k, 1)).map((d) => {
    const doM = estado.transactions.filter((m) => eCombustivel(m) && m.date.startsWith(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`));
    const v = combustivelPorViatura(doM, viaturas);
    return { nome: MESES[d.getMonth()]!.slice(0, 3), carros: viaturas.length ? v.carros : soma(doM), motas: v.motas, sem: viaturas.length ? v.semViatura : 0 };
  });
  const maxUlt = Math.max(1, ...ultimos.map((x) => x.carros + x.motas + x.sem));

  return (
    <main className="detail-view fuel-view">
      <section className="ffresumo-mes fffuel-mes" aria-label="Combustível do mês">
        <p className="ffbloco-rot">{`Combustível em ${MESES[mes.getMonth()]}`}</p>
        <strong className="ffresumo-valor fffuel-total">{eur(gastoMes)}</strong>
        <div className="ffres-linha">
          {media && gastoMes ? <span className={`ffhero-var ${varMedia > 0 ? 'amount-negative' : 'amount-positive'}`}>{`${varMedia > 0 ? '↑' : '↓'} ${formatarPercentagem(varMedia)} vs média`}</span> : <span />}
          <small>{`${doMesAtual.length} ${doMesAtual.length === 1 ? 'abastecimento' : 'abastecimentos'}`}</small>
        </div>
        <div className="ffmedias"><p>Média mensal <strong>{meses ? eur(media) : '—'}</strong></p><p>{`Em ${ano}`} <strong>{eur(total)}</strong></p></div>
      </section>
      {carros.length || motas.length || doMesV.semViatura || doAnoV.semViatura ? (
        <section className="ffcal-resumos fffuel-blocos">
          {carros.length ? (
            <article className="ffbloco fffuel-carros">
              <p className="ffbloco-rot fffuel-rot-carros">{carros.length === 1 ? 'Carro' : 'Carros'}</p>
              <strong className="ffbloco-val fffuel-total-carros">{eur(doMesV.carros)}</strong>
              {carros.length > 1 ? (
                <>
                  <div className="ffpilha" aria-hidden="true">
                    {doMesV.porViatura.filter((v) => v.type === 'carro').map((v, k) => <i key={v.name} style={{ flex: Math.max(v.amount, doMesV.carros ? 0 : 1), background: corCarro(k) }} />)}
                  </div>
                  <div className="fffuel-linhas">
                    {doMesV.porViatura.filter((v) => v.type === 'carro').map((v, k) => (
                      <p key={v.name}><span><i style={{ background: corCarro(k) }} />{v.name}</span><strong>{eur(v.amount)}</strong></p>
                    ))}
                  </div>
                </>
              ) : null}
              <div className="ffmedias"><p>{`Em ${ano}`} <strong>{eur(doAnoV.carros)}</strong></p>{meses ? <p>Média mensal <strong>{eur(doAnoV.carros / meses)}</strong></p> : null}</div>
            </article>
          ) : null}
          {motas.length ? (
            <article className="ffbloco fffuel-mota">
              <p className="ffbloco-rot fffuel-rot-mota">{motas.length === 1 ? motas[0]!.name : 'Motas'}</p>
              <strong className="ffbloco-val">{eur(doMesV.motas)}</strong>
              <small>à parte dos carros</small>
              <small>{`em ${ano}: ${eur(doAnoV.motas)}`}</small>
            </article>
          ) : null}
          {doMesV.semViatura || doAnoV.semViatura ? (
            <article className="ffbloco fffuel-sem">
              <p className="ffbloco-rot">Sem viatura</p>
              <strong className="ffbloco-val">{eur(doMesV.semViatura)}</strong>
              <small>{`em ${ano}: ${eur(doAnoV.semViatura)}`}</small>
              <small>edite para escolher a viatura</small>
            </article>
          ) : null}
        </section>
      ) : null}
      {!viaturas.length ? <p className="fffuel-dica">Para somar os carros à parte da mota, acrescente as viaturas em Definições › Perfil e família.</p> : null}
      <section className="ffcartao fffuel-meses" aria-label="Últimos 6 meses">
        <p className="ffbloco-rot">Últimos 6 meses</p>
        <div className="fffuel-barras">
          {ultimos.map((x, k) => (
            <div key={k} className={k === 5 ? 'on' : undefined} aria-label={`${x.nome}: ${eur(x.carros + x.motas + x.sem)}`}>
              <span style={{ height: `${Math.max(3, ((x.carros + x.motas + x.sem) / maxUlt) * 100)}%` }}>
                {x.motas ? <i className="fffuel-b-mota" style={{ flex: x.motas }} /> : null}
                {x.sem ? <i className="fffuel-b-sem" style={{ flex: x.sem }} /> : null}
                <i className="fffuel-b-carros" style={{ flex: x.carros || (x.motas || x.sem ? 0 : 1) }} />
              </span>
              <small>{x.nome}</small>
            </div>
          ))}
        </div>
        {viaturas.length ? (
          <div className="fffuel-leg"><span><i className="fffuel-b-carros" />Carros</span>{motas.length ? <span><i className="fffuel-b-mota" />Mota</span> : null}{ultimos.some((x) => x.sem) ? <span><i className="fffuel-b-sem" />Sem viatura</span> : null}</div>
        ) : null}
      </section>
      <section className="transactions-panel">
        <div className="section-heading"><h2>Abastecimentos de {MESES[mes.getMonth()]}</h2><span className="fffuel-conta">{doMesAtual.length}</span></div>
        <div className="transaction-list">
          {doMesAtual.length ? doMesAtual.map((m) => {
            const k = carros.findIndex((c) => c.name === m.vehicle), mota = motas.some((c) => c.name === m.vehicle);
            const cor = k >= 0 ? corCarro(k) : mota ? 'oklch(72% .18 55)' : 'var(--muted-foreground)';
            return (
              <ArtigoMovimento key={m.id} movimento={m} aoAbrir={abrirMovimento}>
                <div className="transaction-main">
                  <span className="ffcat-ic" style={{ '--c': cor } as React.CSSProperties}><Icone nome={mota ? 'bike' : 'fuel'} aria-hidden="true" /></span>
                  <TextoMovimento movimento={m} contas={estado.accounts} />
                </div>
                <strong className="amount-negative">−{eur(Math.abs(m.amount))}</strong>
              </ArtigoMovimento>
            );
          }) : <div className="vet-empty ffvazio-linha"><RoboVazio pequeno />Sem gastos de combustível neste mês.</div>}
        </div>
      </section>
    </main>
  );
}
