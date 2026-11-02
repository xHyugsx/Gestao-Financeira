// Viaturas da família (Definições › Perfil e família): nome e tipo, guardados no telemóvel — nunca nomes no código.
// Cada abastecimento pode guardar a viatura (`vehicle`, o nome) e o combustível (`fuel`).
import type { Estado, Movimento } from '../dados';
import { simplificar } from './categorias';

export type TipoViatura = 'carro' | 'mota';
export interface Viatura { name: string; type: TipoViatura }

export const COMBUSTIVEIS = [{ valor: 'gasolina', rotulo: 'Gasolina' }, { valor: 'gasoleo', rotulo: 'Gasóleo' }] as const;
export const rotuloCombustivel = (v: unknown) => COMBUSTIVEIS.find((c) => c.valor === v)?.rotulo ?? '';

/** Viaturas do perfil (as entradas inválidas são ignoradas). */
export function viaturasDe(e: Pick<Estado, 'profile'>): Viatura[] {
  const l = Array.isArray(e.profile.vehicles) ? e.profile.vehicles : [];
  return l.flatMap((v) => {
    const name = String((v as Viatura)?.name ?? '').trim();
    return name ? [{ name, type: (v as Viatura).type === 'mota' ? 'mota' : 'carro' } as Viatura] : [];
  });
}

/** Categoria de combustível (ex.: «Combustível», «Combustíveis»). */
export const eCategoriaCombustivel = (categoria: string) => /combust/.test(simplificar(categoria));

/** Viatura e combustível escolhidos num formulário (vazio = sem viatura / sem combustível). */
export function camposCombustivel(campos: FormData): Pick<Movimento, 'vehicle' | 'fuel'> {
  const vehicle = String(campos.get('vehicle') || '').trim(), fuel = String(campos.get('fuel') || '').trim();
  return { vehicle: vehicle || undefined, fuel: COMBUSTIVEIS.some((c) => c.valor === fuel) ? fuel : undefined };
}

/** Último abastecimento com viatura (para pré-escolher a viatura) e o último combustível de cada viatura. */
export function ultimosAbastecimentos(l: Movimento[]): { viatura: string; combustivel: Record<string, string> } {
  const comViatura = l.filter((m) => typeof m.vehicle === 'string' && m.vehicle)
    .sort((a, b) => a.date.localeCompare(b.date) || (+a.id || 0) - (+b.id || 0));
  const combustivel: Record<string, string> = {};
  for (const m of comViatura) if (typeof m.fuel === 'string' && m.fuel) combustivel[m.vehicle as string] = m.fuel;
  return { viatura: (comViatura.at(-1)?.vehicle as string) ?? '', combustivel };
}

export interface GastoViatura { name: string; type: TipoViatura; amount: number }

/** Combustível de uma lista de abastecimentos: por viatura, total dos carros, das motas e sem viatura. */
export function combustivelPorViatura(l: Movimento[], viaturas: Viatura[]) {
  const soma = (f: (m: Movimento) => boolean) => l.filter(f).reduce((s, m) => s + Math.abs(m.amount), 0);
  const porViatura: GastoViatura[] = viaturas.map((v) => ({ ...v, amount: soma((m) => m.vehicle === v.name) }));
  const conhecidas = new Set(viaturas.map((v) => v.name));
  return {
    porViatura,
    carros: porViatura.filter((v) => v.type === 'carro').reduce((s, v) => s + v.amount, 0),
    motas: porViatura.filter((v) => v.type === 'mota').reduce((s, v) => s + v.amount, 0),
    // sem viatura, ou com uma viatura que já não está no perfil
    semViatura: soma((m) => !(typeof m.vehicle === 'string' && conhecidas.has(m.vehicle))),
  };
}
