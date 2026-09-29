import type { FormEvent } from 'react';
import type { Estado, Movimento } from '../dados';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { Icone } from '../ui/Icone';
import { categoriaDoDetalhe } from './categorias';
import { categoriasParaEditar, movimentoEditado } from './regras';

interface Props {
  movimento: Movimento | null;
  fechar: () => void;
  estado: Estado;
  aoGuardar: (m: Movimento) => void;
  aoEliminar: (m: Movimento) => void;
}

export function EditarMovimento({ movimento: m, fechar, estado, aoGuardar, aoEliminar }: Props) {
  const guardar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!m) return;
    const novo = movimentoEditado(m, new FormData(ev.currentTarget));
    if (novo) aoGuardar(novo);
  };
  return (
    <Dialogo aberto={m !== null} aoMudar={(a) => { if (!a) fechar(); }} className="movement-dialog" titulo="Editar movimento" descricao="Altere os dados ou elimine este movimento.">
      {m ? (
        <form key={m.id} className="movement-form" onSubmit={guardar}>
          <label>Descrição<input name="title" defaultValue={m.title} required /></label>
          <div className="form-grid">
            <label>Valor
              <div className="input-suffix">
                <input
                  name="amount" inputMode="decimal" defaultValue={String(m.revolut ? m.transferValue || 0 : Math.abs(m.amount)).replace('.', ',')}
                  disabled={m.movementType === 'transfer' && !m.revolut} required
                />
                <span>€</span>
              </div>
            </label>
            <label>Data<input name="date" type="date" defaultValue={m.date} required /></label>
          </div>
          <label>Categoria<input name="category" list="edit-categories" defaultValue={categoriaDoDetalhe(m)} /></label>
          {(m.movementType === 'expense' || m.movementType === 'income') && !m.revolut ? (
            <label>Conta
              <select name="account" defaultValue={m.account || 'principal'}>
                {estado.accounts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          ) : null}
          <datalist id="edit-categories">
            {categoriasParaEditar(estado.categories, estado.incomeCategories).map((c) => <option key={c} value={c} />)}
          </datalist>
          <label>Nota (opcional)<textarea name="note" rows={2} maxLength={140} defaultValue={m.note || ''} placeholder="Ex.: presente de anos, fatura pedida…" /></label>
          <div className="dialog-actions">
            <Botao type="button" variante="destrutivo" onClick={() => aoEliminar(m)}><Icone nome="trash-2" />Eliminar</Botao>
            <Botao type="submit">Guardar</Botao>
          </div>
        </form>
      ) : null}
    </Dialogo>
  );
}
