// Revisão de um extrato antes de gravar, importação e "desfazer" — mesma marcação e regras de js/modulos/extratos.js.
import { PREFIXO } from '../config';
import { chave, type Conta, type Movimento, type Salarios } from '../dados';
import { classificar, type Item, type Memorizadas, type RegraPessoal } from './classificacao';
import type { Extrato } from './leitura';

const MEMORIZADAS = chave('regrasImportacao', PREFIXO), ULTIMA = chave('ultimaImportacao', PREFIXO);
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const PERGUNTAS = ['Transferência entre contas', 'Carregamento de conta', 'Poupança', 'Receita', 'Ignorar'];
const SEPARADORES: [string, string][] = [['ask', 'Por confirmar'], ['all', 'Todos'], ['exp', 'Despesas'], ['inc', 'Receitas'], ['sal', 'Salários'], ['tr', 'Transferências'], ['rev', 'Por rever'], ['ign', 'Ignorados']];

export interface ContaImportacao { id: string; name: string; balance: number; cur: number }

/** O que a importação precisa da app (dados atuais e alterações). */
export interface ApiImportacao {
  obter: () => { tx: Movimento[]; cats: string[]; inc: string[]; sal: Salarios; acc: ContaImportacao[] };
  regrasPessoais: () => RegraPessoal[];
  juntarMovimentos: (l: Movimento[]) => void;
  removerLote: (lote: string) => void;
  juntarCategorias: (l: string[]) => void;
  definirSalario: (ano: string, pessoa: string, mes: number, valor: number) => void;
  /** Acerta o saldo da conta para o saldo do extrato; devolve a conta como estava (para desfazer). */
  acertarSaldo: (id: string, saldo: number) => Conta | null;
  reporConta: (c: Conta) => void;
  tipoVisual: (tipo: 'income' | 'expense', categoria: string) => string;
  dizer: (texto: string) => void;
}

const escapar = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const euros = (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const dataCurta = (d: string) => `${+d.slice(8)} ${MESES_CURTOS[+d.slice(5, 7) - 1]}`;
function ler<T>(k: string, omissao: T): T { try { return (JSON.parse(localStorage.getItem(k) || 'null') as T) ?? omissao; } catch { return omissao; } }
const gravar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem espaço */ } };

interface Sessao {
  ext: Extrato; items: Item[]; cats: string[]; inc: string[]; acc: ContaImportacao[]; skipped: number;
  tab: string; accId: string; setBal: boolean; remember: boolean; scroll?: number; api: ApiImportacao;
}
let S: Sessao | null = null;
let ultimoExtrato: Extrato | null = null;

function resumo(s: Sessao): string {
  const I = s.items, n = (k: string) => I.filter((o) => o.k === k).length, sal = I.filter((o) => o.k === 'sal');
  const pessoas = new Set(sal.map((o) => o.p)).size, meses = new Set(sal.map((o) => o.d.slice(0, 7))).size;
  return `${I.length} movimentos · ${n('exp')} despesas · ${n('inc')} receitas · ${sal.length ? `${pessoas} ${pessoas === 1 ? 'salário' : 'salários'} × ${meses} ${meses === 1 ? 'mês' : 'meses'}` : '0 salários'} · ${n('tr')} transferências${n('ign') ? ` · ${n('ign')} ignorados` : ''}${s.skipped ? ` · ${s.skipped} já importados antes` : ''}`;
}

function abrir(ext: Extrato, api: ApiImportacao) {
  const d = api.obter();
  const c = classificar(ext, d, api.regrasPessoais(), ler<Memorizadas>(MEMORIZADAS, {}));
  S = { ext, items: c.items, cats: c.cats, inc: d.inc, acc: d.acc, skipped: c.skipped, tab: c.items.some((o) => o.k === 'ask' && !o.ch) ? 'ask' : 'all', accId: 'principal', setBal: false, remember: true, api };
  desenhar();
}

function desenhar() {
  const s = S!;
  let root = document.getElementById('ffst');
  if (!root) {
    root = document.createElement('div');
    root.id = 'ffst'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Importar extrato');
    document.body.appendChild(root);
    const r = root;
    requestAnimationFrame(() => r.classList.add('in'));
  }
  const I = s.items, pend = I.filter((o) => o.k === 'ask' && !o.ch).length, on = I.filter((o) => o.on), conta = s.acc.find((a) => a.id === s.accId) || s.acc[0]!;
  const L = I.filter((o) => s.tab === 'all' || (s.tab === 'rev' ? o.k === 'exp' && o.c === 'Outros' : o.k === s.tab));
  let h = '', mesAtual = '';
  for (const o of L) {
    const mk = o.d.slice(0, 7);
    if (mk !== mesAtual) { mesAtual = mk; h += `<div class="ffst-mo">${MESES[+o.d.slice(5, 7) - 1]} ${o.d.slice(0, 4)}</div>`; }
    let sub = o.k === 'ign' ? '<span class="ffst-tag g">Ignorado · não é registado</span>'
      : o.k === 'ask' ? `<select data-a="${o.i}" class="${o.ch ? '' : 'warn'}"><option value="">O que é isto? Escolhe…</option>${PERGUNTAS.map((x) => `<option${x === o.ch ? ' selected' : ''}>${x}</option>`).join('')}</select>`
        : o.k === 'sal' ? `<span class="ffst-tag s">Salário de ${escapar(o.p)} → ${MESES[+o.d.slice(5, 7) - 1]}</span>`
          : o.k === 'tr' ? '<span class="ffst-tag">Transferência · não conta como gasto</span>'
            : `<select data-i="${o.i}">${(o.k === 'inc' ? s.inc : s.cats.concat(s.cats.includes(o.c!) ? [] : [o.c!])).map((x) => `<option${x === o.c ? ' selected' : ''}>${escapar(x)}</option>`).join('')}</select>${o.rec ? ' <span class="ffst-tag b">Recorrente</span>' : ''}`;
    if (o.tag) sub += ` <span class="ffst-tag">${o.tag}</span>`;
    h += `<div class="ffst-row${o.on ? '' : ' off'}${o.k === 'ask' && !o.ch ? ' ask' : ''}"><input type="checkbox" data-c="${o.i}"${o.on ? ' checked' : ''}${o.k === 'ign' || o.k === 'ask' ? ' disabled' : ''} aria-label="Importar ${escapar(o.t)}"><div class="ffst-mid"><div class="ffst-tt">${escapar(o.t)}</div><div class="ffst-sub">${dataCurta(o.d)} · ${sub}</div></div><div class="ffst-am ${o.a < 0 ? 'n' : 'p'}">${euros(o.a)}</div></div>`;
  }
  const despesas = on.filter((o) => o.k === 'exp');
  root.innerHTML = `<div class="ffst-hd"><div class="ffst-t"><h2>Importar extrato · ${escapar(s.ext.bank)}</h2><button class="ffst-x" aria-label="Fechar">✕</button></div><p>${resumo(s)}</p>`
    + `<div class="ffst-opt"><label>Conta na app <select class="ffst-acc">${s.acc.map((a) => `<option value="${escapar(a.id)}"${a.id === s.accId ? ' selected' : ''}>${escapar(a.name)}</option>`).join('')}</select></label>`
    + (s.ext.balance != null ? `<label><input type="checkbox" class="ffst-bal"${s.setBal ? ' checked' : ''}> Acertar o saldo de ${escapar(conta.name)} para <b>${euros(s.ext.balance)}</b> (saldo do extrato)</label>` : '')
    + `<label><input type="checkbox" class="ffst-rem"${s.remember ? ' checked' : ''}> Lembrar as minhas escolhas nos próximos extratos</label></div>`
    + `<div class="ffst-tabs">${SEPARADORES.filter(([t]) => t === 'all' || t === 'rev' || I.some((o) => o.k === t)).map(([t, nome]) => `<button data-t="${t}" class="${t === s.tab ? 'on' : ''}">${t === 'ask' ? (pend ? `Por confirmar (${pend})` : 'Por confirmar ✓') : nome}</button>`).join('')}</div></div>`
    + `<div class="ffst-list">${h || '<p class="ffst-empty">Nada nesta vista.</p>'}</div>`
    + `<div class="ffst-ft"><small>${despesas.length} despesas (${euros(despesas.reduce((t, o) => t - o.a, 0))}) · ${on.filter((o) => o.k === 'inc' || o.ch === 'Receita').length} receitas · ${on.filter((o) => o.k === 'sal').length} salários</small><button class="ffst-go"${pend || !on.length ? ' disabled' : ''}>${pend ? `Falta confirmar ${pend} ${pend === 1 ? 'movimento' : 'movimentos'}` : `Importar ${on.length} movimentos`}</button></div>`;
  const lista = root.querySelector<HTMLElement>('.ffst-list')!;
  lista.scrollTop = s.scroll || 0;
  lista.addEventListener('scroll', () => { s.scroll = lista.scrollTop; });
  root.querySelector<HTMLElement>('.ffst-x')!.onclick = fechar;
  root.querySelector<HTMLSelectElement>('.ffst-acc')!.onchange = (e) => { s.accId = (e.target as HTMLSelectElement).value; desenhar(); };
  const bal = root.querySelector<HTMLInputElement>('.ffst-bal');
  if (bal) bal.onchange = (e) => { s.setBal = (e.target as HTMLInputElement).checked; };
  root.querySelector<HTMLInputElement>('.ffst-rem')!.onchange = (e) => { s.remember = (e.target as HTMLInputElement).checked; };
  root.querySelector<HTMLElement>('.ffst-tabs')!.onclick = (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-t]'); if (b) { s.tab = b.dataset.t!; s.scroll = 0; desenhar(); } };
  lista.onchange = (e) => {
    const t = e.target as HTMLInputElement & HTMLSelectElement;
    const achar = (v?: string) => I.find((x) => x.i === +v!)!;
    if (t.dataset.a != null) { const o = achar(t.dataset.a); o.ch = t.value; o.on = !!o.ch && o.ch !== 'Ignorar'; desenhar(); }
    else if (t.dataset.c != null) { achar(t.dataset.c).on = t.checked; desenhar(); }
    else if (t.dataset.i != null) { const o = achar(t.dataset.i); o.c = t.value; o.edited = true; desenhar(); }
  };
  root.querySelector<HTMLElement>('.ffst-go')!.onclick = importar;
}

function fechar() {
  const r = document.getElementById('ffst');
  if (!r) return;
  r.classList.remove('in');
  setTimeout(() => r.remove(), 250);
}

// `bal` tem o mesmo formato da app atual ({ id, old }) e, na app nova, a conta inteira (saldo e acertos por dia)
interface Desfazer { batch: string; sal: [string, string, number, number][]; bal: { id: string; old: number; conta?: Conta } | null; n: number }

function importar() {
  const s = S!, api = s.api, d = api.obter(), on = s.items.filter((o) => o.on), lote = `imp${Date.now()}`, conta = s.accId, base = Date.now();
  const tx: Movimento[] = [], sal: [string, string, number, number, number][] = [], novas: string[] = [], R = ler<Memorizadas>(MEMORIZADAS, {});
  on.forEach((o, n) => {
    const dia = +o.d.slice(8), mes = MESES[+o.d.slice(5, 7) - 1];
    const comum = { id: base + n, date: o.d, affectsBalance: false, importKey: o.key, importBatch: lote };
    if (o.k === 'sal') {
      const ano = o.d.slice(0, 4), m = +o.d.slice(5, 7) - 1;
      sal.push([ano, o.p!, m, d.sal[ano]?.[o.p!]?.[m] || 0, Math.abs(o.a)]);
      return;
    }
    if (o.k === 'tr' || (o.k === 'ask' && o.ch && o.ch !== 'Receita')) {
      tx.push({ title: o.t, detail: `${dia} ${mes} · Transferência`, amount: 0, kind: 'transfer', movementType: 'transfer', transferValue: Math.abs(o.a), note: o.k === 'ask' ? o.ch : 'Transferência entre contas', ...comum });
      return;
    }
    const receita = o.k === 'inc' || o.ch === 'Receita', cat = receita ? (o.ch === 'Receita' ? 'Outras receitas' : o.c!) : o.c!;
    if (!receita && !d.cats.includes(cat) && !novas.includes(cat) && cat !== 'Outros') novas.push(cat);
    tx.push({
      title: o.t, detail: `${dia} ${mes} · ${cat}`, amount: receita ? Math.abs(o.a) : -Math.abs(o.a), kind: api.tipoVisual(receita ? 'income' : 'expense', cat),
      movementType: receita ? 'income' : 'expense', ...(conta !== 'principal' ? { account: conta } : {}), ...(o.rec ? { recurring: 'com' } : {}), ...comum,
    });
  });
  if (s.remember) {
    for (const o of s.items) {
      if (o.k === 'ask' && o.ch) R[o.N] = { k: o.ch === 'Ignorar' ? 'ign' : o.ch === 'Receita' ? 'inc' : 'ask', ch: o.ch };
      else if (o.edited && (o.k === 'exp' || o.k === 'inc')) R[o.N] = { k: o.k, c: o.c! };
    }
  }
  gravar(MEMORIZADAS, R);
  const desfazer: Desfazer = { batch: lote, sal: sal.map((x) => [x[0], x[1], x[2], x[3]]), bal: null, n: tx.length };
  if (novas.length) api.juntarCategorias(novas);
  if (tx.length) api.juntarMovimentos(tx);
  for (const x of sal) api.definirSalario(x[0], x[1], x[2], x[4]);
  if (s.setBal && s.ext.balance != null) {
    const antes = api.acertarSaldo(conta, s.ext.balance);
    if (antes) desfazer.bal = { id: antes.id, old: antes.balance ?? 0, conta: antes };
  }
  gravar(ULTIMA, desfazer);
  const nome = d.acc.find((x) => x.id === conta)?.name || 'Principal';
  fechar();
  api.dizer(`Importação concluída ✅ ${tx.length} movimentos em ${nome}${sal.length ? ` · ${sal.length} salários registados` : ''}${desfazer.bal ? ` · saldo acertado para ${euros(s.ext.balance!)}` : ''}.\nOs movimentos não alteraram o saldo da conta. Para anular, usa «Desfazer a última importação».`);
  S = null;
}

/** Desfaz a última importação (movimentos, salários e saldo). */
export function desfazerImportacao(api: ApiImportacao): string {
  const u = ler<Desfazer | null>(ULTIMA, null);
  if (!u) return 'Não há nenhuma importação para desfazer.';
  api.removerLote(u.batch);
  for (const x of u.sal || []) api.definirSalario(x[0], x[1], x[2], x[3]);
  if (u.bal) api.reporConta(u.bal.conta ?? { id: u.bal.id, balance: u.bal.old } as Conta);
  try { localStorage.removeItem(ULTIMA); } catch { /* sem armazenamento */ }
  return `Importação anulada ↩️ Removi ${u.n} movimentos${(u.sal || []).length ? ', repus os salários' : ''}${u.bal ? ' e o saldo anterior' : ''}.`;
}

export const haImportacaoParaDesfazer = () => !!ler<Desfazer | null>(ULTIMA, null);

/** Abre a revisão do extrato; devolve a mensagem para o utilizador. */
export function abrirRevisao(ext: Extrato, api: ApiImportacao): string {
  ultimoExtrato = ext;
  abrir(ext, api);
  const pend = S ? S.items.filter((o) => o.k === 'ask' && !o.ch).length : 0;
  return `Encontrei um extrato ${ext.bank === 'banco' ? 'bancário' : `da ${ext.bank}`} com ${ext.lines.length} movimentos (${dataCurta(ext.from)} a ${dataCurta(ext.to)}).\nSeparei despesas, receitas, salários e transferências e sugeri categorias${pend ? `. Há ${pend} ${pend === 1 ? 'movimento' : 'movimentos'} que preciso que confirmes` : ''}. Nada é gravado sem carregares em «Importar».`;
}

export function reabrirRevisao(api: ApiImportacao): string {
  if (!ultimoExtrato) return 'Não há nenhum extrato por rever.';
  abrir(ultimoExtrato, api);
  return 'Abri a revisão do extrato.';
}
