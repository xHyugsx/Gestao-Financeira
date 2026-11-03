import { describe, expect, it } from 'vitest';
import { estadoInicial, type Estado, type Movimento } from '../dados';
import { adiar, avisosPrevistos, CONFIG_POR_OMISSAO, idDoAviso, lerConfig, proximaHora } from './avisos';

const AGORA = new Date(2026, 10, 20, 10, 0);  // sexta, 20 de novembro de 2026, 10:00
const mov = (id: number, title: string, amount: number, date: string, extra: Partial<Movimento> = {}): Movimento =>
  ({ id, title, detail: `${Number(date.slice(8))} nov · Outros`, amount, date, movementType: amount < 0 ? 'expense' : 'income', ...extra } as Movimento);
const estado = (transactions: Movimento[], resto: Partial<Estado> = {}): Estado => ({ ...estadoInicial(), transactions, ...resto });
const ctx = (config = CONFIG_POR_OMISSAO, extra = {}) => ({ agora: AGORA, lembretes: [], ultimoBackup: '2026-11-15T10:00:00Z', config, ...extra });

describe('avisos das notificações', () => {
  it('recorrentes agendados: um aviso por dia, à hora escolhida', () => {
    const e = estado([
      mov(1, 'Ginásio', -35, '2026-10-26', { recurring: 'com' }), mov(2, 'Ginásio', -35, '2026-11-26', { recurring: 'com' }),
      mov(3, 'Internet', -42.9, '2026-10-26', { recurring: 'com' }), mov(4, 'Internet', -42.9, '2026-11-26', { recurring: 'com' }),
    ]);
    const a = avisosPrevistos(e, ctx()).filter((x) => x.tipo === 'recorrentes');
    const dia26 = a.find((x) => x.chave === 'rec:2026-11-26')!;
    expect(dia26.titulo).toBe('2 recorrentes para pagar hoje');
    expect(dia26.texto).toContain('Ginásio');
    expect(dia26.quando).toEqual(new Date(2026, 10, 26, 9, 0));
    expect(dia26.botoes).toBe('recorrente');
  });

  it('valores ocultos: os textos não mostram valores', () => {
    const e = estado([mov(1, 'Ginásio', -35, '2026-10-26', { recurring: 'com' }), mov(2, 'Ginásio', -35, '2026-11-26', { recurring: 'com' })], { hideValues: true });
    const a = avisosPrevistos(e, ctx()).find((x) => x.chave === 'rec:2026-11-26')!;
    expect(a.texto).not.toMatch(/€/);
  });

  it('dia do ordenado: a receita por confirmar avisa no próprio dia', () => {
    const e = estado([mov(1, 'Salário', 1400, '2026-10-28', { recurring: 'sem' }), mov(2, 'Salário', 0, '2026-11-26', { recurring: 'sem', movementType: 'income' })]);
    const a = avisosPrevistos(e, ctx()).find((x) => x.tipo === 'ordenado')!;
    expect(a.quando).toEqual(new Date(2026, 10, 26, 9, 0));
    expect(a.destino.movimento).toBe(2);
    expect(a.botoes).toBe('ordenado');
  });

  it('despesas anuais: no dia 1 do mês previsto', () => {
    const e = estado([mov(1, 'Café', -2, '2026-11-19')], { annualExpenses: [{ id: 1, name: 'IUC', value: 150, month: 12, year: 2026 }] });
    const a = avisosPrevistos(e, ctx()).find((x) => x.tipo === 'anuais')!;
    expect(a.quando).toEqual(new Date(2026, 11, 1, 9, 0));
    expect(a.texto).toContain('IUC');
  });

  it('veterinário: 3 dias antes e no próprio dia; em atraso, na próxima hora', () => {
    const lembretes = [{ id: 'v1', pet: 'Bóbi', type: 'vacina', last: '2025-11-30', every: 12 }, { id: 'v2', pet: 'Bóbi', type: 'interna', last: '2026-08-01', every: 3 }];
    const a = avisosPrevistos(estado([]), ctx(CONFIG_POR_OMISSAO, { lembretes })).filter((x) => x.tipo === 'vet');
    expect(a.map((x) => x.chave)).toEqual(['vet:v2:atraso', 'vet:v1:3', 'vet:v1:0']);
    expect(a[0]!.quando).toEqual(new Date(2026, 10, 21, 9, 0));
    expect(a[1]!.quando).toEqual(new Date(2026, 10, 27, 9, 0));
  });

  it('backup: 30 dias depois do último e depois de 7 em 7', () => {
    const e = estado([mov(1, 'Café', -2, '2026-11-19')]);
    const em = (ultimoBackup: string) => avisosPrevistos(e, ctx(CONFIG_POR_OMISSAO, { ultimoBackup })).find((x) => x.tipo === 'backup')?.quando;
    expect(em('2026-11-15T10:00:00Z')).toEqual(new Date(2026, 11, 15, 9, 0));
    expect(em('2026-10-01T10:00:00Z')).toEqual(new Date(2026, 10, 21, 9, 0));
    expect(em('')).toEqual(new Date(2026, 10, 21, 9, 0));
  });

  it('desligados: nada é agendado; tipos desligados não aparecem', () => {
    const e = estado([mov(1, 'Café', -2, '2026-11-19')]);
    expect(avisosPrevistos(e, ctx({ ...CONFIG_POR_OMISSAO, ligado: false }))).toEqual([]);
    expect(avisosPrevistos(e, ctx({ ...CONFIG_POR_OMISSAO, tipos: { ...CONFIG_POR_OMISSAO.tipos, backup: false } }, { ultimoBackup: '' })).some((x) => x.tipo === 'backup')).toBe(false);
  });

  it('resumo da semana (segunda) e fecho do mês (dia 1)', () => {
    const e = estado([mov(1, 'Supermercado', -50, '2026-11-17'), mov(2, 'Café', -5, '2026-11-11')]);
    const config = { ...CONFIG_POR_OMISSAO, tipos: { ...CONFIG_POR_OMISSAO.tipos, semana: true, mes: true } };
    const a = avisosPrevistos(e, ctx(config));
    const sem = a.find((x) => x.tipo === 'semana')!;
    expect(sem.quando).toEqual(new Date(2026, 10, 23, 9, 0));
    expect(sem.titulo).toContain('50,00 €');
    expect(a.find((x) => x.tipo === 'mes')!.quando).toEqual(new Date(2026, 11, 1, 9, 0));
  });

  it('lembrar amanhã, configuração guardada, ids e próxima hora', () => {
    const c = adiar(CONFIG_POR_OMISSAO, { chave: 'rec:x', tipo: 'recorrentes', titulo: 't', texto: 'x', destino: {} }, AGORA);
    expect(new Date(c.adiados[0]!.quando)).toEqual(new Date(2026, 10, 21, 9, 0));
    expect(avisosPrevistos(estado([]), ctx(c)).some((x) => x.chave.startsWith('adi:'))).toBe(true);
    expect(lerConfig('{"hora":"20:30","tipos":{"semana":true}}')).toMatchObject({ ligado: true, hora: '20:30', tipos: { semana: true, backup: true } });
    expect(lerConfig('lixo').hora).toBe('09:00');
    expect(idDoAviso('rec:2026-11-26')).toBe(idDoAviso('rec:2026-11-26'));
    expect(idDoAviso('a')).not.toBe(idDoAviso('b'));
    expect(proximaHora(AGORA, '09:00')).toEqual(new Date(2026, 10, 21, 9, 0));
    expect(proximaHora(AGORA, '11:00')).toEqual(new Date(2026, 10, 20, 11, 0));
  });
});
