import { useMemo, useState } from 'react';
import type { Estado } from '../dados';
import { COMBUSTIVEIS, ultimosAbastecimentos, viaturasDe } from './viaturas';

/**
 * Viatura e combustível de um abastecimento. Num registo novo pré-escolhe a viatura do último abastecimento e, ao
 * trocar de viatura, o combustível usado da última vez nessa viatura (enquanto não se escolher à mão).
 */
export function CamposCombustivel({ estado, viatura, combustivel }: { estado: Estado; viatura?: string; combustivel?: string }) {
  const viaturas = viaturasDe(estado);
  const ultimos = useMemo(() => ultimosAbastecimentos(estado.transactions), [estado.transactions]);
  const novo = viatura === undefined;
  const inicial = novo ? (viaturas.some((v) => v.name === ultimos.viatura) ? ultimos.viatura : viaturas[0]?.name ?? '') : viatura;
  const [v, setV] = useState(inicial);
  const [c, setC] = useState(novo ? ultimos.combustivel[inicial] ?? 'gasolina' : combustivel ?? '');
  const [cMao, setCMao] = useState(!novo && !!combustivel);
  const opcoes = [...viaturas, ...(viatura && !viaturas.some((x) => x.name === viatura) ? [{ name: viatura, type: 'carro' }] : [])];
  return (
    <>
      <div className="form-grid ffcombustivel">
        <label>Viatura
          <select name="vehicle" value={v} onChange={(x) => { setV(x.target.value); const f = ultimos.combustivel[x.target.value]; if (f && !cMao) setC(f); }}>
            <option value="">Sem viatura</option>
            {opcoes.map((o) => <option key={o.name} value={o.name}>{`${o.name}${o.type === 'mota' ? ' (mota)' : ''}`}</option>)}
          </select>
        </label>
        <label>Combustível
          <select name="fuel" value={c} onChange={(x) => { setC(x.target.value); setCMao(true); }}>
            <option value="">—</option>
            {COMBUSTIVEIS.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        </label>
      </div>
      {!viaturas.length ? <small className="ffv2-sugestao">Acrescente as viaturas em Definições › Perfil e família.</small> : null}
    </>
  );
}
