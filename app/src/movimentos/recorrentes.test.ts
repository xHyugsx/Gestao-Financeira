import { describe, expect, it } from 'vitest';
import { estadoInicial, type Movimento } from '../dados';
import { alfabetica, corNova, TONS } from './cores';
import { gerarRecorrentes, somarMeses } from './recorrentes';

const renda: Movimento = { id: 1, title: 'Renda', detail: '5 julho · Habitação', amount: -600, date: '2026-07-05', movementType: 'expense', recurring: 'com', recurringEvery: 1 };
let n = 100;
const id = () => n++;

describe('movimentos recorrentes', () => {
  it('soma meses sem passar do fim do mês', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(somarMeses('2026-11-15', 3)).toBe('2027-02-15');
    expect(somarMeses('2026-03-10', 12)).toBe('2027-03-10');
  });

  it('cria todas as cópias em falta até hoje, com a data na descrição', () => {
    const l = gerarRecorrentes([renda], new Date(2026, 8, 28), id)!;
    expect(l.map((m) => m.date)).toEqual(['2026-09-05', '2026-08-05', '2026-07-05']);
    expect(l[0]).toMatchObject({ title: 'Renda', amount: -600, detail: '5 setembro · Habitação', recurringEvery: 1 });
    expect(l.filter((m) => m.recurringDone).map((m) => m.date)).toEqual(['2026-08-05', '2026-07-05']);
  });

  it('não cria nada antes da data nem para recorrentes antigos sem periodicidade', () => {
    expect(gerarRecorrentes([renda], new Date(2026, 7, 4), id)).toBeNull();
    const antigo = { ...renda, recurringEvery: undefined };
    expect(gerarRecorrentes([antigo], new Date(2027, 0, 1), id)).toBeNull();
  });

  it('pára quando a última cópia foi desmarcada ou já tem seguinte', () => {
    expect(gerarRecorrentes([{ ...renda, recurringDone: true }], new Date(2027, 0, 1), id)).toBeNull();
    expect(gerarRecorrentes([{ ...renda, recurring: undefined }], new Date(2027, 0, 1), id)).toBeNull();
  });

  it('valor a definir: a cópia fica sem valor; bimestral e anual', () => {
    const agua = { ...renda, recurring: 'sem', amount: -30, recurringEvery: 2 };
    expect(gerarRecorrentes([agua], new Date(2026, 8, 5), id)![0]).toMatchObject({ date: '2026-09-05', amount: 0 });
    const seguro = { ...renda, recurringEvery: 12, date: '2025-09-28' };
    expect(gerarRecorrentes([seguro], new Date(2026, 8, 28), id)!.map((m) => m.date)).toEqual(['2026-09-28', '2025-09-28']);
  });
});

describe('cores das categorias', () => {
  it('escolhe uma cor que nenhuma categoria usa', () => {
    const e = estadoInicial();
    const usadas = ['blue', 'green', 'orange', 'pink', 'violet', 'red', 'yellow', 'cyan'];
    for (let i = 0; i < 20; i++) expect(usadas).not.toContain(corNova(e));
  });

  it('nunca repete enquanto houver cores livres; depois usa a menos usada', () => {
    const e = { ...estadoInicial(), categories: [] as string[], incomeCategories: [] as string[] };
    const vistas: string[] = [];
    for (let i = 0; i < TONS.length; i++) {
      const c = corNova(e);
      expect(vistas).not.toContain(c);
      vistas.push(c);
      e.categories.push(`C${i}`);
      e.extras = { categoryColors: Object.fromEntries(e.categories.map((n, k) => [n, vistas[k]])) };
    }
    expect(TONS).toContain(corNova(e));
  });

  it('ordena por ordem alfabética portuguesa', () => {
    expect(alfabetica(['Saúde', 'alimentação', 'Educação', 'Água'])).toEqual(['Água', 'alimentação', 'Educação', 'Saúde']);
  });
});
