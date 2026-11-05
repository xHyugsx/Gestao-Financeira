// Editar uma despesa anual (v2.57.1): tocar na linha abre esta janela (descrição, valor, valor variável e mês previsto).
import { useEffect, useState } from 'react';
import { lerValor } from '../movimentos/regras';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import type { DespesaAnual } from './anuais';

const mesInput = (e: DespesaAnual) => `${e.year}-${String(e.month).padStart(2, '0')}`;

export function EditarAnual({ despesa: e, fechar, guardar, eliminar }: {
  despesa: DespesaAnual | null; fechar: () => void; guardar: (d: DespesaAnual) => void; eliminar: (d: DespesaAnual) => void;
}) {
  const [variavel, setVariavel] = useState(false);
  const [erro, setErro] = useState('');
  useEffect(() => { if (e) { setVariavel(!!e.variable); setErro(''); } }, [e]);
  return (
    <Dialogo folha aberto={e !== null} aoMudar={(a) => { if (!a) fechar(); }} className="movement-dialog ffanu-editar" titulo="Editar despesa anual" descricao={e?.name ?? ''}>
      {e ? (
        <form
          key={e.id} className="vet-breakdown ffanu-form"
          onSubmit={(ev) => {
            ev.preventDefault();
            const f = new FormData(ev.currentTarget);
            const nome = String(f.get('name') || '').trim(), texto = String(f.get('value') || '').trim(), valor = texto ? lerValor(texto) : 0;
            const [ano, mes] = String(f.get('month') || '').split('-').map(Number);
            if (!nome || !ano || !mes) { setErro('Preenche a descrição e o mês previsto.'); return; }
            if (!Number.isFinite(valor) || (!valor && !variavel)) { setErro('Valor inválido. Use, por exemplo, 150 ou 1.234,56.'); return; }
            const { variable: _v, ...resto } = e;
            guardar({ ...resto, name: nome, value: Math.abs(valor), month: mes, year: ano, ...(variavel ? { variable: true } : {}) });
          }}
        >
          <label className="grid gap-1 text-xs">Descrição<input name="name" required defaultValue={e.name} className="rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="grid gap-1 text-xs">{variavel ? 'Valor estimado (€, opcional)' : 'Valor (€)'}
            <input name="value" inputMode="decimal" placeholder="0,00" defaultValue={e.value ? String(e.value).replace('.', ',') : ''} className="rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="checkbox-row text-xs"><input type="checkbox" checked={variavel} onChange={(x) => setVariavel(x.target.checked)} /> Valor variável (a definir todos os anos)</label>
          <label className="grid gap-1 text-xs">Mês previsto<input name="month" type="month" required defaultValue={mesInput(e)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
          {erro ? <p className="text-xs ffanu-erro" role="alert">{erro}</p> : null}
          <div className="dialog-actions">
            <Botao type="button" variante="ghost" onClick={() => eliminar(e)}>Eliminar</Botao>
            <Botao type="submit">Guardar</Botao>
          </div>
        </form>
      ) : null}
    </Dialogo>
  );
}
