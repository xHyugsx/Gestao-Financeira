import { type FormEvent, useRef, useState } from 'react';
import type { Estado, Movimento } from '../dados';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { formatarEuros } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { categoriaDoDetalhe } from './categorias';
import { pessoasDaFamilia } from './pessoas';
import { PERIODICIDADES, porConfirmar, valoresDaSerie } from './recorrentes';
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
  const pessoas = pessoasDaFamilia(estado);
  const atual = categoriaDoDetalhe(m);
  // Valor variável por confirmar: campo vazio e o valor da última vez à mão
  const pendente = porConfirmar(m);
  const ultimo = pendente ? valoresDaSerie(estado.transactions, m).at(-1) : undefined;
  const campoValor = useRef<HTMLInputElement>(null);
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
              ref={campoValor} name="amount" inputMode="decimal" placeholder={pendente ? 'A definir' : undefined}
              defaultValue={pendente ? '' : String(m.revolut ? m.transferValue || 0 : Math.abs(m.amount)).replace('.', ',')}
              disabled={m.movementType === 'transfer' && !m.revolut} required={!pendente}
            />
            <span>€</span>
          </div>
        </label>
        <label>Data<input name="date" type="date" defaultValue={m.date} required /></label>
      </div>
      {ultimo ? (
        <button type="button" className="ffultimo" onClick={() => { if (campoValor.current) { campoValor.current.value = String(ultimo).replace('.', ','); campoValor.current.focus(); } }}>
          Da última vez: {formatarEuros(ultimo, false)} · usar
        </button>
      ) : null}
      {/* Lista de escolha (a app atual tinha um campo de texto com sugestões) */}
      <label>Categoria
        <select name="category" defaultValue={atual}>
          {categoriasParaEditar(m, estado.categories, estado.incomeCategories, atual).map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      {m.movementType === 'expense' && !m.revolut && (pessoas.length || m.person) ? (
        <label className="ffv2-extra">Quem fez
          <select name="person" defaultValue={m.person || ''}>
            <option value="">—</option>
            {[...new Set([...pessoas, ...(m.person ? [m.person] : [])])].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      ) : null}
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
        {recorrente ? (
          <label>Tipo de valor
            <select name="tipoValor" defaultValue={m.recurring === 'sem' ? 'sem' : 'com'}>
              <option value="com">Valor fixo</option>
              <option value="sem">Valor variável (confirmar todos os meses)</option>
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

/** Apagar a cópia mais recente de uma série recorrente: só este mês (a série continua) ou parar a série. */
export function ApagarRecorrente({ movimento: m, fechar, saltar, parar }: {
  movimento: Movimento | null; fechar: () => void; saltar: (m: Movimento) => void; parar: (m: Movimento) => void;
}) {
  return (
    <Dialogo
      aberto={m !== null} aoMudar={(a) => { if (!a) fechar(); }} className="movement-dialog ffapagar-serie" titulo="Apagar movimento recorrente"
      descricao={m ? `«${m.title.trim()}» é o último da série: é dele que sai a cópia seguinte.` : ''}
    >
      <ul className="ffapagar-opcoes">
        <li><strong>Só este mês:</strong> desaparece das listas e do saldo; a série continua no próximo.</li>
        <li><strong>Parar a série:</strong> é apagado e deixa de haver cópias.</li>
      </ul>
      {m ? (
        <div className="dialog-actions">
          <Botao type="button" variante="destrutivo" onClick={() => parar(m)}><Icone nome="trash-2" />Parar a série</Botao>
          <Botao type="button" onClick={() => saltar(m)}>Só este mês</Botao>
        </div>
      ) : null}
    </Dialogo>
  );
}
