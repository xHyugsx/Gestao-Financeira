import { describe, expect, it } from 'vitest';
import { estadoInicial, type Movimento } from '../dados';
import { alfabetica, corNova, TONS } from './cores';
import { estimativa, gerarRecorrentes, porConfirmar, somarMeses, tipoNaSerie, valoresDaSerie } from './recorrentes';

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

describe('recorrentes de valor variável', () => {
  const luz = (id: number, date: string, amount: number, extra: Partial<Movimento> = {}): Movimento =>
    ({ id, title: 'Luz', detail: 'x · Casa', amount, date, movementType: 'expense', recurring: 'sem', recurringEvery: 1, ...extra });

  it('a cópia nasce por confirmar e deixa de estar quando se escreve o valor', () => {
    const l = gerarRecorrentes([luz(1, '2026-09-05', -42)], new Date(2026, 9, 5), id)!;
    expect(porConfirmar(l[0]!)).toBe(true);
    expect(porConfirmar({ ...l[0]!, amount: -38.5 })).toBe(false);
    expect(porConfirmar(luz(2, '2026-10-05', 0, { recurring: 'com' }))).toBe(false);
  });

  it('valores da série até à data, sem os por confirmar nem outras séries', () => {
    const l = [luz(1, '2026-07-05', -40), luz(2, '2026-08-05', -46), luz(3, '2026-09-05', -43.2), luz(4, '2026-10-05', 0),
      luz(5, '2026-09-10', -99, { title: 'Água' }), luz(6, '2026-11-05', -50)];
    expect(valoresDaSerie(l, l[3]!)).toEqual([40, 46, 43.2]);
    expect(estimativa(valoresDaSerie(l, l[3]!))).toBe(43.07);
    expect(estimativa([])).toBe(0);
    expect(estimativa([10, 20, 30, 40])).toBe(30);
  });

  it('mudar o tipo de valor num movimento antigo aplica-se ao que cria as cópias seguintes', () => {
    const l = [luz(3, '2026-09-05', -43, { recurring: 'com' }), luz(2, '2026-08-05', -46, { recurring: 'com', recurringDone: true }),
      luz(9, '2026-09-08', -10, { title: 'Água', recurring: 'com' })];
    const antes = l[1]!, depois = { ...antes, recurring: 'sem' };
    const r = tipoNaSerie(l.map((x) => (x.id === 2 ? depois : x)), antes, depois);
    expect(r.map((x) => [x.id, x.recurring])).toEqual([[3, 'sem'], [2, 'sem'], [9, 'com']]);
    expect(tipoNaSerie(l, antes, { ...antes, amount: -50 })).toBe(l);
    const fixo = tipoNaSerie(r, r[1]!, { ...r[1]!, recurring: 'com' });
    expect(fixo.map((x) => x.recurring)).toEqual(['com', 'sem', 'com']);
  });
});
