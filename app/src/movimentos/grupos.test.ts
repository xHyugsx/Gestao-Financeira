import { describe, expect, it } from 'vitest';
import { estadoInicial } from '../dados';
import { renomearCategoria } from './categorias';
import { agruparLinhas, definirGrupo, gruposDe, opcoesAgrupadas, sugerirGrupos, tirarDosGrupos } from './grupos';

const LISTA = ['Alimentação', 'Combustível', 'Habitação', 'Luz', 'Renda', 'Restaurantes', 'Supermercado', 'Transportes'];
const comGrupos = (g: Record<string, unknown>) => ({ ...estadoInicial(), extras: { categoryGroups: g } });

describe('grupos de categorias', () => {
  it('só aceita grupos válidos: os dois existem, não é o próprio e um grupo não fica dentro de outro', () => {
    const e = comGrupos({ Luz: 'Habitação', Renda: 'Habitação', Habitação: 'Alimentação', Combustível: 'Combustível', Fantasma: 'Habitação', Supermercado: 'Nada', Restaurantes: 3 });
    expect(gruposDe(e, LISTA)).toEqual({ Luz: 'Habitação', Renda: 'Habitação' });
    expect(gruposDe(estadoInicial(), LISTA)).toEqual({});
  });

  it('definir, mudar e tirar o grupo; eliminar um grupo solta as suas categorias', () => {
    let e = definirGrupo(comGrupos({}), 'Luz', 'Habitação');
    e = definirGrupo(e, 'Renda', 'Habitação');
    expect(e.extras.categoryGroups).toEqual({ Luz: 'Habitação', Renda: 'Habitação' });
    expect(definirGrupo(e, 'Luz', '').extras.categoryGroups).toEqual({ Renda: 'Habitação' });
    expect(tirarDosGrupos(e, 'Habitação').extras.categoryGroups).toEqual({});
  });

  it('mudar o nome leva os grupos atrás (como categoria e como grupo)', () => {
    const e = { ...comGrupos({ Luz: 'Habitação' }), categories: ['Habitação', 'Luz'] };
    expect(renomearCategoria(e, 'Habitação', 'Casa').extras.categoryGroups).toEqual({ Luz: 'Casa' });
    expect(renomearCategoria(e, 'Luz', 'Eletricidade').extras.categoryGroups).toEqual({ Eletricidade: 'Habitação' });
  });

  it('sugere grupos pelo nome, só para grupos que existem e categorias soltas nunca recusadas', () => {
    expect(sugerirGrupos(LISTA, {})).toEqual([
      { grupo: 'Transportes', categorias: ['Combustível'] }, { grupo: 'Habitação', categorias: ['Luz', 'Renda'] },
      { grupo: 'Alimentação', categorias: ['Restaurantes', 'Supermercado'] },
    ]);
    expect(sugerirGrupos(LISTA, { Luz: 'Habitação' }, ['Renda', 'Combustível'])).toEqual([{ grupo: 'Alimentação', categorias: ['Restaurantes', 'Supermercado'] }]);
    expect(sugerirGrupos(['Luz', 'Lazer'], {})).toEqual([]);
  });

  it('junta as linhas por grupo e arruma a lista de escolha', () => {
    const l = (name: string, amount: number, anterior = 0) => ({ name, amount, anterior, share: 0 });
    const r = agruparLinhas([l('Habitação', 0), l('Luz', 40, 30), l('Renda', 600, 600), l('Lazer', 60)], { Luz: 'Habitação', Renda: 'Habitação' });
    expect(r.map((x) => [x.name, x.amount, x.anterior, x.share, x.subs.map((s) => s.name)])).toEqual([
      ['Habitação', 640, 630, 91.4, ['Renda', 'Luz', 'Habitação']], ['Lazer', 60, 0, 8.6, []],
    ]);
    expect(opcoesAgrupadas(['Habitação', 'Lazer', 'Luz', 'Renda'], { Luz: 'Habitação', Renda: 'Habitação' })).toEqual([
      { grupo: null, itens: [{ valor: 'Lazer', rotulo: 'Lazer' }] },
      { grupo: 'Habitação', itens: [{ valor: 'Habitação', rotulo: 'Habitação' }, { valor: 'Luz', rotulo: 'Habitação › Luz' }, { valor: 'Renda', rotulo: 'Habitação › Renda' }] },
    ]);
  });
});
