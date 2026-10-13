// Ano em revista: ecrãs ao estilo «stories» (tocar à direita avança, à esquerda recua; setas e Esc no teclado).
import * as Radix from '@radix-ui/react-dialog';
import { type ReactNode, useEffect, useState } from 'react';
import type { Estado } from '../dados';
import { formatarEuros, formatarPercentagem } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { anoEmRevista } from './revista';

const CURTOS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

interface Ecra { id: string; conteudo: ReactNode }

export function AnoEmRevista({ estado, ano, ocultos, aberto, fechar }: { estado: Estado; ano: number; ocultos: boolean; aberto: boolean; fechar: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => { if (aberto) setI(0); }, [aberto]);
  if (!aberto) return null;
  const r = anoEmRevista(estado, ano);
  const eur = (v: number) => formatarEuros(v, ocultos);
  const maximo = Math.max(1, ...r.porMes);
  const ecras: Ecra[] = [
    { id: 'capa', conteudo: <><p className="ffrev-olho">O teu ano em revista</p><h2 className="ffrev-gigante">{ano}</h2><p>{r.movimentos} movimentos registados{r.ateMes < 11 ? ` até ${new Date(ano, r.ateMes, 1).toLocaleDateString('pt-PT', { month: 'long' })}` : ''}.</p></> },
    { id: 'gasto', conteudo: <><p className="ffrev-olho">Gastaram</p><h2 className="ffrev-valor">{eur(r.gasto)}</h2>
      <p>Em média {eur(r.gasto / (r.ateMes + 1))} por mês.</p>
      {r.variacao !== null ? <p className={r.variacao <= 0 ? 'ffrev-bom' : 'ffrev-mau'}>{r.variacao <= 0 ? '↓' : '↑'} {formatarPercentagem(r.variacao)} face ao mesmo período de {ano - 1}</p> : null}</> },
  ];
  if (r.mesMaisCaro) {
    ecras.push({ id: 'meses', conteudo: <><p className="ffrev-olho">O mês mais caro</p><h2 className="ffrev-valor">{r.mesMaisCaro.mes}</h2><p>{eur(r.mesMaisCaro.valor)}</p>
      <div className="ffrev-barras" aria-hidden="true">
        {r.porMes.map((v, k) => <div key={k} className={k > r.ateMes ? 'ffrev-futuro' : ''}><i style={{ transform: `scaleY(${Math.max(0.03, v / maximo)})` }} /><span>{CURTOS[k]}</span></div>)}
      </div>
      {r.mesMaisPoupado ? <p>O mais leve foi {r.mesMaisPoupado.mes}: {eur(r.mesMaisPoupado.valor)}.</p> : null}</> });
  }
  if (r.categorias.length) {
    ecras.push({ id: 'categorias', conteudo: <><p className="ffrev-olho">Para onde foi o dinheiro</p>
      <ol className="ffrev-lista">{r.categorias.map((c, k) => (
        <li key={c.nome}><b>{k + 1}</b><span>{c.nome}<small>{eur(c.valor)} · {formatarPercentagem(c.parte)}</small></span><i style={{ transform: `scaleX(${c.parte / 100})` }} /></li>
      ))}</ol></> });
  }
  if (r.maisGasto) {
    ecras.push({ id: 'sitios', conteudo: <><p className="ffrev-olho">Onde se gastou mais</p><h2 className="ffrev-valor">{r.maisGasto.titulo}</h2><p>{eur(r.maisGasto.valor)} no ano.</p>
      {r.maisVezes ? <p>E a ida mais frequente: <b>{r.maisVezes.titulo}</b>, {r.maisVezes.vezes} vezes.</p> : null}</> });
  }
  if (r.poupado > 0 || r.recebido > 0) {
    ecras.push({ id: 'poupanca', conteudo: <><p className="ffrev-olho">{r.poupado > 0 ? 'Puseram de parte' : 'Receberam'}</p><h2 className="ffrev-valor">{eur(r.poupado > 0 ? r.poupado : r.recebido)}</h2>
      {r.poupado > 0 && r.recebido > 0 ? <p>{formatarPercentagem((r.poupado / r.recebido) * 100)} do que receberam ({eur(r.recebido)}).</p> : null}</> });
  }
  if (r.diasSemGastos > 0) {
    ecras.push({ id: 'dias', conteudo: <><p className="ffrev-olho">Dias sem despesas</p><h2 className="ffrev-gigante">{r.diasSemGastos}</h2>{r.maiorSequencia > 1 ? <p>A maior sequência: {r.maiorSequencia} dias seguidos.</p> : null}</> });
  }
  ecras.push({ id: 'fim', conteudo: <><p className="ffrev-olho">{ano}</p><h2 className="ffrev-valor">Bom trabalho!</h2><p>Continuem a registar: no fim do ano há mais.</p></> });

  const atual = Math.min(i, ecras.length - 1);
  const avancar = () => (atual < ecras.length - 1 ? setI(atual + 1) : fechar());
  const recuar = () => setI(Math.max(0, atual - 1));
  return (
    <Radix.Root open onOpenChange={(a) => { if (!a) fechar(); }}>
      <Radix.Portal>
        <Radix.Content
          className={`ffrev ffrev-s${atual % 5}`} aria-describedby={undefined}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') avancar(); else if (e.key === 'ArrowLeft') recuar(); }}
        >
          <Radix.Title className="sr-only">Ano em revista {ano}</Radix.Title>
          <div className="ffrev-progresso">{ecras.map((e, k) => <i key={e.id} className={k < atual ? 'feito' : k === atual ? 'atual' : ''} />)}</div>
          <Radix.Close className="ffrev-fechar" aria-label="Fechar"><Icone nome="x" /></Radix.Close>
          <div
            className="ffrev-palco" role="button" tabIndex={-1} aria-label="Seguinte"
            onClick={(e) => { const b = e.currentTarget.getBoundingClientRect(); if (e.clientX - b.left < b.width / 3) recuar(); else avancar(); }}
          >
            <div key={ecras[atual]!.id} className="ffrev-ecra" data-ecra={ecras[atual]!.id}>{ecras[atual]!.conteudo}</div>
          </div>
          <p className="ffrev-dica">{atual < ecras.length - 1 ? 'Toque para continuar' : 'Toque para fechar'}</p>
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}
