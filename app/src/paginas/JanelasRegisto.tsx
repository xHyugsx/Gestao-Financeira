// Janelas do botão "+" nas páginas Combustível e Veterinário (mesmos campos e regras da app atual).
import type { FormEvent } from 'react';
import { dia, type Movimento } from '../dados';
import { diaEMes, lerValor } from '../movimentos/regras';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { Icone } from '../ui/Icone';
import { ANIMAIS } from '../veterinario/animais';

const CATEGORIAS_VET = ['Consultas', 'Vacinas', 'Medicação', 'Exames', 'Cirurgia', 'Outros'];

function Acoes({ cancelar }: { cancelar: () => void }) {
  return (
    <div className="dialog-actions">
      <Botao type="button" variante="ghost" onClick={cancelar}><Icone nome="x" />Cancelar</Botao>
      <Botao type="submit"><Icone nome="plus" />Guardar</Botao>
    </div>
  );
}

function CampoValor() {
  return (
    <label>
      Valor
      <div className="input-suffix"><input name="amount" inputMode="decimal" placeholder="0,00" required /><span>€</span></div>
    </label>
  );
}

interface PropsJanela { aberto: boolean; aoMudar: (a: boolean) => void; aoGuardar: (m: Movimento) => void }

/** Abastecimento a partir do formulário (`null` se o valor não for válido). */
export function novoAbastecimento(f: FormData, hoje: Date): Movimento | null {
  const valor = lerValor(f.get('amount')), data = String(f.get('date') || dia(hoje)), posto = String(f.get('station') || '').trim();
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return { id: Date.now(), title: posto ? `Combustível — ${posto}` : 'Combustível', detail: `${diaEMes(data)} · Combustível`, amount: -valor, kind: 'car', movementType: 'expense', date: data };
}

/** Despesa veterinária a partir do formulário (`null` se o valor não for válido). */
export function novaDespesaVet(f: FormData, hoje: Date): Movimento | null {
  const animal = String(f.get('pet') || ANIMAIS[0]), titulo = String(f.get('title') || '').trim() || 'Despesa veterinária';
  const clinica = String(f.get('clinic') || '').trim(), categoria = String(f.get('vetCategory') || 'Consultas');
  const valor = lerValor(f.get('amount')), data = String(f.get('date') || dia(hoje));
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return { id: Date.now(), title: titulo, detail: `${diaEMes(data)} · ${clinica || categoria}`, amount: -valor, kind: 'health', movementType: 'expense', date: data, pet: animal, vetCategory: categoria };
}

const submeter = (criar: (f: FormData, hoje: Date) => Movimento | null, aoGuardar: (m: Movimento) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const m = criar(new FormData(e.currentTarget), new Date());
  if (m) aoGuardar(m);
};

export function NovoAbastecimento({ aberto, aoMudar, aoGuardar }: PropsJanela) {
  return (
    <Dialogo aberto={aberto} aoMudar={aoMudar} className="movement-dialog" titulo="Novo abastecimento" descricao="Registe um gasto de combustível.">
      <form className="movement-form" onSubmit={submeter(novoAbastecimento, aoGuardar)}>
        <div className="form-grid">
          <label>Data<input name="date" type="date" defaultValue={dia(new Date())} required /></label>
          <CampoValor />
        </div>
        <label>Posto<input name="station" placeholder="Ex.: Galp (opcional)" /></label>
        <Acoes cancelar={() => aoMudar(false)} />
      </form>
    </Dialogo>
  );
}

export function NovaDespesaVet({ aberto, aoMudar, aoGuardar, animal }: PropsJanela & { animal: string | null }) {
  return (
    <Dialogo aberto={aberto} aoMudar={aoMudar} className="movement-dialog" titulo="Nova despesa veterinária" descricao="Registe uma consulta, medicação ou outro cuidado.">
      <form className="movement-form" onSubmit={submeter(novaDespesaVet, aoGuardar)}>
        <div className="form-grid">
          <label>
            Animal
            <select name="pet" defaultValue={animal || ANIMAIS[0]}>
              {ANIMAIS.map((a) => <option key={a}>{a}</option>)}
              <option>A confirmar</option>
            </select>
          </label>
          <label>Categoria<select name="vetCategory">{CATEGORIAS_VET.map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
        <div className="form-grid">
          <label>Data<input name="date" type="date" defaultValue={dia(new Date())} required /></label>
          <CampoValor />
        </div>
        <label>Descrição<input name="title" placeholder="Ex.: consulta, medicação..." /></label>
        <label>Local / clínica<input name="clinic" placeholder="Opcional" /></label>
        <label>Origem do dinheiro<select name="source"><option>Conta principal</option><option>Revolut</option></select></label>
        <label className="checkbox-row"><input name="affectsBalance" type="checkbox" defaultChecked /> Atualiza saldo da conta de origem</label>
        <Acoes cancelar={() => aoMudar(false)} />
      </form>
    </Dialogo>
  );
}
