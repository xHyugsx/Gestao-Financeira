import { useMemo, useState } from 'react';
import { anoMes, type Estado } from '../dados';
import { formatarEuros } from '../ui/formatos';
import { Escolhas, Rotulo } from '../ui/Escolhas';
import { COMBUSTIVEIS, ultimosAbastecimentos, viaturasDe } from './viaturas';

/**
 * Viatura e combustível de um abastecimento, em botões (v2.45.0). Num registo novo pré-escolhe a viatura do último
 * abastecimento e, ao trocar de viatura, o combustível usado da última vez nessa viatura (enquanto não se escolher à mão).
 */
export function CamposCombustivel({ estado, viatura, combustivel }: { estado: Estado; viatura?: string; combustivel?: string }) {
  const viaturas = viaturasDe(estado);
  const ultimos = useMemo(() => ultimosAbastecimentos(estado.transactions), [estado.transactions]);
  const novo = viatura === undefined;
  const inicial = novo ? (viaturas.some((v) => v.name === ultimos.viatura) ? ultimos.viatura : viaturas[0]?.name ?? '') : viatura;
  const [v, setV] = useState(inicial);
  const [c, setC] = useState(novo ? ultimos.combustivel[inicial] ?? 'gasolina' : combustivel ?? '');
  const [cMao, setCMao] = useState(!novo && !!combustivel);
  const mes = anoMes(new Date());
  const doMes = (nome: string) => estado.transactions.filter((m) => m.vehicle === nome && m.date.startsWith(mes)).reduce((s, m) => s + Math.abs(m.amount), 0);
  const opcoes = [...viaturas, ...(viatura && !viaturas.some((x) => x.name === viatura) ? [{ name: viatura, type: 'carro' }] : [])];
  return (
    <div className="ffcombustivel">
      <Rotulo>Viatura</Rotulo>
      {opcoes.length ? (
        <Escolhas
          nome="vehicle" rotulo="Viatura" classe="ffviaturas" valor={v}
          aoMudar={(x) => { setV(x); const f = ultimos.combustivel[x]; if (f && !cMao) setC(f); }}
          opcoes={[...opcoes.map((o) => ({ valor: o.name, rotulo: o.name, icone: o.type === 'mota' ? 'bike' as const : 'car' as const, sub: `${formatarEuros(doMes(o.name), estado.hideValues)} este mês` })), { valor: '', rotulo: 'Sem viatura', sub: 'não conta nos carros' }]}
        />
      ) : <><input type="hidden" name="vehicle" value="" /><small className="ffv2-sugestao">Acrescente as viaturas em Definições › Perfil e família.</small></>}
      <Rotulo>Combustível</Rotulo>
      <Escolhas nome="fuel" rotulo="Combustível" valor={c} aoMudar={(x) => { setC(x); setCMao(true); }} opcoes={[...COMBUSTIVEIS.map((o) => ({ valor: o.valor, rotulo: o.rotulo })), { valor: '', rotulo: '—' }]} />
    </div>
  );
}
