import { describe, expect, it } from 'vitest';
import { estadoInicial, type Movimento, saldoDaConta } from '../dados';
import { alfabetica, corNova, TONS } from './cores';
import {
  copiaNoMes, criaCopias, dataSeguinte, estimativa, gerarRecorrentes, porConfirmar, preencherCopia, recorrentesPrevistos, recorrenciaNaSerie, reporMes, salarioDaReceita, saltarEsteMes, semSaltados, somarMeses, valoresDaSerie,
} from './recorrentes';

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

  it('criado já «a definir» (mensal, dia 29): todos os meses nasce uma cópia por confirmar no dia 29', () => {
    const internet: Movimento = { id: 7, title: 'Internet', detail: '29 outubro · Casa', amount: -0, date: '2026-10-29', movementType: 'expense', recurring: 'sem', recurringEvery: 1 };
    expect(porConfirmar(internet)).toBe(true);
    expect(gerarRecorrentes([internet], new Date(2026, 10, 28), id)).toBeNull();
    const l = gerarRecorrentes([{ ...internet, amount: -42 }], new Date(2027, 0, 29), id)!;
    expect(l.map((m) => [m.date, m.amount, porConfirmar(m)])).toEqual([['2027-01-29', 0, true], ['2026-12-29', 0, true], ['2026-11-29', 0, true], ['2026-10-29', -42, false]]);
  });

  it('anual de valor variável: no ano seguinte volta a nascer «a definir», mesmo depois de confirmado', () => {
    const iuc: Movimento = { id: 8, title: 'IUC', detail: '15 março · Carro', amount: -95, date: '2026-03-15', movementType: 'expense', recurring: 'sem', recurringEvery: 12 };
    const l = gerarRecorrentes([iuc], new Date(2027, 2, 15), id)!;
    expect(l.map((m) => [m.date, m.amount])).toEqual([['2027-03-15', 0], ['2026-03-15', -95]]);
    const confirmado = l.map((m) => (m.date === '2027-03-15' ? { ...m, amount: -101 } : m));
    expect(gerarRecorrentes(confirmado, new Date(2028, 2, 15), id)![0]).toMatchObject({ date: '2028-03-15', amount: 0, recurring: 'sem', recurringEvery: 12 });
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
    const r = recorrenciaNaSerie(l.map((x) => (x.id === 2 ? depois : x)), antes, depois);
    expect(r.map((x) => [x.id, x.recurring])).toEqual([[3, 'sem'], [2, 'sem'], [9, 'com']]);
    expect(recorrenciaNaSerie(l, antes, { ...antes, amount: -50 })).toBe(l);
    const fixo = recorrenciaNaSerie(r, r[1]!, { ...r[1]!, recurring: 'com' });
    expect(fixo.map((x) => x.recurring)).toEqual(['com', 'sem', 'com']);
  });
});

describe('recorrentes previstos (previsão do saldo dos meses futuros)', () => {
  const hoje = new Date(2026, 9, 21, 18, 43);
  const rendaSet: Movimento = { ...renda, id: 50, date: '2026-09-25', detail: '25 setembro · Habitação' };

  it('cópias que ainda vão ser criadas, depois de hoje e até ao limite', () => {
    const p = recorrentesPrevistos([rendaSet], hoje, '2026-11-30');
    expect(p.map((m) => [m.date, m.amount, m.detail])).toEqual([['2026-10-25', -600, '25 outubro · Habitação'], ['2026-11-25', -600, '25 novembro · Habitação']]);
    expect(recorrentesPrevistos([rendaSet], hoje, '2026-10-24')).toEqual([]);
  });

  it('mesma cadeia de datas das cópias reais (31 jan → 28 fev → 28 mar)', () => {
    const p = recorrentesPrevistos([{ ...renda, date: '2026-01-31' }], new Date(2026, 1, 1), '2026-03-31');
    expect(p.map((m) => m.date)).toEqual(['2026-02-28', '2026-03-28']);
  });

  it('valor variável usa a estimativa; transferências para a Revolut usam o valor transferido', () => {
    const v = (id: number, date: string, amount: number, extra: Partial<Movimento> = {}): Movimento =>
      ({ id, title: 'Luz', detail: 'x · Casa', amount, date, movementType: 'expense', recurring: 'sem', recurringEvery: 1, recurringDone: true, ...extra });
    const luz = [v(1, '2026-08-05', -40), v(2, '2026-09-05', -46), v(3, '2026-10-05', 0, { recurringDone: undefined })];
    expect(recorrentesPrevistos(luz, hoje, '2026-11-30').map((m) => [m.date, m.amount])).toEqual([['2026-11-05', -43]]);
    const cofre: Movimento = { ...rendaSet, amount: 0, movementType: 'transfer', revolut: { holder: 'Conjunta', purpose: 'Poupança' }, transferValue: 100 };
    expect(recorrentesPrevistos([cofre], hoje, '2026-10-31').map((m) => [m.amount, m.transferValue])).toEqual([[0, 100]]);
  });

  it('séries paradas, sem periodicidade ou sem valor não entram', () => {
    expect(recorrentesPrevistos([{ ...rendaSet, recurringDone: true }, { ...rendaSet, id: 51, recurringEvery: undefined }], hoje, '2027-01-31')).toEqual([]);
    expect(recorrentesPrevistos([{ ...rendaSet, recurring: 'sem', amount: 0 }], hoje, '2027-01-31')).toEqual([]);
  });

  it('com os previstos, a previsão do saldo de novembro já desconta a renda de outubro e de novembro', () => {
    const p = { id: 'principal', name: 'Principal', balance: 1000 };
    const nov = new Date(2026, 10, 1), l = [rendaSet];
    expect(saldoDaConta(p, l, hoje).atual).toBe(400);
    expect(saldoDaConta(p, [...l, ...recorrentesPrevistos(l, hoje, '2026-11-31')], hoje, nov).atual).toBe(-800);
  });
});

describe('saltar só este mês', () => {
  const set: Movimento = { ...renda, id: 70, date: '2026-09-05', detail: '5 setembro · Habitação', recurringDone: true };
  const out: Movimento = { ...renda, id: 71, date: '2026-10-05', detail: '5 outubro · Habitação' };

  it('só a cópia mais recente cria cópias; saltá-la mantém a série', () => {
    expect(criaCopias(out)).toBe(true);
    expect(criaCopias(set)).toBe(false);
    const l = saltarEsteMes([out, set], out);
    expect(l[0]).toMatchObject({ id: 71, skipped: true });
    const novembro = gerarRecorrentes(l, new Date(2026, 10, 5), id)!;
    expect(novembro[0]).toMatchObject({ date: '2026-11-05', amount: -600 });
    expect(novembro[0]!.skipped).toBeUndefined();
    expect(novembro.find((m) => m.id === 71)).toMatchObject({ skipped: true, recurringDone: true });
  });

  it('repor um mês saltado tira a marca', () => {
    const l = saltarEsteMes([out, set], out);
    expect('skipped' in reporMes(l, l[0]!)[0]!).toBe(false);
  });

  it('sem as saltadas: o mesmo objeto se não houver nenhuma', () => {
    const e = { transactions: [out, set] };
    expect(semSaltados(e)).toBe(e);
    expect(semSaltados({ transactions: saltarEsteMes([out, set], out) }).transactions.map((m) => m.id)).toEqual([70]);
  });

  it('a saltada não conta para «da última vez» nem para a estimativa, mas a previsão continua a série', () => {
    const v = (x: Movimento, extra: Partial<Movimento> = {}): Movimento => ({ ...x, recurring: 'sem', ...extra });
    const l = [v(set, { amount: -40 }), v(out, { amount: -90, skipped: true })];
    expect(valoresDaSerie(l, { ...l[1]!, id: 99, date: '2026-11-05' })).toEqual([40]);
    expect(recorrentesPrevistos(l, new Date(2026, 9, 21), '2026-11-30').map((m) => [m.date, m.amount])).toEqual([['2026-11-05', -40]]);
  });
});

describe('recorrentes registados à mão ou agendados não ficam a dobrar', () => {
  const ago: Movimento = { ...renda, id: 80, date: '2026-08-25', detail: '25 agosto · Habitação' };
  const manual: Movimento = { id: 81, title: 'renda ', detail: '27 setembro · Habitação', amount: -600, date: '2026-09-27', movementType: 'expense' };

  it('não cria a cópia; o movimento registado à mão passa a criar a seguinte', () => {
    const l = gerarRecorrentes([ago, manual], new Date(2026, 8, 28), id)!;
    expect(l).toHaveLength(2);
    expect(l.find((m) => m.id === 80)).toMatchObject({ recurringDone: true });
    expect(l.find((m) => m.id === 81)).toMatchObject({ recurring: 'com', recurringEvery: 1 });
    const out = gerarRecorrentes(l, new Date(2026, 9, 27), id)!;
    expect(out.map((m) => m.date).sort()).toEqual(['2026-08-25', '2026-09-27', '2026-10-27']);
  });

  it('agendado no mês: a previsão não o conta duas vezes e a cópia não é criada no dia', () => {
    const agendado = { ...manual, date: '2026-10-30', detail: '30 outubro · Habitação' };
    const hoje = new Date(2026, 9, 21);
    const set = { ...ago, date: '2026-09-25' };
    expect(recorrentesPrevistos([set, agendado], hoje, '2026-11-30').map((m) => m.date)).toEqual(['2026-11-25']);
    expect(gerarRecorrentes([set, agendado], new Date(2026, 9, 25), id)!).toHaveLength(2);
  });

  it('não conta os importados (sem efeito no saldo), outras séries nem receitas com o mesmo título', () => {
    const outros: Movimento[] = [{ ...manual, affectsBalance: false, importKey: 'k' }, { ...manual, id: 82, title: 'Água' }, { ...manual, id: 83, amount: 600, movementType: 'income' }];
    expect(gerarRecorrentes([ago, ...outros], new Date(2026, 8, 28), id)!).toHaveLength(5);
  });

  it('mudar a periodicidade num movimento antigo aplica-se ao que cria as cópias', () => {
    const atual = { ...ago, id: 90, date: '2026-09-25' }, antigo = { ...ago, recurringDone: true };
    const depois = { ...antigo, recurringEvery: 3 };
    const r = recorrenciaNaSerie([atual, depois], antigo, depois);
    expect(r.map((m) => [m.id, m.recurringEvery])).toEqual([[90, 3], [80, 3]]);
    const semAuto = { ...antigo, recurringEvery: undefined };
    expect(recorrenciaNaSerie([atual, semAuto], antigo, semAuto)[0]!.recurringEvery).toBeUndefined();
    expect(recorrenciaNaSerie([atual, { ...antigo, recurring: undefined }], antigo, { ...antigo, recurring: undefined })[0]).toBe(atual);
  });
});

describe('salário: dia do salário e valor variável nas receitas', () => {
  const sal = (id: number, date: string, amount: number, extra: Partial<Movimento> = {}): Movimento =>
    ({ id, title: 'Salário', detail: 'x · Salário', amount, date, movementType: 'income', recurring: 'sem', recurringEvery: 1, recurringDay: 'salario', ...extra });

  it('dia do salário: 3.º dia útil a contar do fim do mês', () => {
    expect(dataSeguinte(sal(1, '2026-09-28', 1500), '2026-09-28', 1)).toBe('2026-10-28');
    expect(dataSeguinte(sal(1, '2026-10-28', 1500), '2026-10-28', 1)).toBe('2026-11-26');
    expect(dataSeguinte({ ...renda, date: '2026-10-28' }, '2026-10-28', 1)).toBe('2026-11-28');
  });

  it('a cópia nasce no dia do salário, por confirmar', () => {
    const l = gerarRecorrentes([sal(1, '2026-09-28', 1500)], new Date(2026, 9, 28), id)!;
    expect(l[0]).toMatchObject({ date: '2026-10-28', amount: 0, movementType: 'income', recurringDay: 'salario' });
    expect(porConfirmar(l[0]!)).toBe(true);
    expect(gerarRecorrentes([sal(1, '2026-09-28', 1500)], new Date(2026, 9, 27), id)).toBeNull();
  });

  it('estimativa e previsão também nas receitas (média dos últimos 3, a somar)', () => {
    const l = [sal(1, '2026-07-29', 1400, { recurringDone: true }), sal(2, '2026-08-27', 1500, { recurringDone: true }), sal(3, '2026-09-28', 1600)];
    expect(valoresDaSerie(l, { ...l[2]!, id: 9, date: '2026-10-28' })).toEqual([1400, 1500, 1600]);
    expect(recorrentesPrevistos(l, new Date(2026, 9, 21), '2026-11-30').map((m) => [m.date, m.amount])).toEqual([['2026-10-28', 1500], ['2026-11-26', 1500]]);
  });

  it('mudar para o dia do salário num movimento antigo aplica-se à série', () => {
    const atual = sal(5, '2026-09-28', 1600, { recurringDay: undefined }), antigo = sal(4, '2026-08-27', 1500, { recurringDay: undefined, recurringDone: true });
    const depois = { ...antigo, recurringDay: 'salario' };
    expect(recorrenciaNaSerie([atual, depois], antigo, depois)[0]).toMatchObject({ recurringDay: 'salario', recurringEvery: 1 });
  });
});

describe('movimento novo de uma série que já tem cópia no mês', () => {
  const copia: Movimento = { ...renda, id: 60, date: '2026-10-05', detail: '5 outubro · Habitação', recurringEvery: 1 };
  const novo: Movimento = { id: 61, title: 'Renda', detail: '6 outubro · Habitação', amount: -620, date: '2026-10-06', movementType: 'expense', note: 'com atraso' };

  it('encontra a cópia do mesmo mês e da mesma série', () => {
    expect(copiaNoMes([copia], novo)?.id).toBe(60);
    expect(copiaNoMes([copia], { ...novo, date: '2026-11-06' })).toBeUndefined();
    expect(copiaNoMes([copia], { ...novo, title: 'Água' })).toBeUndefined();
    expect(copiaNoMes([{ ...copia, skipped: true }], novo)).toBeUndefined();
    expect(copiaNoMes([{ ...copia, recurring: undefined }], novo)).toBeUndefined();
  });

  it('preencher: a cópia fica com o valor, a data e a nota do novo e continua na série', () => {
    expect(preencherCopia(copia, novo)).toMatchObject({ id: 60, amount: -620, date: '2026-10-06', note: 'com atraso', recurring: 'com', recurringEvery: 1 });
  });
});

describe('salário confirmado à mão atualiza a tabela de Salários', () => {
  const sal: Movimento = { id: 1, title: 'Salário Rui', detail: 'x', amount: 0, date: '2026-10-28', movementType: 'income', recurring: 'sem', recurringEvery: 1, recurringDay: 'salario' };

  it('valor novo ou alterado → salários desse mês da pessoa do título (ou da única pessoa)', () => {
    expect(salarioDaReceita(sal, { ...sal, amount: 1450 }, ['Ana', 'Rui'])).toEqual({ ano: '2026', pessoa: 'Rui', mes: 9, valor: 1450 });
    expect(salarioDaReceita(sal, { ...sal, title: 'Ordenado', amount: 1450 }, ['Rui'])).toMatchObject({ pessoa: 'Rui' });
  });

  it('nada a fazer: sem valor, sem alteração, pessoa desconhecida ou não é o dia do salário', () => {
    expect(salarioDaReceita(sal, sal, ['Rui'])).toBeNull();
    expect(salarioDaReceita({ ...sal, amount: 1450 }, { ...sal, amount: 1450 }, ['Rui'])).toBeNull();
    expect(salarioDaReceita(sal, { ...sal, title: 'Ordenado', amount: 1450 }, ['Ana', 'Rui'])).toBeNull();
    expect(salarioDaReceita(sal, { ...sal, amount: 1450, recurringDay: undefined }, ['Rui'])).toBeNull();
  });
});

describe('previsão a partir de um mês saltado', () => {
  it('a cópia prevista não fica saltada (conta no saldo previsto)', () => {
    const g: Movimento = { ...renda, id: 77, date: '2026-09-10', amount: -12, recurringEvery: 1, skipped: true };
    const p = recorrentesPrevistos([g], new Date(2026, 8, 28), '2026-10-31');
    expect(p.map((m) => [m.date, m.amount, m.skipped])).toEqual([['2026-10-10', -12, undefined]]);
    expect(saldoDaConta({ id: 'principal', name: 'Principal', balance: 100 }, [g, ...p], new Date(2026, 8, 28), new Date(2026, 9, 1)).atual).toBe(88);
  });
});

