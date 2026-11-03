// Notificações da APK: que avisos agendar e quando (função pura, testada em avisos.test.ts).
// Os textos são calculados no momento de agendar; a app volta a agendar ao abrir e ao sair (os dados só mudam na app).
import { anoMes, type Estado, type Movimento } from '../dados';
import { estimativa, porConfirmar, valoresDaSerie } from '../movimentos/recorrentes';
import { despesasAnuais, valorAnual } from '../paginas/anuais';
import { fechoDoMes, textoDe } from '../paginas/calculos';
import { recorrentesDoMes } from '../paginas/subscricoes';
import { info, type Lembrete } from '../veterinario/lembretes';

export type TipoAviso = 'recorrentes' | 'ordenado' | 'anuais' | 'vet' | 'backup' | 'semana' | 'mes';
export type Botoes = 'recorrente' | 'vet' | 'ordenado';

/** O que abrir ao tocar (ou nos botões). */
export interface Destino { pagina?: string; movimento?: string | number; backup?: boolean; vet?: string | number }

export interface Aviso {
  chave: string;
  tipo: TipoAviso;
  quando: Date;
  titulo: string;
  texto: string;
  botoes?: Botoes;
  destino: Destino;
}

/** Aviso adiado com «Lembrar amanhã» (fica guardado até passar a hora). */
export interface AvisoAdiado { chave: string; tipo: TipoAviso; quando: string; titulo: string; texto: string; botoes?: Botoes; destino: Destino }

export interface ConfigAvisos {
  ligado: boolean;
  /** «HH:MM». */
  hora: string;
  tipos: Record<TipoAviso, boolean>;
  adiados: AvisoAdiado[];
}

export const CONFIG_POR_OMISSAO: ConfigAvisos = {
  ligado: true,
  hora: '09:00',
  tipos: { recorrentes: true, ordenado: true, anuais: true, vet: true, backup: true, semana: false, mes: false },
  adiados: [],
};

export function lerConfig(texto: string | null): ConfigAvisos {
  try {
    const c = JSON.parse(texto || 'null') as Partial<ConfigAvisos> | null;
    if (!c || typeof c !== 'object') return structuredClone(CONFIG_POR_OMISSAO);
    return {
      ligado: c.ligado !== false,
      hora: typeof c.hora === 'string' && /^\d{2}:\d{2}$/.test(c.hora) ? c.hora : CONFIG_POR_OMISSAO.hora,
      tipos: { ...CONFIG_POR_OMISSAO.tipos, ...(c.tipos ?? {}) },
      adiados: Array.isArray(c.adiados) ? c.adiados : [],
    };
  } catch { return structuredClone(CONFIG_POR_OMISSAO); }
}

const HORIZONTE = 35;
const DIA = 864e5;
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const pad = (n: number) => String(n).padStart(2, '0');
export const isoDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const lerDia = (s: string) => new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
const somarDias = (s: string, n: number) => { const d = lerDia(s); d.setDate(d.getDate() + n); return isoDia(d); };

/** O dia `s` (AAAA-MM-DD) à hora dos avisos. */
export function naHora(s: string, hora: string): Date {
  const d = lerDia(s);
  d.setHours(Number(hora.slice(0, 2)), Number(hora.slice(3, 5)), 0, 0);
  return d;
}

/** A próxima vez que for a hora dos avisos (hoje, se ainda não passou; senão amanhã). */
export function proximaHora(agora: Date, hora: string): Date {
  const h = naHora(isoDia(agora), hora);
  return h > agora ? h : naHora(somarDias(isoDia(agora), 1), hora);
}

const euros = (v: number, ocultos: boolean) => (ocultos ? '' : ` (${v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)`);
const aprox = (v: number, ocultos: boolean) => (ocultos || !v ? '' : ` (≈ ${Math.round(v).toLocaleString('pt-PT')} €)`);
const juntar = (l: string[]) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`);
const resumirLista = (l: string[], max = 3) => (l.length > max ? `${l.slice(0, max).join(', ')} e mais ${l.length - max}` : juntar(l));

/** Gastos (despesas sem poupança nem investimentos, sem as por confirmar nem as saltadas) entre dois dias, inclusive. */
function gastoEntre(movimentos: Movimento[], de: string, ate: string): { total: number; maior?: Movimento } {
  let total = 0, maior: Movimento | undefined;
  for (const m of movimentos) {
    if (m.movementType !== 'expense' || m.skipped || porConfirmar(m) || !m.date || m.date < de || m.date > ate) continue;
    if (/poupanca|investiment/.test(textoDe(m))) continue;
    total += Math.abs(m.amount);
    if (!maior || Math.abs(m.amount) > Math.abs(maior.amount)) maior = m;
  }
  return { total, maior };
}

function comparacao(atual: number, anterior: number): string {
  if (!anterior) return '';
  const p = Math.round(((atual - anterior) / anterior) * 100);
  return p === 0 ? 'Igual ao período anterior.' : `${p > 0 ? 'Mais' : 'Menos'} ${Math.abs(p)}% que o período anterior.`;
}

export interface Contexto {
  agora: Date;
  lembretes: Lembrete[];
  /** Data ISO do último backup manual (vazio = nunca). */
  ultimoBackup: string;
  config: ConfigAvisos;
}

/** Avisos a agendar nos próximos dias, por ordem de data. Respeita os tipos ligados e os valores ocultos. */
export function avisosPrevistos(e: Estado, { agora, lembretes, ultimoBackup, config }: Contexto): Aviso[] {
  if (!config.ligado) return [];
  const { hora, tipos } = config;
  const ocultos = !!e.hideValues;
  const hoje = isoDia(agora), limite = somarDias(hoje, HORIZONTE);
  const movimentos = e.transactions.filter((m) => !m.skipped);
  const avisos: Aviso[] = [];
  const noDia = (dia: string) => { const q = naHora(dia, hora); return q > agora && dia <= limite ? q : null; };

  if (tipos.recorrentes) {
    const porDia = new Map<string, string[]>(), atrasados: string[] = [];
    const meses = [new Date(agora.getFullYear(), agora.getMonth(), 1), new Date(agora.getFullYear(), agora.getMonth() + 1, 1)];
    for (const mes of meses) {
      const am = anoMes(mes);
      for (const r of recorrentesDoMes(e.transactions, mes, agora).lista) {
        const linha = `${r.titulo}${r.estimado ? aprox(r.valor, ocultos) : euros(-r.valor, ocultos)}`;
        if (r.estado === 'atrasado' && am === anoMes(agora)) { atrasados.push(linha); continue; }
        if (r.estado !== 'agendado' && r.estado !== 'por pagar') continue;
        const dia = `${am}-${pad(r.dia)}`;
        if (dia < hoje || dia > limite) continue;
        porDia.set(dia, [...(porDia.get(dia) ?? []), linha]);
      }
    }
    for (const [dia, l] of porDia) {
      const quando = noDia(dia);
      if (!quando) continue;
      avisos.push({ chave: `rec:${dia}`, tipo: 'recorrentes', quando, botoes: 'recorrente', destino: { pagina: 'resumo' },
        titulo: l.length === 1 ? 'Recorrente para pagar hoje' : `${l.length} recorrentes para pagar hoje`, texto: `${resumirLista(l)}.` });
    }
    if (atrasados.length) {
      avisos.push({ chave: 'rec:atraso', tipo: 'recorrentes', quando: proximaHora(agora, hora), botoes: 'recorrente', destino: { pagina: 'resumo' },
        titulo: atrasados.length === 1 ? 'Recorrente em atraso' : `${atrasados.length} recorrentes em atraso`, texto: `${resumirLista(atrasados)}.` });
    }
  }

  if (tipos.ordenado) {
    for (const m of movimentos) {
      if (m.movementType !== 'income' || !porConfirmar(m) || !m.date) continue;
      const est = estimativa(valoresDaSerie(e.transactions, m));
      const atraso = m.date < hoje;
      const quando = atraso ? proximaHora(agora, hora) : noDia(m.date);
      if (!quando) continue;
      avisos.push({ chave: `ord:${m.id}`, tipo: 'ordenado', quando, botoes: 'ordenado', destino: { movimento: m.id },
        titulo: atraso ? 'Salário por confirmar' : 'Hoje é dia do ordenado 💶',
        texto: `Confirma o valor de «${m.title.trim()}»${aprox(est, ocultos)}.` });
    }
  }

  if (tipos.anuais) {
    const porMes = new Map<string, string[]>();
    for (const a of despesasAnuais(e.annualExpenses ?? [])) {
      const am = `${a.year}-${pad(a.month)}`;
      porMes.set(am, [...(porMes.get(am) ?? []), `${a.name}${aprox(valorAnual(a, movimentos), ocultos)}`]);
    }
    for (const [am, l] of porMes) {
      const quando = noDia(`${am}-01`);
      if (!quando) continue;
      avisos.push({ chave: `anu:${am}`, tipo: 'anuais', quando, destino: { pagina: 'resumo' },
        titulo: l.length === 1 ? `Despesa anual em ${MESES[Number(am.slice(5)) - 1]}` : `${l.length} despesas anuais em ${MESES[Number(am.slice(5)) - 1]}`,
        texto: `${resumirLista(l)} por pagar este mês.` });
    }
  }

  if (tipos.vet) {
    for (const r of lembretes) {
      const { label, next } = info(r);
      const quem = r.pet ? ` — ${r.pet}` : '';
      const curta = `${Number(next.slice(8, 10))} de ${MESES[Number(next.slice(5, 7)) - 1]}`;
      if (next < hoje) {
        avisos.push({ chave: `vet:${r.id}:atraso`, tipo: 'vet', quando: proximaHora(agora, hora), botoes: 'vet', destino: { pagina: 'veterinario', vet: r.id },
          titulo: `${label} em atraso 🐾`, texto: `${label}${quem}, previsto para ${curta}.` });
        continue;
      }
      for (const [antes, titulo] of [[3, `${label} daqui a 3 dias 🐾`], [0, `${label} hoje 🐾`]] as const) {
        const quando = noDia(somarDias(next, -antes));
        if (quando) avisos.push({ chave: `vet:${r.id}:${antes}`, tipo: 'vet', quando, botoes: 'vet', destino: { pagina: 'veterinario', vet: r.id }, titulo, texto: `${label}${quem} · ${curta}.` });
      }
    }
  }

  if (tipos.backup && e.transactions.length) {
    const ultimo = ultimoBackup ? isoDia(new Date(ultimoBackup)) : '';
    // 30 dias depois do último backup e depois de 7 em 7 dias; sem nenhum, na próxima hora dos avisos
    let quando: Date | null = null;
    if (!ultimo) quando = proximaHora(agora, hora);
    else {
      let dia = somarDias(ultimo, 30);
      while (dia < hoje || !noDia(dia)) { dia = somarDias(dia, 7); if (dia > limite) break; }
      quando = noDia(dia);
    }
    if (quando) {
      const dias = ultimo ? Math.round((quando.getTime() - lerDia(ultimo).getTime()) / DIA) : 0;
      avisos.push({ chave: 'bkp', tipo: 'backup', quando, destino: { backup: true }, titulo: 'Está na hora de um backup',
        texto: ultimo ? `Já passaram ${dias} dias desde o último. Guarda uma cópia fora do telemóvel.` : 'Ainda não fizeste nenhum backup. Guarda uma cópia fora do telemóvel.' });
    }
  }

  if (tipos.semana) {
    // Segunda-feira: a semana anterior (segunda a domingo), comparada com a de antes
    const dow = (agora.getDay() + 6) % 7;
    let segunda = somarDias(hoje, (7 - dow) % 7);
    if (!noDia(segunda)) segunda = somarDias(segunda, 7);
    const quando = noDia(segunda);
    if (quando) {
      const s = gastoEntre(movimentos, somarDias(segunda, -7), somarDias(segunda, -1));
      const a = gastoEntre(movimentos, somarDias(segunda, -14), somarDias(segunda, -8));
      const maior = s.maior ? ` Maior gasto: ${s.maior.title.trim()}.` : '';
      avisos.push({ chave: `sem:${segunda}`, tipo: 'semana', quando, destino: { pagina: 'analise' },
        titulo: ocultos ? 'A tua semana' : `A tua semana: ${s.total.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        texto: `${ocultos ? '' : comparacao(s.total, a.total)}${maior}`.trim() || 'Vê os gastos da semana passada.' });
    }
  }

  if (tipos.mes) {
    const primeiro = isoDia(new Date(agora.getFullYear(), agora.getMonth() + 1, 1));
    const quando = noDia(primeiro);
    if (quando) {
      const mes = new Date(agora.getFullYear(), agora.getMonth(), 1), antes = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
      const g = fechoDoMes(e.transactions, mes).despesas, ga = fechoDoMes(e.transactions, antes).despesas;
      avisos.push({ chave: `mes:${anoMes(mes)}`, tipo: 'mes', quando, destino: { pagina: 'analise' },
        titulo: `Fecho de ${MESES[mes.getMonth()]}`,
        texto: ocultos ? `Vê quanto gastaste em ${MESES[mes.getMonth()]}.` : `Gastaste ${g.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €. ${comparacao(g, ga)}`.trim() });
    }
  }

  for (const a of config.adiados) {
    const quando = new Date(a.quando);
    if (quando > agora && tipos[a.tipo] !== false) avisos.push({ ...a, quando });
  }

  return avisos.sort((a, b) => a.quando.getTime() - b.quando.getTime());
}

/** Identificador numérico estável (as notificações do Android usam números de 32 bits). */
export function idDoAviso(chave: string): number {
  let h = 2166136261;
  for (let i = 0; i < chave.length; i++) { h ^= chave.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 2147483647 || 1;
}

/** «Lembrar amanhã»: o mesmo aviso no dia seguinte à hora dos avisos (os já passados saem da lista). */
export function adiar(config: ConfigAvisos, a: Pick<Aviso, 'chave' | 'tipo' | 'titulo' | 'texto' | 'botoes' | 'destino'>, agora: Date): ConfigAvisos {
  const quando = naHora(somarDias(isoDia(agora), 1), config.hora).toISOString();
  const chave = `adi:${a.chave}:${quando.slice(0, 10)}`;
  const adiados = config.adiados.filter((x) => new Date(x.quando) > agora && x.chave !== chave);
  return { ...config, adiados: [...adiados, { chave, tipo: a.tipo, quando, titulo: a.titulo, texto: a.texto, botoes: a.botoes, destino: a.destino }] };
}
