// Recorrentes e subscrições (Resumo › Recorrentes): o que já se pagou e o que falta pagar no mês, e o custo anual.
// Uma «série» junta os movimentos recorrentes com o mesmo título (despesas ou transferências para a Revolut).
// Séries de valor variável: usam a média dos últimos 3 valores (estimativa) enquanto o valor do mês não é confirmado.
// Cópias saltadas («só este mês»): contam para as datas da série, mas não aparecem nem entram nos valores.
import { anoMes, dia, type Movimento } from '../dados';
import { estimativa, PERIODICIDADES, porConfirmar, serieDe, somarMeses, valorRecorrente as valorDe } from '../movimentos/recorrentes';

export type EstadoRecorrente = 'pago' | 'por pagar' | 'atrasado' | 'por confirmar' | 'agendado';

export interface Recorrente {
  titulo: string;
  /** Valor da última vez, ou a estimativa nas séries de valor variável (0 = «a definir»). */
  valor: number;
  /** O valor é uma estimativa (série de valor variável ainda por confirmar). */
  estimado: boolean;
  /** Meses entre pagamentos. */
  cada: number;
  periodicidade: string;
  /** Dia do mês previsto (ou em que foi pago). */
  dia: number;
  estado: EstadoRecorrente;
  /** Subida face ao pagamento anterior, em % (só se subiu mais de 1%). */
  subiu: number | null;
  /** Último movimento da série (para abrir ao tocar). */
  movimento: Movimento;
}

export interface Recorrentes {
  lista: Recorrente[];
  pago: number;
  falta: number;
  /** Custo anual de todas as séries ativas (valor × pagamentos por ano). */
  anual: number;
}

const rotulo = (cada: number) => PERIODICIDADES.find((p) => p.meses === cada)?.rotulo ?? `A cada ${cada} meses`;

export function recorrentesDoMes(movimentos: Movimento[], mes: Date, hoje = new Date()): Recorrentes {
  const series = new Map<string, Movimento[]>();
  for (const m of movimentos) {
    if (!m.recurring || !m.date || !(m.movementType === 'expense' || m.revolut)) continue;
    const k = serieDe(m);
    series.set(k, [...(series.get(k) ?? []), m]);
  }
  const alvo = anoMes(mes), atual = anoMes(hoje), hojeDia = dia(hoje);
  const lista: Recorrente[] = [];
  let anual = 0;
  for (const l of series.values()) {
    l.sort((a, b) => a.date.localeCompare(b.date) || (+a.id || 0) - (+b.id || 0));
    const ultimo = l[l.length - 1]!, cada = ultimo.recurringEvery && ultimo.recurringEvery > 0 ? ultimo.recurringEvery : 1;
    // Série terminada: o pagamento seguinte devia ter sido há mais de um mês (face a hoje)
    const seguinte = somarMeses(ultimo.date, cada);
    if (anoMes(new Date(`${seguinte}T12:00:00`)) < anoMes(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1))) continue;
    const feitos = l.filter((m) => !m.skipped), ref = feitos[feitos.length - 1] ?? ultimo;
    const variavel = ultimo.recurring === 'sem', estimado = estimativa(feitos.map(valorDe));
    const valorPrevisto = variavel ? estimado : valorDe(ref);
    anual += valorPrevisto * (12 / cada);
    const anterior = feitos.length > 1 ? valorDe(feitos[feitos.length - 2]!) : 0;
    const subiu = !variavel && anterior > 0 && valorDe(ref) > anterior * 1.01 ? ((valorDe(ref) - anterior) / anterior) * 100 : null;
    const doMes = l.filter((m) => m.date.startsWith(alvo));
    const base = { titulo: ref.title.trim(), cada, periodicidade: rotulo(cada), subiu, movimento: ref };
    if (doMes.length) {
      for (const m of doMes.filter((x) => !x.skipped)) {
        const d = Number(m.date.slice(8, 10));
        // Data futura: ainda não saiu do saldo (agendado); valor 0 numa série variável: falta confirmar
        const semValor = porConfirmar(m), estado = m.date > hojeDia ? 'agendado' : semValor ? 'por confirmar' : 'pago';
        lista.push({ ...base, valor: semValor ? estimado : valorDe(m), estimado: semValor, dia: d, estado, movimento: m });
      }
      continue;
    }
    if (alvo < atual) continue;  // meses passados: só o que foi pago
    // Próximo pagamento a partir do último: cai neste mês?
    let previsto = seguinte;
    while (previsto.slice(0, 7) < alvo) previsto = somarMeses(previsto, cada);
    if (previsto.slice(0, 7) !== alvo && !(alvo === atual && seguinte < `${alvo}-01`)) continue;
    const data = previsto.slice(0, 7) === alvo ? previsto : seguinte;
    lista.push({ ...base, valor: valorPrevisto, estimado: variavel, dia: Number(data.slice(8, 10)), estado: data < hojeDia && alvo === atual ? 'atrasado' : 'por pagar' });
  }
  lista.sort((a, b) => a.dia - b.dia || a.titulo.localeCompare(b.titulo));
  const soma = (e: EstadoRecorrente[]) => lista.filter((r) => e.includes(r.estado)).reduce((s, r) => s + r.valor, 0);
  // Por confirmar e agendado contam em «falta pagar»: ainda não saíram do saldo
  return { lista, pago: soma(['pago']), falta: soma(['por pagar', 'atrasado', 'por confirmar', 'agendado']), anual };
}
