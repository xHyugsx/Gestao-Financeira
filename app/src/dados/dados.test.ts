import { describe, expect, it, vi } from 'vitest';
import {
  acertarSaldo, aplicarBackup, chave, type Conta, criarBackup, dataPorOmissao, estadoInicial, gravarDados, hashPin, lerBackup, lerDados,
  limiteSaldoBaixo, type Movimento, normalizar, paraGravar, pinValido, PREFIXO_V2, rendimentoDoMes,
  salariosDoMes, saldoDaConta,
} from './index';

const mov = (m: Partial<Movimento>): Movimento =>
  ({ id: 1, title: 'X', detail: '1 setembro · Outros', amount: -1, date: '2026-09-01', movementType: 'expense', ...m });

function memoria(inicial: Record<string, string> = {}) {
  const m = new Map(Object.entries(inicial));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe('chaves', () => {
  it('usam o prefixo real por omissão e o da V2 quando pedido', () => {
    expect(chave('dados')).toBe('financas-familiar:v3');
    expect(chave('conversaJarvis')).toBe('financas-familiar:jarvis-threads:v2');
    expect(chave('dados', PREFIXO_V2)).toBe('financas-v2:v3');
  });
});

describe('PIN', () => {
  it('hash = SHA-256("financas-familiar:" + PIN), igual ao da 1.9.x', async () => {
    expect(await hashPin('1234')).toBe('0a18a95c73613dfd755fe4e422d74f85b22f9802f6c4fb31215e45adecf5c80a');
  });
  it('aceita só 4 algarismos', () => {
    expect(pinValido('0000')).toBe(true);
    expect(pinValido('123')).toBe(false);
    expect(pinValido('12a4')).toBe(false);
  });
});

describe('leitura e gravação', () => {
  it('sem dados ou com dados inválidos arranca com os valores por omissão', () => {
    expect(lerDados(memoria())).toEqual(estadoInicial());
    expect(lerDados(memoria({ 'financas-familiar:v3': '{inválido' }))).toEqual(estadoInicial());
    expect(lerDados({ getItem: () => { throw new Error('bloqueado'); }, setItem: () => {} })).toEqual(estadoInicial());
  });

  it('lê do prefixo pedido e nunca do outro', () => {
    const a = memoria({ 'financas-familiar:v3': JSON.stringify({ transactions: [mov({ title: 'Real' })] }) });
    expect(lerDados(a, PREFIXO_V2).transactions).toEqual([]);
    expect(lerDados(a).transactions[0]?.title).toBe('Real');
  });

  it('movimentos sem data recebem o dia do detail em setembro de 2026 (herdado da 1.9.x)', () => {
    expect(dataPorOmissao('12 setembro · X')).toBe('2026-09-12');
    expect(dataPorOmissao(undefined)).toBe('2026-09-01');
  });

  it('preserva campos desconhecidos no topo, nos movimentos e nas contas', () => {
    const s = normalizar({
      futuro: [1, 2],
      transactions: [mov({ etiqueta: 'a' })],
      accounts: [{ id: 'principal', name: 'Principal', cor: 'azul' }, { id: 'revolut', name: 'Revolut' }],
    });
    const g = paraGravar(s) as Record<string, any>;
    expect(g.futuro).toEqual([1, 2]);
    expect(g.transactions[0].etiqueta).toBe('a');
    expect(g.accounts[0].cor).toBe('azul');
    expect(g.accounts[1].name).toBe('Revolut Conjunta');
  });

  it('só grava pinHash quando existe', () => {
    expect('pinHash' in paraGravar(estadoInicial())).toBe(false);
    expect(paraGravar({ ...estadoInicial(), pinHash: 'abc' }).pinHash).toBe('abc');
  });

  it('grava na chave do prefixo e avisa quando falha', () => {
    const a = memoria(), ok = vi.fn();
    expect(gravarDados(a, estadoInicial(), { prefixo: PREFIXO_V2, aoGravar: ok })).toBe(true);
    expect([...a.m.keys()]).toEqual(['financas-v2:v3']);
    expect(ok).toHaveBeenCalledOnce();
    const falha = vi.fn();
    const cheio = { getItem: () => null, setItem: () => { throw new DOMException('cheio', 'QuotaExceededError'); } };
    expect(gravarDados(cheio, estadoInicial(), { aoFalhar: falha })).toBe(false);
    expect(falha).toHaveBeenCalledOnce();
  });
});

describe('saldos', () => {
  const hoje = new Date(2026, 8, 28);

  it('o saldo da Edenred transita de mês para mês (nunca volta a zero)', () => {
    const edenred = { id: 'edenred', name: 'Edenred', balance: 100 };
    const ms = [mov({ account: 'edenred', amount: -30, date: '2026-07-10' }), mov({ account: 'edenred', amount: -20, date: '2026-08-10' })];
    const s = saldoDaConta(edenred, ms, hoje);
    expect(s.atual).toBe(50);
    expect(s.anterior).toBe(50);
  });

  it('movimentos importados (affectsBalance:false) e transferências não mexem no saldo', () => {
    const p = { id: 'principal', name: 'Principal', balance: 100 };
    const ms = [mov({ amount: -40, affectsBalance: false }), mov({ amount: 0, movementType: 'transfer', transferValue: 50 }), mov({ amount: -10 })];
    expect(saldoDaConta(p, ms, hoje).atual).toBe(90);
  });

  it('transferência para a Revolut Conjunta sai da Principal e entra na Revolut', () => {
    const ms = [mov({ amount: 0, movementType: 'transfer', transferValue: 70, revolut: { holder: 'Conjunta' } })];
    expect(saldoDaConta({ id: 'principal', name: 'Principal', balance: 100 }, ms, hoje).atual).toBe(30);
    expect(saldoDaConta({ id: 'revolut', name: 'Revolut Conjunta', balance: 0 }, ms, hoje).atual).toBe(70);
  });

  it('limite do aviso de saldo baixo', () => {
    expect(limiteSaldoBaixo({ id: 'principal', name: 'Principal' })).toBe(150);
    expect(limiteSaldoBaixo({ id: 'x', name: 'Cartão Edenred' })).toBe(50);
    expect(limiteSaldoBaixo({ id: 'x', name: 'Outra', lowAt: 10 })).toBe(10);
    expect(limiteSaldoBaixo({ id: 'x', name: 'Outra' })).toBeNull();
  });
});

describe('rendimento', () => {
  const dados = {
    salaries: { '2025': { A: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1000] }, '2026': { A: [1100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], B: [900] } },
    transactions: [mov({ title: 'Vencimento', amount: 750, movementType: 'income', date: '2026-02-25', detail: '25 fevereiro · Outras receitas' })],
  };

  it('rendimento de janeiro = salários de dezembro do ano anterior', () => {
    expect(rendimentoDoMes(dados, new Date(2026, 0, 15)).valor).toBe(1000);
  });

  it('soma todas as pessoas da tabela de salários', () => {
    expect(salariosDoMes(dados, new Date(2026, 0, 1))).toBe(2000);
  });

  it('sem salários na tabela, usa as receitas com "vencimento/salário/ordenado"', () => {
    const r = rendimentoDoMes(dados, new Date(2026, 2, 1));
    expect(r.valor).toBe(750);
    expect(r.anterior).toBe(2000);
    expect(r.variacao).toBeCloseTo(-62.5);
  });

  it('sem mês anterior não há variação', () => {
    expect(rendimentoDoMes(dados, new Date(2025, 5, 1)).variacao).toBeNull();
  });
});

describe('cópia de segurança', () => {
  const s = normalizar({
    profile: { profileName: 'Teste', email: '', phone: '', members: [] },
    pinHash: 'f'.repeat(64),
    transactions: [mov({ note: 'nota' })],
    accounts: [{ id: 'principal', name: 'Principal', balance: 5 }, { id: 'revolut', name: 'Revolut Conjunta', balance: 1 }],
  });
  const extras = { jarvisThreads: [{ id: 't' }], vetReminders: [{ id: 1, pet: 'Animal', type: 'vacina' }], agora: new Date('2026-09-28T11:00:00Z') };

  it('tem o formato da 1.9.x', () => {
    const b = criarBackup(s, extras);
    expect(b).toMatchObject({ app: 'financas-familiar', version: 4, exportedAt: '2026-09-28T11:00:00.000Z', jarvisThreads: extras.jarvisThreads, vetReminders: extras.vetReminders });
    expect(b.data.pinHash).toBe(s.pinHash);
  });

  it('exportar e restaurar devolve os mesmos dados, lembretes e conversa', () => {
    const lido = lerBackup(JSON.stringify(criarBackup(s, extras)));
    expect(lido.ok).toBe(true);
    if (!lido.ok) return;
    expect(aplicarBackup(estadoInicial(), lido.dados)).toEqual(s);
    expect(lido.jarvisThreads).toEqual(extras.jarvisThreads);
    expect(lido.vetReminders).toEqual(extras.vetReminders);
  });

  it('aceita um ficheiro só com os dados e recusa ficheiros inválidos', () => {
    expect(lerBackup(JSON.stringify({ transactions: [] })).ok).toBe(true);
    expect(lerBackup('{').ok).toBe(false);
    expect(lerBackup(JSON.stringify({ data: { contas: [] } })).ok).toBe(false);
    expect(lerBackup(JSON.stringify([1])).ok).toBe(false);
  });

  it('restauro com as regras da 1.9.x', () => {
    const atual = { ...estadoInicial(), hideValues: true, pinHash: 'antigo' };
    const r = aplicarBackup(atual, {
      transactions: [mov({ title: 'Bom' }), { title: 'sem valor' }, null, mov({ title: 'Sem data', date: '' })],
      categories: ['A', 3, 'B'],
      accounts: [{ id: 'principal', name: 'Principal' }],
    });
    expect(r.transactions.map((m) => m.title)).toEqual(['Bom', 'Sem data']);
    expect(r.transactions[1]?.date).toBe('2026-09-01');
    expect(r.categories).toEqual(['A', 'B']);
    expect(r.accounts).toEqual(atual.accounts);
    expect(r.hideValues).toBe(true);
    expect(r.pinHash).toBe('antigo');
    expect(r.petPhotos).toEqual({});
  });
});

describe('saldo corrigido só a partir do dia da correção', () => {
  const ed: Conta = { id: 'ed', name: 'Cartão refeição', balance: 126, createdAt: '2026-06' };
  const mov = (d: string, v: number): Movimento => ({ id: d, title: 'x', detail: 'x', amount: v, date: d, movementType: 'expense', account: 'ed' });
  const hoje = new Date(2026, 8, 25);

  it('o saldo escrito passa a ser o saldo de hoje; os meses anteriores ficam com o valor antigo', () => {
    const movimentos = [mov('2026-09-10', -20)];
    const nova = acertarSaldo(ed, movimentos, 72, hoje);
    expect(saldoDaConta(nova, movimentos, hoje).atual).toBe(72);
    expect(nova.adjDays).toEqual({ '2026-09-25': -34 });
    expect(saldoDaConta(nova, movimentos, hoje, new Date(2026, 7, 1)).atual).toBe(126);
    expect(saldoDaConta(nova, movimentos, hoje).anterior).toBe(126);
  });

  it('sem mudança não regista acerto', () => {
    expect(acertarSaldo(ed, [], 126, hoje)).toBe(ed);
  });

  it('meses anteriores: tira movimentos e acertos posteriores (também os antigos, por mês)', () => {
    const c: Conta = { ...ed, balance: 100, adj: { '2026-09': -26 } };
    const movimentos = [mov('2026-08-05', -10), mov('2026-09-03', -5)];
    const agosto = saldoDaConta(c, movimentos, hoje, new Date(2026, 7, 1));
    expect(agosto.atual).toBe(100 - 15 + 5 + 26);
    expect(agosto.anterior).toBe(agosto.atual + 10);
    expect(agosto.mesAnterior).toBe('julho');
  });
});
