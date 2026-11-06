import { type ReactNode, useEffect, useRef, useState } from 'react';
import { dia } from '../dados';
import { Icone } from './Icone';
import type { NomeIcone } from './icones';
import { vibrarCurto } from './vibracao';
import { formatarEuros } from './formatos';
import { lerValor } from '../movimentos/regras';

export interface Opcao { valor: string; rotulo: string; icone?: NomeIcone; sub?: string; classe?: string }

/** Escolha única em botões (folhas de registo, v2.45.0); o valor vai no formulário num campo escondido com `nome`. */
export function Escolhas({ nome, rotulo, opcoes, valor, aoMudar, classe }: {
  nome: string; rotulo: string; opcoes: readonly Opcao[]; valor: string; aoMudar: (v: string) => void; classe?: string;
}) {
  return (
    <div className={`ffescolhas${classe ? ` ${classe}` : ''}`} role="radiogroup" aria-label={rotulo} data-campo={nome}>
      <input type="hidden" name={nome} value={valor} />
      {opcoes.map((o) => (
        <button
          key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} data-valor={o.valor}
          className={`ffescolha${valor === o.valor ? ' on' : ''}${o.classe ? ` ${o.classe}` : ''}`}
          onClick={() => { if (o.valor !== valor) vibrarCurto(); aoMudar(o.valor); }}
        >
          {o.icone ? <Icone nome={o.icone} /> : null}<span>{o.rotulo}</span>{o.sub ? <small>{o.sub}</small> : null}
        </button>
      ))}
    </div>
  );
}

/** Rótulo de um grupo de campos da folha. */
export const Rotulo = ({ children, extra }: { children: ReactNode; extra?: ReactNode }) => <p className="ffrotulo">{children}{extra ? <em>{extra}</em> : null}</p>;

/** Valor em grande (o teclado só abre ao tocar). */
export function ValorGrande({ tipo, defaultValue = '', placeholder = '0,00', required, disabled, inputRef, legenda }: {
  tipo: string; defaultValue?: string; placeholder?: string; required?: boolean; disabled?: boolean; inputRef?: React.Ref<HTMLInputElement>; legenda?: ReactNode;
}) {
  const [n, setN] = useState(Math.max(defaultValue.length, placeholder.length));
  const [alto, setAlto] = useState('');
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = caixa.current;
    const ouvir = (e: Event) => setAlto(String((e as CustomEvent).detail));
    el?.addEventListener('ffvaloralto', ouvir);
    return () => el?.removeEventListener('ffvaloralto', ouvir);
  }, []);
  return (
    <div ref={caixa} className={`ffvalor ffvalor-${tipo}`}>
      <label>
        <span className="sr-only">Valor</span>
        {tipo === 'expense' || tipo === 'income' ? <span className="ffvalor-sinal" aria-hidden="true">{tipo === 'expense' ? '−' : '+'}</span> : null}
        <input
          ref={inputRef} name="amount" inputMode="decimal" autoComplete="off" defaultValue={defaultValue} placeholder={placeholder} required={required} disabled={disabled}
          style={{ width: `${Math.min(9, Math.max(3, n)) + 0.4}ch` }}
          onInput={(e) => { const i = e.currentTarget; setN(Math.max(i.value.length, placeholder.length)); delete i.dataset.confirmado; setAlto(''); }}
        />
        <span className="ffvalor-eur" aria-hidden="true">€</span>
      </label>
      {legenda ? <small>{legenda}</small> : null}
      {alto ? <small className="ffvalor-alto" role="alert">{alto}</small> : null}
    </div>
  );
}

export const VALOR_ALTO = 10000;

/** Valor muito alto (≥ 10 000 €): o 1.º «Guardar» só avisa; tocar outra vez confirma. Devolve true se ficou a avisar. */
export function valorAltoPorConfirmar(form: HTMLFormElement): boolean {
  const i = form.elements.namedItem('amount');
  if (!(i instanceof HTMLInputElement) || i.disabled || i.value === i.defaultValue) return false;
  const v = Math.abs(lerValor(i.value));
  if (!(v >= VALOR_ALTO) || i.dataset.confirmado === i.value) return false;
  i.dataset.confirmado = i.value;
  i.closest('.ffvalor')?.dispatchEvent(new CustomEvent('ffvaloralto', { detail: `${formatarEuros(v)} é um valor alto. Se estiver certo, toca outra vez em Guardar.` }));
  return true;
}

/** Data: «Hoje», «Ontem» ou outra (o campo de data fica sempre à vista, como um botão). */
export function EscolhaData({ inicial }: { inicial?: string }) {
  const hoje = dia(new Date()), ontem = dia(new Date(Date.now() - 864e5));
  const [data, setData] = useState(inicial || hoje);
  const outra = data !== hoje && data !== ontem;
  const escolher = (d: string) => { if (d !== data) vibrarCurto(); setData(d); };
  return (
    <div className="ffescolhas ffdata" role="group" aria-label="Data">
      <button type="button" className={`ffescolha${data === hoje ? ' on' : ''}`} aria-pressed={data === hoje} onClick={() => escolher(hoje)}><span>Hoje</span></button>
      <button type="button" className={`ffescolha${data === ontem ? ' on' : ''}`} aria-pressed={data === ontem} onClick={() => escolher(ontem)}><span>Ontem</span></button>
      <label className={`ffescolha ffdata-outra${outra ? ' on' : ''}`}>
        <Icone nome="calendar-days" />
        <input name="date" type="date" aria-label="Outra data" value={data} required onChange={(e) => setData(e.target.value || hoje)} />
      </label>
    </div>
  );
}

/** Linha com interruptor (Recorrente, Revolut…). */
export function LinhaInterruptor({ icone, rotulo, ligado, aoMudar, nome }: { icone: NomeIcone; rotulo: string; ligado: boolean; aoMudar: (v: boolean) => void; nome?: string }) {
  return (
    <label className="fflinha-int checkbox-row">
      <Icone nome={icone} /><span>{rotulo}</span>
      <input type="checkbox" role="switch" name={nome} checked={ligado} onChange={(e) => aoMudar(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}
