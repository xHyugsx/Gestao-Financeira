// Widgets do ecrã inicial (APK): a app calcula os textos (os mesmos números da Principal) e o plugin nativo
// WidgetPlugin guarda-os e redesenha os widgets. Com «Valores ocultos» ligado, os widgets não mostram valores.
import { registerPlugin } from '@capacitor/core';
import { anoMes, dia, type Estado, gastos, inicioDoMes, MESES, mesDoRendimento, rendimentoDoMes } from '../dados';
import { semSaltados } from '../movimentos/recorrentes';
import { calorDoMes } from '../paginas/calculos';
import { formatarEuros } from '../ui/formatos';
import { eNativo } from './plataforma';

export type PontoWidget = 'q1' | 'q2' | 'q3' | 'q4' | 'sem' | 'futuro';

export interface DadosWidget {
  mes: string;
  rendimentoRotulo: string;
  rendimento: string;
  gastos: string;
  comparacao: string;
  pontos: PontoWidget[];
  hoje: number;
  ocultos: boolean;
}

export function dadosDoWidget(estado: Estado, hoje = new Date()): DadosWidget {
  const e = semSaltados(estado), ocultos = !!estado.hideValues;
  const mes = inicioDoMes(hoje, 0), am = anoMes(mes);
  const mesR = mesDoRendimento(e, mes, hoje), r = rendimentoDoMes(e, mesR);
  const doMes = e.transactions.filter((m) => m.date?.startsWith(am));
  const total = gastos(doMes);
  // Comparação com o mês anterior até ao mesmo dia
  const anterior = inicioDoMes(hoje, -1), diaLimite = Math.min(hoje.getDate(), new Date(anterior.getFullYear(), anterior.getMonth() + 1, 0).getDate());
  const ateDia = `${anoMes(anterior)}-${String(diaLimite).padStart(2, '0')}`;
  const antes = gastos(e.transactions.filter((m) => m.date?.startsWith(anoMes(anterior)) && m.date <= ateDia));
  const p = antes ? Math.round(((total - antes) / antes) * 100) : null;
  const comparacao = ocultos || p === null ? MESES[mes.getMonth()]! : `${MESES[mes.getMonth()]} · ${p === 0 ? '=' : `${p > 0 ? '↑' : '↓'} ${Math.abs(p)}%`}`;
  // Pontos da semana (segunda a domingo), com os níveis do Calendário
  const calor = calorDoMes(e.transactions, mes, hoje), calorAnt = calorDoMes(e.transactions, inicioDoMes(hoje, -1), hoje);
  const segunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const pontos = Array.from({ length: 7 }, (_, i): PontoWidget => {
    const d = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + i);
    if (dia(d) > dia(hoje)) return 'futuro';
    const n = (anoMes(d) === am ? calor : calorAnt).nivel[d.getDate()] ?? 0;
    return n ? (`q${n}` as PontoWidget) : 'sem';
  });
  return {
    mes: MESES[mes.getMonth()]!,
    rendimentoRotulo: anoMes(mesR) === am ? 'Rendimento' : `Rendimento de ${MESES[mesR.getMonth()]}`,
    rendimento: ocultos ? '••••••' : formatarEuros(r.valor),
    gastos: ocultos ? '••••••' : formatarEuros(total),
    comparacao,
    pontos,
    hoje: (hoje.getDay() + 6) % 7,
    ocultos,
  };
}

const Widget = registerPlugin<{ atualizar(o: { dados: string }): Promise<void> }>('Widget');
let ultimo = '';

/** Envia os dados para os widgets (só se mudaram). */
export async function atualizarWidget(estado: Estado): Promise<void> {
  if (!eNativo()) return;
  try {
    const dados = JSON.stringify(dadosDoWidget(estado));
    if (dados === ultimo) return;
    await Widget.atualizar({ dados });
    ultimo = dados;
  } catch { /* sem widgets */ }
}
