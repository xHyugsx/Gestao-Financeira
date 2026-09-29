// Registar, editar e eliminar movimentos — mesmas regras e mesmo formato gravado que a app atual.
import { dia, MESES, type Movimento, type TipoMovimento } from '../dados';

/** Interpreta valores escritos à portuguesa: "621,18", "1.234,56", "1.234", "12 €". */
export function lerValor(v: unknown): number {
  let s = String(v ?? '').replace(/[€\s ]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return Number(s);
}

/** "12 setembro" a partir de "AAAA-MM-DD" (meio-dia, para não mudar de dia com o fuso). */
function diaEMes(data: string): string {
  const d = new Date(`${data}T12:00:00`);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function tipoVisual(tipo: TipoMovimento, categoria: string): string {
  if (tipo === 'transfer') return 'transfer';
  if (tipo === 'income') return 'income';
  return categoria === 'Transportes' ? 'car' : categoria === 'Habitação' ? 'home' : categoria === 'Saúde' ? 'health'
    : categoria === 'Lazer' ? 'leisure' : 'shop';
}

export interface ContextoNovo {
  tipo: TipoMovimento;
  /** Categoria escolhida (usada quando o formulário não tem o campo, p. ex. nas transferências). */
  categoria: string;
  recorrente: boolean;
  /** "com" ou "sem" valor (só nos recorrentes). */
  tipoValor: string;
  revolut: boolean;
  hoje: Date;
  id: number;
}

export type ErroCampo = [campo: string, mensagem: string];

/** Movimento novo a partir dos campos do formulário "Novo movimento", ou o campo com erro. */
export function novoMovimento(campos: FormData, c: ContextoNovo): Movimento | ErroCampo {
  const nota = String(campos.get('note') || '').trim().slice(0, 140);
  const titulo = String(campos.get('title') || '').trim();
  const valor = lerValor(campos.get('amount'));
  const data = String(campos.get('date') || dia(c.hoje));
  const categoria = String(campos.get('category') || c.categoria);
  const semValor = c.recorrente && c.tipoValor === 'sem';
  if (!titulo) return ['title', 'Indique uma descrição.'];
  if (!Number.isFinite(valor) || valor < 0 || (valor === 0 && !semValor)) {
    return ['amount', 'Valor inválido. Use, por exemplo, 621,18 ou 1.234,56.'];
  }
  const afetaSaldo = campos.get('affectsBalance') === 'on';
  const extras = { ...(c.recorrente ? { recurring: c.tipoValor } : {}), ...(nota ? { note: nota } : {}) };
  if (c.revolut) {
    const revolut = { holder: String(campos.get('revolutHolder') || 'Conjunta'), purpose: String(campos.get('revolutPurpose') || 'Carregamento') };
    return {
      id: c.id, title: titulo, detail: `${diaEMes(data)} · Revolut ${revolut.holder} · ${revolut.purpose}`, amount: 0, kind: 'transfer',
      movementType: 'transfer', date: data, affectsBalance: afetaSaldo, revolut, transferValue: valor, ...extras,
    };
  }
  const conta = String(campos.get('account') || 'principal');
  return {
    id: c.id, title: titulo, detail: `${diaEMes(data)} · ${c.tipo === 'transfer' ? 'Transferência' : categoria}`,
    amount: c.tipo === 'expense' ? -valor : c.tipo === 'income' ? valor : 0, kind: tipoVisual(c.tipo, categoria),
    movementType: c.tipo, date: data, affectsBalance: afetaSaldo,
    ...(conta !== 'principal' && c.tipo !== 'transfer' ? { account: conta } : {}), ...extras,
  };
}

/** Movimento alterado a partir do formulário "Editar movimento"; `null` se os dados não forem válidos. */
export function movimentoEditado(m: Movimento, campos: FormData): Movimento | null {
  const titulo = String(campos.get('title') || '').trim();
  const valor = Math.abs(lerValor(campos.get('amount')));
  const data = String(campos.get('date') || m.date);
  const categoria = String(campos.get('category') || '').trim();
  const conta = campos.get('account');
  const nota = String(campos.get('note') ?? '').trim().slice(0, 140);
  if (!titulo || !Number.isFinite(valor)) return null;
  return {
    ...m, title: titulo, amount: m.movementType === 'expense' ? -valor : m.movementType === 'income' ? valor : m.amount, date: data,
    note: nota || undefined, ...(m.revolut ? { transferValue: valor } : {}),
    ...(conta != null ? { account: conta === 'principal' ? undefined : String(conta) } : {}),
    detail: `${diaEMes(data)} · ${categoria || 'Outros'}`,
  };
}

/** Categorias sugeridas ao editar. */
export function categoriasParaEditar(categorias: string[], receitas: string[]): string[] {
  return [...new Set([...categorias, ...receitas, 'Combustível', 'Supermercado', 'Transferência'])];
}
