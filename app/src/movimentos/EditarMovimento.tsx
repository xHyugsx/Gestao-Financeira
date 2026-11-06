import { type FormEvent, useRef, useState } from 'react';
import { eReceitaDeSalario, type Estado, type Movimento } from '../dados';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { formatarEuros } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { aspetosCategorias, categoriaDoDetalhe } from './categorias';
import { opcoesQuemFez, pessoasDaFamilia } from './pessoas';
import { CamposCombustivel } from './CamposCombustivel';
import { CampoCategoria } from './EscolhaCategoria';
import { EscolhaData, Escolhas, LinhaInterruptor, Rotulo, ValorGrande } from '../ui/Escolhas';
import { eCategoriaCombustivel } from './viaturas';
import { DIA_DO_SALARIO, PERIODICIDADES, porConfirmar, valorRecorrente, valoresDaSerie } from './recorrentes';
import { diaEMes } from './regras';
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
  const [categoria, setCategoria] = useState(atual);
  const [pessoa, setPessoa] = useState(m.person || '');
  const [conta, setConta] = useState(m.account || 'principal');
  const [destino, setDestino] = useState(typeof m.toAccount === 'string' ? m.toAccount : '');
  const aspetos = aspetosCategorias(estado, new Date(`${m.date}T12:00:00`));
  // Valor variável por confirmar: campo vazio e o valor da última vez à mão
  const pendente = porConfirmar(m);
  const ultimo = pendente ? valoresDaSerie(estado.transactions, m).at(-1) : undefined;
  const campoValor = useRef<HTMLInputElement>(null);
  const guardar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const novo = movimentoEditado(m, new FormData(ev.currentTarget));
    if (novo) aoGuardar(novo);
  };
  const pessoasOp = opcoesQuemFez(pessoas, m.person ? [m.person] : []);
  const recebeOp = [...pessoasOp.slice(1), { valor: '', rotulo: '—' }];
  const tipoValor = m.revolut ? 'transfer' : m.movementType ?? 'expense';
  const comCategoria = m.movementType === 'expense' || m.movementType === 'income';
  return (
    <form className="movement-form ffregisto-form" onSubmit={guardar}>
      <button type="button" className="ffregisto-apagar" aria-label="Eliminar movimento" title="Eliminar" onClick={() => aoEliminar(m)}><Icone nome="trash-2" /><span className="sr-only">Eliminar</span></button>
      <ValorGrande
        tipo={tipoValor} inputRef={campoValor} placeholder={pendente ? 'A definir' : '0,00'} required={!pendente}
        defaultValue={pendente ? '' : String(m.revolut || m.movementType === 'transfer' ? m.transferValue || 0 : Math.abs(m.amount)).replace('.', ',')}
      />
      <label className="fftitulo"><Icone nome="pencil" /><span className="sr-only">Descrição</span><input name="title" defaultValue={m.title} required autoComplete="off" /></label>
      {ultimo ? (
        <button type="button" className="ffultimo" onClick={() => { if (campoValor.current) { campoValor.current.value = String(ultimo).replace('.', ','); campoValor.current.dispatchEvent(new Event('input', { bubbles: true })); campoValor.current.focus(); } }}>
          ↺ Da última vez: {formatarEuros(ultimo, false)} · usar
        </button>
      ) : null}
      {comCategoria && !m.revolut ? (
        <><Rotulo>Categoria</Rotulo><CampoCategoria estado={estado} lista={categoriasParaEditar(m, estado.categories, estado.incomeCategories, atual)} valor={categoria} aoMudar={setCategoria} receita={m.movementType === 'income'} mapaAspetos={aspetos} /></>
      ) : <input type="hidden" name="category" value={categoria} />}
      {m.movementType === 'expense' && !m.revolut && (eCategoriaCombustivel(categoria) || eCategoriaCombustivel(m.title) || m.vehicle) ? <CamposCombustivel estado={estado} viatura={String(m.vehicle ?? '')} combustivel={typeof m.fuel === 'string' ? m.fuel : ''} /> : null}
      <Rotulo>Data</Rotulo>
      <EscolhaData inicial={m.date} />
      {m.movementType === 'income' && eReceitaDeSalario({ ...m, detail: `x · ${categoria}` }) && (pessoas.length || m.person) ? (
        <div className="ffv2-extra"><Rotulo>Quem recebe</Rotulo><Escolhas nome="person" rotulo="Quem recebe" valor={pessoa} aoMudar={setPessoa} opcoes={recebeOp} /></div>
      ) : null}
      {m.movementType === 'expense' && !m.revolut && (pessoas.length > 1 || (m.person && m.person !== pessoas[0])) ? (
        <div className="ffv2-extra"><Rotulo>Quem fez</Rotulo><Escolhas nome="person" rotulo="Quem fez" valor={pessoa} aoMudar={setPessoa} opcoes={pessoasOp} /></div>
      ) : null}
      {comCategoria && !m.revolut ? (
        <><Rotulo>Conta</Rotulo><Escolhas nome="account" rotulo="Conta" valor={conta} aoMudar={setConta} opcoes={estado.accounts.map((c) => ({ valor: c.id, rotulo: c.name }))} /></>
      ) : null}
      {m.movementType === 'transfer' && !m.revolut && estado.accounts.length > 1 ? (
        // transferência: as contas de origem e de destino também se mudam (v2.59.0)
        <>
          <Rotulo>Conta de origem</Rotulo>
          <Escolhas nome="origin" rotulo="Conta de origem" valor={conta} aoMudar={setConta} opcoes={estado.accounts.map((c) => ({ valor: c.id, rotulo: c.name }))} />
          <Rotulo>Conta de destino</Rotulo>
          <Escolhas nome="destination" rotulo="Conta de destino" valor={destino} aoMudar={setDestino} opcoes={estado.accounts.map((c) => ({ valor: c.id, rotulo: c.name }))} />
        </>
      ) : null}
      <div className="movement-checks ffv2-extra ffregisto-mais">
        <LinhaInterruptor icone="calendar-clock" rotulo="Recorrente" nome="recurring" ligado={recorrente} aoMudar={setRecorrente} />
        {recorrente ? (
          <div className="form-grid">
            <label>Periodicidade
              <select name="recurringEvery" defaultValue={m.recurringDay === DIA_DO_SALARIO.valor ? DIA_DO_SALARIO.valor : m.recurringEvery ? String(m.recurringEvery) : ''}>
                <option value="">Não criar automaticamente</option>
                {PERIODICIDADES.map((p) => <option key={p.meses} value={p.meses}>{p.rotulo}</option>)}
                <option value={DIA_DO_SALARIO.valor}>{DIA_DO_SALARIO.rotulo}</option>
              </select>
            </label>
            <label>Tipo de valor
              <select name="tipoValor" defaultValue={m.recurring === 'sem' ? 'sem' : 'com'}>
                <option value="com">Valor fixo</option>
                <option value="sem">Valor variável (confirmar todos os meses)</option>
              </select>
            </label>
          </div>
        ) : null}
        <label className="ffnota"><Icone nome="pencil" /><span className="sr-only">Nota (opcional)</span><textarea name="note" rows={1} maxLength={140} defaultValue={m.note || ''} placeholder="Nota (opcional)" /></label>
      </div>
      <div className="ffregisto-rodape"><Botao type="submit" className="ffguardar">Guardar alterações</Botao></div>
    </form>
  );
}

export function EditarMovimento({ movimento: m, fechar, estado, aoGuardar, aoEliminar }: Props) {
  return (
    <Dialogo folha aberto={m !== null} aoMudar={(a) => { if (!a) fechar(); }} className="movement-dialog ffregisto" titulo="Editar movimento" descricao="Altera os dados ou elimina este movimento.">
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
        <li><strong>Só este mês:</strong> desaparece das listas e dos totais; a série continua no próximo.</li>
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

/** Movimento novo de uma série que já tem cópia nesse mês: substituir a cópia ou registar os dois. */
export function DuplicadoRecorrente({ par, fechar, substituir, registar }: {
  par: { novo: Movimento; copia: Movimento } | null; fechar: () => void; substituir: () => void; registar: () => void;
}) {
  const c = par?.copia;
  return (
    <Dialogo
      aberto={par !== null} aoMudar={(a) => { if (!a) fechar(); }} className="movement-dialog ffapagar-serie" titulo="Este recorrente já está registado"
      descricao={c ? `«${c.title.trim()}» de ${diaEMes(c.date)} (${formatarEuros(valorRecorrente(c), false)}) foi criado automaticamente.` : ''}
    >
      <ul className="ffapagar-opcoes">
        <li><strong>Substituir:</strong> fica só um, com o que escreveste.</li>
        <li><strong>Registar na mesma:</strong> ficam os dois (por exemplo, um pagamento a mais).</li>
      </ul>
      {par ? (
        <div className="dialog-actions">
          <Botao type="button" variante="ghost" onClick={registar}>Registar na mesma</Botao>
          <Botao type="button" onClick={substituir}>Substituir</Botao>
        </div>
      ) : null}
    </Dialogo>
  );
}
