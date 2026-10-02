import { describe, expect, it } from 'vitest';
import { animaisDe, classeDoAnimal, deAnimal, definirAnimais, simboloDoAnimal } from './animais';

const m = (pet: string, date: string) => ({ id: date, title: 'x', amount: -1, date, detail: '', movementType: 'expense' as const, pet });
const base = { profile: { profileName: '', email: '', phone: '', members: [] }, transactions: [m('Nina', '2026-02-01'), m('Rex', '2026-01-01')], petPhotos: {} };

describe('animais', () => {
  it('usa os do perfil quando existem', () => {
    const e = { ...base, profile: { ...base.profile, pets: [{ name: ' Luna ', sex: 'f' }, { name: '', sex: 'm' }] } };
    expect(animaisDe(e)).toEqual([{ name: 'Luna', sex: 'f' }]);
  });
  it('sem perfil, deduz dos lembretes, das despesas (por data) e das fotografias', () => {
    expect(animaisDe(base)).toEqual([{ name: 'Rex', sex: 'm' }, { name: 'Nina', sex: 'f' }]);
    expect(animaisDe({ ...base, petPhotos: { Bolt: 'x' } }, [{ pet: 'Nina' }]).map((a) => a.name)).toEqual(['Nina', 'Rex', 'Bolt']);
    expect(animaisDe({ ...base, transactions: [] })).toEqual([]);
  });
  it('símbolo, classe e artigo pelo sexo', () => {
    definirAnimais([{ name: 'Rex', sex: 'm' }, { name: 'Nina', sex: 'f' }]);
    expect([simboloDoAnimal('Rex'), simboloDoAnimal('Nina'), simboloDoAnimal('Zé')]).toEqual(['♂️', '♀️', 'Z']);
    expect([classeDoAnimal('Rex'), classeDoAnimal('Nina'), classeDoAnimal('Zé')]).toEqual(['sam', 'lola', 'other']);
    expect([deAnimal('Rex'), deAnimal('Nina')]).toEqual(['do Rex', 'da Nina']);
  });
});
