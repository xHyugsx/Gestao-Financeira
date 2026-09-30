import { type FormEvent, useState } from 'react';
import type { Estado, Movimento } from '../dados';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { Icone } from '../ui/Icone';
import { categoriaDoDetalhe } from './categorias';
import { PERIODICIDADES } from './recorrentes';
import { categoriasParaEditar, movimentoEditado } from './regras';

interface Props {
  movimento: Movimento | null;
  fechar: () => void;
  estado: Estado;
  aoGuardar: (m: Movimento) => void;
  aoEliminar: (m: Movimento) => void;
}

function Formulario({ m, estado, aoGuardar, aoEliminar }: { m: Movimento } & Pick<Props, 'estado' | 'aoGuardar' | 'aoEliminar'>) {
  const [recorrente, setRecorrente] = useState(!!m.recurring);
  const atual = categoriaDoDetalhe(m);
  const guardar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const novo = movimentoEditado(m, new FormData(ev.currentTarget));
    if (novo) aoGuardar(novo);
  };
  return (
    <form className="movement-form" onSubmit={guardar}>
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
      {/* Lista de escolha (a app atual tinha um campo de texto com sugestões) */}
      <label>Categoria
        <select name="category" defaultValue={atual}>
          {categoriasParaEditar(m, estado.categories, estado.incomeCategories, atual).map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      {(m.movementType === 'expense' || m.movementType === 'income') && !m.revolut ? (
        <label>Conta
          <select name="account" defaultValue={m.account || 'principal'}>
            {estado.accounts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      ) : null}
      <div className="movement-checks ffv2-extra">
        <label className="checkbox-row"><input name="recurring" type="checkbox" checked={recorrente} onChange={(x) => setRecorrente(x.target.checked)} /> Recorrente</label>
        {recorrente ? (
          <label>Periodicidade
            <select name="recurringEvery" defaultValue={m.recurringEvery ? String(m.recurringEvery) : ''}>
              <option value="">Não criar automaticamente</option>
              {PERIODICIDADES.map((p) => <option key={p.meses} value={p.meses}>{p.rotulo}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      <label>Nota (opcional)<textarea name="note" rows={2} maxLength={140} defaultValue={m.note || ''} placeholder="Ex.: presente de anos, fatura pedida…" /></label>
      <div className="dialog-actions">
        <Botao type="button" variante="destrutivo" onClick={() => aoEliminar(m)}><Icone nome="trash-2" />Eliminar</Botao>
        <Botao type="submit">Guardar</Botao>
      </div>
    </form>
  );
}

export function EditarMovimento({ movimento: m, fechar, estado, aoGuardar, aoEliminar }: Props) {
  return (
    <Dialogo aberto={m !== null} aoMudar={(a) => { if (!a) fechar(); }} className="movement-dialog" titulo="Editar movimento" descricao="Altere os dados ou elimine este movimento.">
      {m ? <Formulario key={m.id} m={m} estado={estado} aoGuardar={aoGuardar} aoEliminar={aoEliminar} /> : null}
    </Dialogo>
  );
}
