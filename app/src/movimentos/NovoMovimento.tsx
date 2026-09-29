import type { FormEvent } from 'react';
import { dia, type Estado, type Movimento, type TipoMovimento } from '../dados';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { Icone } from '../ui/Icone';
import { Segmentado } from '../ui/Segmentado';
import type { aspetosCategorias } from './categorias';
import { novoMovimento } from './regras';

/** Escolhas do formulário que a app atual mantém entre aberturas (tipo e categoria) ou repõe ao abrir. */
export interface EscolhasNovo {
  tipo: TipoMovimento;
  categoria: string;
  recorrente: boolean;
  tipoValor: string;
  revolut: boolean;
}

interface Props {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  estado: Estado;
  escolhas: EscolhasNovo;
  mudarEscolhas: (e: EscolhasNovo) => void;
  aspetos: ReturnType<typeof aspetosCategorias>;
  aoGuardar: (m: Movimento) => void;
}

const TIPOS = [{ valor: 'expense', rotulo: 'Despesa' }, { valor: 'income', rotulo: 'Receita' }, { valor: 'transfer', rotulo: 'Transferência' }] as const;

export function NovoMovimento({ aberto, aoMudar, estado, escolhas: e, mudarEscolhas, aspetos, aoGuardar }: Props) {
  const mudar = (o: Partial<EscolhasNovo>) => mudarEscolhas({ ...e, ...o });
  const lista = e.tipo === 'income' ? estado.incomeCategories : estado.categories;
  const mapa = e.tipo === 'income' ? aspetos.receitas : aspetos.despesas;
  const semValor = e.recorrente && e.tipoValor === 'sem';

  const guardar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    const r = novoMovimento(new FormData(form), { ...e, hoje: new Date(), id: Date.now() });
    if (Array.isArray(r)) {
      const campo = form.elements.namedItem(r[0]) as HTMLInputElement | null;
      if (campo) {
        campo.setCustomValidity(r[1]);
        campo.reportValidity();
        campo.addEventListener('input', () => campo.setCustomValidity(''), { once: true });
      }
      return;
    }
    aoGuardar(r);
  };

  return (
    <Dialogo aberto={aberto} aoMudar={aoMudar} className="movement-dialog" titulo="Novo movimento" descricao="Registe uma despesa, receita ou transferência.">
      <Segmentado valor={e.tipo} rotulo="Tipo de movimento" opcoes={TIPOS} aoMudar={(tipo) => mudar({ tipo })} />
      <form className="movement-form" onSubmit={guardar}>
        <label>Descrição<input name="title" placeholder={e.tipo === 'transfer' ? 'Ex.: Reforço Revolut' : 'Ex.: Continente'} required /></label>
        <div className="form-grid">
          <label>Valor
            <div className="input-suffix">
              <input name="amount" inputMode="decimal" placeholder={semValor ? 'A definir' : '0,00'} required={!semValor} />
              <span>€</span>
            </div>
          </label>
          <label>Data<input name="date" type="date" defaultValue={dia(new Date())} required /></label>
        </div>
        {e.tipo === 'transfer' ? (
          <div className="form-grid">
            <label>Conta de origem<select name="origin" defaultValue="Principal"><option>Principal</option><option>Revolut</option></select></label>
            <label>Conta de destino<select name="destination" defaultValue="Revolut"><option>Revolut</option><option>Principal</option></select></label>
          </div>
        ) : (
          <>
            <label>Categoria
              <select name="category" value={lista.includes(e.categoria) ? e.categoria : lista[0]} onChange={(x) => mudar({ categoria: x.target.value })}>
                {lista.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <div className="category-shortcuts" aria-label="Categorias rápidas">
              {lista.slice(0, 5).map((c) => {
                const a = mapa.get(c);
                if (!a) return null;
                return (
                  <Botao key={c} type="button" variante="ghost" className={e.categoria === c ? 'shortcut-active' : ''} onClick={() => mudar({ categoria: c })}>
                    <span className={`tone-${a.tone}`}><Icone nome={a.icone} /></span>
                    <small>{c}</small>
                  </Botao>
                );
              })}
            </div>
          </>
        )}
        {e.tipo !== 'transfer' && !e.revolut ? (
          <label>Conta
            <select name="account" defaultValue="principal">
              {estado.accounts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        ) : null}
        <div className="movement-checks">
          <label className="checkbox-row"><input type="checkbox" checked={e.recorrente} onChange={(x) => mudar({ recorrente: x.target.checked })} /> Recorrente mensal</label>
          {e.recorrente ? (
            <label>Tipo de valor
              <select value={e.tipoValor} onChange={(x) => mudar({ tipoValor: x.target.value })}>
                <option value="com">Com valor</option>
                <option value="sem">Sem valor (definir mais tarde)</option>
              </select>
            </label>
          ) : null}
          <label className="checkbox-row"><input name="affectsBalance" type="checkbox" defaultChecked /> Atualiza o saldo da conta escolhida</label>
          <label className="checkbox-row"><input type="checkbox" checked={e.revolut} onChange={(x) => mudar({ revolut: x.target.checked })} /> Transferência para Revolut</label>
          {e.revolut ? (
            <div className="form-grid">
              <label>Revolut Conjunta
                {/* A app atual lista nomes fixos no código; aqui vêm do perfil (privacidade, plano §4.1). */}
                <select name="revolutHolder" defaultValue="Conjunta">
                  {['Conjunta', ...estado.profile.members.filter((n) => n && n !== 'Conjunta')].map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
              <label>Finalidade
                <select name="revolutPurpose" defaultValue="Carregamento">
                  <option>Carregamento</option><option>Poupança</option><option>Investimento</option><option>Outros</option>
                </select>
              </label>
            </div>
          ) : null}
        </div>
        <label>Nota (opcional)<textarea name="note" rows={2} maxLength={140} placeholder="Ex.: presente de anos, fatura pedida…" /></label>
        <div className="dialog-actions">
          <Botao type="button" variante="ghost" onClick={() => aoMudar(false)}><Icone nome="x" />Cancelar</Botao>
          <Botao type="submit"><Icone nome="plus" />Guardar</Botao>
        </div>
      </form>
    </Dialogo>
  );
}
