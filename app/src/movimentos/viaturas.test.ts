import { describe, expect, it } from 'vitest';
import { estadoInicial, type Movimento } from '../dados';
import { novoMovimento, movimentoEditado } from './regras';
import { camposCombustivel, combustivelPorViatura, eCategoriaCombustivel, ultimosAbastecimentos, viaturasDe } from './viaturas';

const ab = (id: number, date: string, amount: number, x: Partial<Movimento> = {}): Movimento =>
  ({ id, title: 'Combustível', detail: '1 x · Combustível', date, amount, movementType: 'expense', ...x });
const VIATURAS = [{ name: 'Carro A', type: 'carro' }, { name: 'Carro B', type: 'carro' }, { name: 'Mota', type: 'mota' }];

describe('viaturas e combustível', () => {
  it('lê as viaturas do perfil e ignora entradas inválidas', () => {
    const e = { ...estadoInicial(), profile: { ...estadoInicial().profile, vehicles: [...VIATURAS, { name: ' ', type: 'carro' }, { name: 'X', type: 'avião' }] } };
    expect(viaturasDe(e)).toEqual([...VIATURAS, { name: 'X', type: 'carro' }]);
    expect(viaturasDe(estadoInicial())).toEqual([]);
  });

  it('carros somados à parte da mota; sem viatura (ou viatura apagada) num total próprio', () => {
    const l = [ab(1, '2026-09-01', -50, { vehicle: 'Carro A' }), ab(2, '2026-09-02', -40, { vehicle: 'Carro B' }), ab(3, '2026-09-03', -15, { vehicle: 'Mota' }),
      ab(4, '2026-09-04', -30), ab(5, '2026-09-05', -20, { vehicle: 'Carro antigo' })];
    const r = combustivelPorViatura(l, VIATURAS as never);
    expect([r.carros, r.motas, r.semViatura]).toEqual([90, 15, 50]);
    expect(r.porViatura.map((v) => v.amount)).toEqual([50, 40, 15]);
  });

  it('pré-escolhe a última viatura e o último combustível de cada uma', () => {
    const l = [ab(1, '2026-09-01', -50, { vehicle: 'Carro A', fuel: 'gasoleo' }), ab(2, '2026-09-05', -40, { vehicle: 'Carro B', fuel: 'gasolina' }), ab(3, '2026-09-09', -10)];
    expect(ultimosAbastecimentos(l)).toEqual({ viatura: 'Carro B', combustivel: { 'Carro A': 'gasoleo', 'Carro B': 'gasolina' } });
  });

  it('formulários: viatura e combustível no «+», no abastecimento e na edição', () => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ title: 'Galp', amount: '45,10', date: '2026-09-10', category: 'Combustível', vehicle: 'Carro A', fuel: 'gasoleo', person: 'Pessoa A' })) f.set(k, v);
    const m = novoMovimento(f, { tipo: 'expense', categoria: 'Combustível', recorrente: false, tipoValor: 'com', periodicidade: 1, revolut: false, hoje: new Date(2026, 8, 10), id: 1 }) as Movimento;
    expect([m.vehicle, m.fuel, m.person, m.amount]).toEqual(['Carro A', 'gasoleo', 'Pessoa A', -45.1]);
    f.set('vehicle', ''); f.set('fuel', 'diesel');
    expect(camposCombustivel(f)).toEqual({ vehicle: undefined, fuel: undefined });
    const editado = movimentoEditado(ab(9, '2026-09-01', -30), (() => { const g = new FormData(); g.set('title', 'Combustível'); g.set('amount', '30'); g.set('category', 'Combustível'); g.set('vehicle', 'Mota'); g.set('fuel', 'gasolina'); return g; })())!;
    expect([editado.vehicle, editado.fuel]).toEqual(['Mota', 'gasolina']);
    expect(eCategoriaCombustivel('Combustíveis')).toBe(true);
    expect(eCategoriaCombustivel('Transportes')).toBe(false);
  });
});
