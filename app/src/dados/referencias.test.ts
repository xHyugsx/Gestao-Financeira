// Compara o núcleo de dados com o que a app 1.9.x faz (tests/referencias/dados.json,
// gravado a partir da 1.9.x com dados fictícios). Se algum valor divergir, o comportamento mudou.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  criarBackup, inicioDoMes, MESES, normalizar, paraGravar, PERFIL_POR_OMISSAO, rendimentoDoMes, saldoDaConta, tendencia,
} from './index';

interface Caso {
  entrada: Record<string, unknown> | null;
  gravado: Record<string, unknown>;
  backup: Record<string, unknown>;
  saldos?: string;
  tendencias?: string[];
  rendimento?: string[];
}
const REF = JSON.parse(readFileSync(new URL('../../../tests/referencias/dados.json', import.meta.url), 'utf8')) as {
  data: string;
  casos: Record<string, Caso>;
};
const HOJE = new Date(REF.data);

const moeda = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const eur = (v: number) => moeda.format(v).replace(/\s/g, ' ');
const pct = (v: number) => `${Math.abs(v).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%`;
const json = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Diferenças intencionais face à 1.9.x, aplicadas à referência antes de comparar. */
function esperado(nome: string, caso: Caso, v: Record<string, unknown>): Record<string, unknown> {
  const r = json(v);
  const alvo = (r.data ?? r) as Record<string, unknown>;
  // Perfil de instalação nova sem nomes da família (esquema.ts → PERFIL_POR_OMISSAO).
  if (!caso.entrada?.profile) alvo.profile = PERFIL_POR_OMISSAO;
  // Campos desconhecidos são preservados (a 1.9.x apagava-os ao gravar).
  if (nome === 'revolut_antigo_e_campos_extra') alvo.campoDesconhecido = { a: 1 };
  return r;
}

describe.each(Object.entries(REF.casos))('igual à 1.9.x: %s', (nome, caso) => {
  const estado = normalizar(json(caso.entrada ?? {}));

  it('dados gravados depois de abrir', () => {
    expect(json(paraGravar(estado))).toEqual(esperado(nome, caso, caso.gravado));
  });

  it('cópia de segurança', () => {
    const b: Record<string, unknown> = json({ ...criarBackup(estado, caso.backup as never) });
    delete b.exportedAt;
    expect(b).toEqual(esperado(nome, caso, caso.backup));
  });

  if (caso.saldos) it('saldos das contas', () => {
    const texto = estado.accounts.map((c) => `${c.name}: ${eur(saldoDaConta(c, estado.transactions, HOJE).atual)}`).join(' · ');
    expect(`Saldos — ${texto}.`).toBe(caso.saldos);
  });

  if (caso.tendencias) it('tendência das contas', () => {
    const linhas = estado.accounts.map((c) => {
      const s = saldoDaConta(c, estado.transactions, HOJE);
      const t = tendencia(s), rotulo = s.nova ? 'início do mês' : s.mesAnterior;
      return `SALDO ${c.name.toUpperCase()} | ${t === null ? `— vs. ${rotulo}` : `${t >= 0 ? '↑' : '↓'} ${pct(t)} vs. ${rotulo}`}`;
    });
    expect(linhas).toEqual(caso.tendencias);
  });

  if (caso.rendimento) it('rendimento mensal (setembro de 2026 a dezembro de 2025)', () => {
    const linhas = caso.rendimento!.map((_, i) => {
      const mes = inicioDoMes(HOJE, -i), r = rendimentoDoMes(estado, mes);
      return `${MESES[mes.getMonth()]} de ${mes.getFullYear()} | Rendimento mensal ${eur(r.valor)}${r.variacao === null ? '' : ` ${pct(r.variacao)}`}`;
    });
    expect(linhas).toEqual(caso.rendimento);
  });
});
