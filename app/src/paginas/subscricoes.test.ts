import { describe, expect, it } from 'vitest';
import type { Movimento } from '../dados';
import { recorrentesDoMes } from './subscricoes';

let n = 0;
const r = (date: string, title: string, amount: number, extra: Partial<Movimento> = {}): Movimento =>
  ({ id: ++n, title, date, amount, detail: 'x', movementType: 'expense', recurring: 'com', ...extra });
const HOJE = new Date(2026, 9, 12, 12);  // 12 de outubro

describe('recorrentes e subscrições', () => {
  const l: Movimento[] = [
    r('2026-09-01', 'Renda', -600), r('2026-10-01', 'Renda', -600),
    r('2026-09-08', 'Ginásio', -30), r('2026-09-20', 'Streaming', -10), r('2026-10-20', 'Streaming', -12, { title: 'streaming ' }),
    r('2026-09-25', 'Internet', -40),
    r('2026-07-15', 'Seguro', -90, { recurringEvery: 3 }),
    r('2026-04-03', 'Antigo', -5),
    { ...r('2026-09-05', 'Cofre', 0), movementType: 'transfer', revolut: { holder: 'Conjunta', purpose: 'Poupança' }, transferValue: 100 },
    r('2026-09-02', 'Mercado', -50, { recurring: undefined }),
  ];

  it('mês atual: pago, agendado, por pagar e atrasado; séries terminadas ficam de fora', () => {
    const x = recorrentesDoMes(l, new Date(2026, 9, 1), HOJE);
    expect(x.lista.map((i) => [i.titulo, i.dia, i.estado, i.valor])).toEqual([
      ['Renda', 1, 'pago', 600], ['Cofre', 5, 'atrasado', 100], ['Ginásio', 8, 'atrasado', 30], ['Seguro', 15, 'por pagar', 90],
      ['streaming', 20, 'agendado', 12], ['Internet', 25, 'por pagar', 40]]);
    expect(x.pago).toBe(600);
    expect(x.falta).toBe(272);
    expect(x.anual).toBe(600 * 12 + 30 * 12 + 12 * 12 + 40 * 12 + 90 * 4 + 100 * 12);
  });

  it('subida de preço e periodicidade', () => {
    const x = recorrentesDoMes(l, new Date(2026, 9, 1), HOJE);
    expect(x.lista.find((i) => i.titulo === 'streaming')!.subiu).toBeCloseTo(20);
    expect(x.lista.find((i) => i.titulo === 'Renda')!.subiu).toBeNull();
    expect(x.lista.find((i) => i.titulo === 'Seguro')!.periodicidade).toBe('Trimestral');
  });

  it('meses passados mostram só o pago; meses futuros o previsto', () => {
    expect(recorrentesDoMes(l, new Date(2026, 8, 1), HOJE).lista.every((i) => i.estado === 'pago')).toBe(true);
    const nov = recorrentesDoMes(l, new Date(2026, 10, 1), HOJE);
    expect(nov.lista.map((i) => i.titulo)).toEqual(['Renda', 'Cofre', 'Ginásio', 'streaming', 'Internet']);
    expect(nov.lista.every((i) => i.estado === 'por pagar')).toBe(true);
    expect(recorrentesDoMes(l, new Date(2027, 0, 1), HOJE).lista.map((i) => i.titulo)).toContain('Seguro');
  });

  it('valor variável: estimativa (média dos últimos 3), por confirmar conta em «falta pagar», sem subidas de preço', () => {
    const v = (date: string, amount: number) => r(date, 'Luz', amount, { recurring: 'sem', recurringEvery: 1 });
    const luz = [v('2026-06-05', -30), v('2026-07-05', -40), v('2026-08-05', -60), v('2026-09-05', -50), v('2026-10-05', 0)];
    const x = recorrentesDoMes(luz, new Date(2026, 9, 1), HOJE);
    expect(x.lista.map((i) => [i.titulo, i.estado, i.valor, i.estimado, i.subiu])).toEqual([['Luz', 'por confirmar', 50, true, null]]);
    expect(x.pago).toBe(0);
    expect(x.falta).toBe(50);
    expect(x.anual).toBe(600);
    const confirmada = recorrentesDoMes([...luz.slice(0, 4), { ...luz[4]!, amount: -45 }], new Date(2026, 9, 1), HOJE);
    expect(confirmada.lista.map((i) => [i.estado, i.valor, i.estimado])).toEqual([['pago', 45, false]]);
    const novembro = recorrentesDoMes([...luz.slice(0, 4), { ...luz[4]!, amount: -45 }], new Date(2026, 10, 1), HOJE);
    expect(novembro.lista.map((i) => [i.estado, i.valor, i.estimado])).toEqual([['por pagar', 51.67, true]]);
  });

  it('movimento do mês com data futura: «Agendado», em «falta pagar» (ainda não saiu do saldo)', () => {
    const x = recorrentesDoMes([r('2026-09-25', 'Renda', -600), r('2026-10-25', 'Renda', -600)], new Date(2026, 9, 1), HOJE);
    expect(x.lista.map((i) => [i.titulo, i.estado, i.valor])).toEqual([['Renda', 'agendado', 600]]);
    expect(x.pago).toBe(0);
    expect(x.falta).toBe(600);
  });

  it('mês saltado aparece como «saltado» (para repor) mas não conta; o mês seguinte continua «por pagar»', () => {
    const l = [r('2026-09-01', 'Renda', -600, { recurringEvery: 1, recurringDone: true }), r('2026-10-01', 'Renda', -600, { recurringEvery: 1, skipped: true })];
    const out = recorrentesDoMes(l, new Date(2026, 9, 1), HOJE);
    expect(out.lista.map((i) => [i.titulo, i.estado])).toEqual([['Renda', 'saltado']]);
    expect(out.pago + out.falta).toBe(0);
    expect(out.anual).toBe(7200);
    expect(recorrentesDoMes(l, new Date(2026, 10, 1), HOJE).lista.map((i) => [i.estado, i.valor])).toEqual([['por pagar', 600]]);
  });
});

