import { describe, expect, it } from 'vitest';
import { estadoInicial, type Movimento } from '../dados';
import { aplicarJuncao, novoLote, prepararJuncao, semJuncao, ultimaJuncao } from './juntar';

const m = (id: number | string, title: string, date: string, amount: number, extra: Partial<Movimento> = {}): Movimento =>
  ({ id, title, date, amount, detail: `1 setembro · ${amount < 0 ? 'Alimentação' : 'Salário'}`, movementType: amount < 0 ? 'expense' : 'income', ...extra });

describe('juntar movimentos de outro telemóvel', () => {
  const locais = [m(1, 'Mercado', '2026-09-01', -10), m(2, 'Café', '2026-09-02', -1), m(3, 'Banco', '2026-09-03', -5, { importKey: 'k1' })];

  it('só entram os que não existem (id, linha do extrato ou data/valor/título)', () => {
    const outros = [m(1, 'Mercado', '2026-09-01', -10), m(89, 'Café', '2026-09-02', -1), m(90, ' mercado', '2026-09-01', -10), m(91, 'Outro banco', '2026-09-03', -5, { importKey: 'k1' }),
      m(92, 'Farmácia', '2026-09-04', -7), 'lixo', { title: 'sem valor' }];
    const j = prepararJuncao(locais, outros);
    expect(j.novos.map((x) => x.id)).toEqual([90, 92]);  // o 89 é o «Café» daqui; o 90 é um segundo «Mercado» igual: aqui só há um
    expect(j.repetidos).toBe(3);
  });

  it('movimentos iguais repetidos: entra só a diferença', () => {
    const outros = [m(80, 'Café', '2026-09-02', -1), m(81, 'Café', '2026-09-02', -1)];
    expect(prepararJuncao(locais, outros).novos.map((x) => x.id)).toEqual([81]);
  });

  it('sem data: usa a data do detalhe, como no restauro', () => {
    const j = prepararJuncao([], [{ id: 5, title: 'X', amount: -1, detail: '3 setembro · Lazer' }]);
    expect(j.novos[0]!.date).toMatch(/^\d{4}-09-03$/);
  });

  it('aplicar: não mexe nos saldos, marca o lote, pára a série dos recorrentes e acrescenta categorias', () => {
    const s = { ...estadoInicial(), transactions: locais };
    const novos = [m(92, 'Farmácia', '2026-09-04', -7, { detail: '4 setembro · Farmácia', recurring: true, recurringEvery: 1 }), m(93, 'Prémio', '2026-09-05', 50, { detail: '5 setembro · Prémios', affectsBalance: true })];
    const r = aplicarJuncao(s, novos, 'juntar-2026-10-01T10:00:00.000Z');
    expect(r.transactions).toHaveLength(5);
    expect(r.transactions.slice(0, 2).every((x) => x.affectsBalance === false && x.mergeBatch === 'juntar-2026-10-01T10:00:00.000Z')).toBe(true);
    expect(r.transactions[0]!.recurringDone).toBe(true);
    expect(r.transactions[1]!.recurringDone).toBeUndefined();
    expect(r.categories).toContain('Farmácia');
    expect(r.incomeCategories).toContain('Prémios');
    expect(r.accounts).toBe(s.accounts);
  });

  it('desfazer a última junção', () => {
    const a = novoLote(new Date('2026-10-01T10:00:00Z')), b = novoLote(new Date('2026-10-02T10:00:00Z'));
    const l = [...locais, m(10, 'A', '2026-09-01', -1, { mergeBatch: a }), m(11, 'B', '2026-09-01', -1, { mergeBatch: b })];
    expect(ultimaJuncao(l)).toBe(b);
    expect(semJuncao(l, b).map((x) => x.id)).toEqual([1, 2, 3, 10]);
    expect(ultimaJuncao(locais)).toBe('');
  });

  it('os saltados daqui não contam como já existentes; os saltados do outro telemóvel não entram', () => {
    const saltado: Movimento = { id: 1, title: 'Renda', detail: '1 outubro · Habitação', amount: -600, date: '2026-10-01', movementType: 'expense', skipped: true };
    const real = { id: 99, title: 'Renda', detail: '1 outubro · Habitação', amount: -600, date: '2026-10-01', movementType: 'expense' };
    expect(prepararJuncao([saltado], [real]).novos.map((x) => x.id)).toEqual([99]);
    expect(prepararJuncao([], [{ ...real, id: 98, skipped: true }]).novos).toEqual([]);
  });
});

