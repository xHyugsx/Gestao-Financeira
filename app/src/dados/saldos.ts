// Saldos das contas, com as mesmas regras da 1.9.x (secção 3 do CLAUDE.md):
// saldo guardado + movimentos com efeito no saldo. Os saldos acumulam todos os meses,
// por isso o da Edenred transita de mês para mês e nunca volta a zero.
import { anoMes, MESES } from './datas';
import type { Conta, Movimento } from './esquema';

/** Total gasto (despesas em valor absoluto). */
export function gastos(movimentos: Movimento[]): number {
  return movimentos.filter((m) => m.movementType === 'expense').reduce((s, m) => s + Math.abs(m.amount), 0);
}

/** Efeito de um movimento no saldo da conta Principal. */
export function efeitoNaPrincipal(m: Movimento): number {
  if (m.affectsBalance === false) return 0;
  if (m.revolut) return -(m.transferValue || 0);
  if (m.movementType === 'transfer') return 0;
  if (m.account && m.account !== 'principal') return 0;
  return m.amount;
}

/** Soma dos movimentos de uma conta que não é a Principal (opcionalmente só de um mês "AAAA-MM"). */
export function movimentosDaConta(movimentos: Movimento[], id: string | undefined, mes?: string): number {
  return movimentos
    .filter((m) => m.account === id && m.affectsBalance !== false && m.movementType !== 'transfer' && !m.revolut
      && (!mes || m.date?.startsWith(mes)))
    .reduce((s, m) => s + m.amount, 0);
}

/** Transferências feitas para a Revolut Conjunta (opcionalmente só de um mês). */
function transferenciasParaConjunta(movimentos: Movimento[], mes?: string): number {
  return movimentos
    .filter((m) => m.revolut?.holder === 'Conjunta' && m.affectsBalance !== false && (!mes || m.date?.startsWith(mes)))
    .reduce((s, m) => s + (m.transferValue || 0), 0);
}

export interface SaldoConta {
  /** Saldo atual. */
  atual: number;
  /** Saldo no fim do mês anterior (para a tendência). */
  anterior: number;
  /** A conta foi criada este mês. */
  nova: boolean;
  /** Nome do mês anterior ("agosto"). */
  mesAnterior: string;
}

export function saldoDaConta(conta: Conta | undefined, movimentos: Movimento[], hoje: Date): SaldoConta {
  const mes = anoMes(hoje);
  const id = conta?.id;
  let atual = conta?.balance ?? 0;
  let doMes: number;
  if (id === 'principal') {
    atual += movimentos.reduce((s, m) => s + efeitoNaPrincipal(m), 0);
    doMes = movimentos.filter((m) => m.date?.startsWith(mes)).reduce((s, m) => s + efeitoNaPrincipal(m), 0);
  } else if (id === 'revolut') {
    atual += transferenciasParaConjunta(movimentos) + movimentosDaConta(movimentos, 'revolut');
    doMes = transferenciasParaConjunta(movimentos, mes) + movimentosDaConta(movimentos, 'revolut', mes);
  } else {
    atual += movimentosDaConta(movimentos, id);
    doMes = movimentosDaConta(movimentos, id, mes);
  }
  return {
    atual,
    anterior: atual - doMes - (conta?.adj?.[mes] || 0),
    nova: conta?.createdAt === mes,
    mesAnterior: MESES[(hoje.getMonth() + 11) % 12]!,
  };
}

/** Variação percentual face ao mês anterior; `null` quando não há base de comparação. */
export function tendencia(s: SaldoConta): number | null {
  return s.anterior ? ((s.atual - s.anterior) / Math.abs(s.anterior)) * 100 : null;
}

/** Limite do aviso de saldo baixo (150 € na Principal e Revolut, 50 € na Edenred, se não houver outro). */
export function limiteSaldoBaixo(c: Conta | undefined): number | null {
  if (c?.lowAt !== undefined) return c.lowAt;
  if (c?.id === 'principal' || c?.id === 'revolut') return 150;
  return /edenred/i.test(c?.name || '') ? 50 : null;
}
