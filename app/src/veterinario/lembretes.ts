// Lembretes veterinários: lista na página Veterinário, janela de criar/editar, ponto no «Mais» e aviso ao abrir.
// Mesma marcação e mesmas regras de js/modulos/veterinario.js (chaves `vet-reminders` e `vet-snooze`).
import { PREFIXO } from '../config';
import { chave } from '../dados';
import { ANIMAIS } from './animais';

export interface Lembrete { id: number | string; pet: string; type: string; label?: string; last: string; every: number; note?: string }

const CHAVE = chave('lembretesVet', PREFIXO), ADIAR = chave('adiarVet', PREFIXO), DIA = 864e5;
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const TIPOS: [string, string, number][] = [['vacina', 'Vacina anual', 12], ['interna', 'Desparasitação interna', 3], ['externa', 'Desparasitação externa', 1], ['outro', 'Outro', 12]];
const REPETIR: [number, string][] = [[1, 'Todos os meses'], [3, 'A cada 3 meses'], [6, 'A cada 6 meses'], [12, 'Todos os anos'], [0, 'Só uma vez']];
const ICONES = {
  seringa: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>',
  comprimido: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>',
  sino: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
};

const escapar = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const doisDigitos = (n: number) => (n < 10 ? '0' : '') + n;
const iso = (d: Date) => `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
const hoje = () => iso(new Date());
const lerData = (s: string) => { const p = String(s).split('-'); return new Date(+p[0]!, +p[1]! - 1, +p[2]!); };
function somarMeses(s: string, m: number) {
  const d = lerData(s), dia = d.getDate(), t = new Date(d.getFullYear(), d.getMonth() + m, 1);
  t.setDate(Math.min(dia, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()));
  return iso(t);
}
const proxima = (r: Lembrete) => (r.every > 0 ? somarMeses(r.last, r.every) : r.last);
const dias = (r: Lembrete) => Math.round((lerData(proxima(r)).getTime() - lerData(hoje()).getTime()) / DIA);
function nome(r: Lembrete) {
  if (r.type === 'outro') return r.label || 'Outro';
  return TIPOS.find((t) => t[0] === r.type)?.[1] ?? 'Lembrete';
}
const cadaTexto = (n: number) => (n === 1 ? 'todos os meses' : n === 3 ? 'a cada 3 meses' : n === 6 ? 'a cada 6 meses' : n === 12 ? 'todos os anos' : n > 0 ? `a cada ${n} meses` : 'só uma vez');
const quando = (d: number) => (d < -1 ? `Em atraso há ${-d} dias` : d === -1 ? 'Em atraso há 1 dia' : d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : `Daqui a ${d} dias`);
const estado = (d: number) => (d < 0 ? 'late' : d <= 7 ? 'soon' : 'ok');
const curta = (s: string) => { const d = lerData(s); return `${d.getDate()} ${MES[d.getMonth()]}`; };
const icone = (r: Lembrete) => (r.type === 'vacina' ? ICONES.seringa : r.type === 'outro' ? ICONES.sino : ICONES.comprimido);
const vibrar = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* sem vibração */ } };

export interface InfoLembrete { label: string; next: string; days: number; when: string; short: string; every: string }

/** Nome, próxima data e estado de um lembrete (usado pelo Jarvis). */
export function info(r: Lembrete): InfoLembrete {
  const d = dias(r);
  return { label: nome(r), next: proxima(r), days: d, when: quando(d), short: curta(proxima(r)), every: cadaTexto(r.every) };
}

export function todos(): Lembrete[] {
  try {
    const a: unknown = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    return Array.isArray(a) ? (a as Lembrete[]).filter((r) => r && r.id && r.pet && r.last) : [];
  } catch { return []; }
}
function gravar(a: Lembrete[]) {
  try { localStorage.setItem(CHAVE, JSON.stringify(a)); } catch { /* sem armazenamento */ }
  atualizar();
}
/** Substitui todos os lembretes (restauro de backup). */
export function definir(a: unknown) { gravar(Array.isArray(a) ? (a as Lembrete[]) : []); }
export const ordenados = () => todos().sort((a, b) => proxima(a).localeCompare(proxima(b)));

let anfitrioes: HTMLElement[] = [];
function desenhar(el: HTMLElement) {
  const lista = ordenados();
  el.innerHTML = '<section class="ffvr"><div class="section-heading ffvr-hd"><h2>Lembretes</h2><button type="button" class="ffvr-add">+ Novo</button></div>'
    + (lista.length ? lista.map((r) => {
      const d = dias(r), n = proxima(r);
      return `<div class="ffvr-row ${estado(d)}" role="button" tabindex="0" data-id="${r.id}" aria-label="Editar lembrete ${escapar(`${r.pet} ${nome(r)}`)}"><span class="ffvr-ic">${icone(r)}</span><div class="ffvr-tx"><h3>${escapar(r.pet)} · ${escapar(nome(r))}</h3><p><span class="ffvr-st">${quando(d)}</span> · ${curta(n)} · ${cadaTexto(r.every)}</p>${r.note ? `<p class="ffvr-note">${escapar(r.note)}</p>` : ''}</div><button type="button" class="ffvr-done" data-done="${r.id}">Feito</button></div>`;
    }).join('') : '<div class="vet-empty ffvr-empty">Sem lembretes. Toca em «+ Novo» para criar o primeiro.</div>')
    + '</section>';
  el.querySelector<HTMLElement>('.ffvr-add')!.onclick = () => janela(null);
  el.querySelectorAll<HTMLElement>('.ffvr-row').forEach((linha) => {
    linha.onclick = (e) => { if (!(e.target as Element).closest('.ffvr-done')) janela(linha.dataset.id!); };
    linha.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); janela(linha.dataset.id!); } };
  });
  el.querySelectorAll<HTMLElement>('.ffvr-done').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); feito(b.dataset.done!); }; });
}

/** Mostra a lista de lembretes dentro de `el` (e mantém-na atualizada). */
export function montar(el: HTMLElement) { anfitrioes.push(el); desenhar(el); }
export function atualizar() { anfitrioes = anfitrioes.filter((h) => h.isConnected); anfitrioes.forEach(desenhar); ponto(); }

export function feito(id: string | number) {
  const a = todos(), r = a.find((x) => String(x.id) === String(id));
  if (!r) return;
  if (r.every > 0) { r.last = hoje(); gravar(a); } else gravar(a.filter((x) => x !== r));
  vibrar(30);
}

function janela(id: string | null) {
  const r = id ? todos().find((x) => String(x.id) === String(id)) ?? null : null;
  const atual: Partial<Lembrete> = r || { pet: ANIMAIS[0], type: 'vacina', every: 12, last: '', note: '' };
  const ov = document.createElement('div');
  ov.className = 'ffvr-ov';
  const opcoesTipo = TIPOS.map((t) => `<option value="${t[0]}"${t[0] === atual.type ? ' selected' : ''}>${t[1]}</option>`).join('');
  const opcoesRepetir = REPETIR.map((t) => `<option value="${t[0]}"${t[0] === atual.every ? ' selected' : ''}>${t[1]}</option>`).join('');
  const titulo = r ? 'Editar lembrete' : 'Novo lembrete';
  ov.innerHTML = `<div class="ffvr-dlg" role="dialog" aria-modal="true" aria-label="${titulo}"><h2>${titulo}</h2><p class="ffvr-sub">A app avisa-te quando estiver a chegar a data.</p>`
    + `<form class="movement-form"><div class="autohide-options ffvr-pets" role="radiogroup" aria-label="Animal">${ANIMAIS.map((a) => `<button type="button" data-pet="${a}">${a}</button>`).join('')}</div>`
    + `<label>Tipo<select name="type">${opcoesTipo}</select></label>`
    + `<label class="ffvr-lbl">Nome<input name="label" maxlength="40" placeholder="Ex.: Análises anuais" value="${escapar(atual.label || '')}"></label>`
    + `<div class="form-grid"><label><span class="ffvr-dl">Última vez</span><input type="date" name="last" value="${escapar(atual.last)}" max="${hoje()}"></label><label>Repetir<select name="every">${opcoesRepetir}</select></label></div>`
    + `<label>Nota (opcional)<input name="note" maxlength="80" placeholder="Ex.: marca, clínica…" value="${escapar(atual.note || '')}"></label>`
    + '<p class="ffvr-err" role="alert"></p>'
    + `<div class="ffvr-act">${r ? '<button type="button" class="ffvr-del">Eliminar</button>' : ''}<button type="button" class="ffvr-cancel">Cancelar</button><button type="submit" class="ffvr-save">Guardar</button></div></form></div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('in'));
  const f = ov.querySelector('form')!;
  const campo = (n: string) => f.elements.namedItem(n) as HTMLInputElement & HTMLSelectElement;
  const tipo = campo('type'), repetir = campo('every'), data = campo('last');
  const rotuloNome = ov.querySelector<HTMLElement>('.ffvr-lbl')!, rotuloData = ov.querySelector<HTMLElement>('.ffvr-dl')!, erro = ov.querySelector<HTMLElement>('.ffvr-err')!;
  let animal = atual.pet!;
  const pintarAnimal = () => ov.querySelectorAll<HTMLElement>('[data-pet]').forEach((b) => {
    const a = b.dataset.pet === animal;
    b.className = a ? 'autohide-choice autohide-choice-active' : 'autohide-choice';
    b.setAttribute('aria-checked', String(a));
    b.setAttribute('role', 'radio');
  });
  const sincronizar = () => {
    rotuloNome.style.display = tipo.value === 'outro' ? '' : 'none';
    const umaVez = repetir.value === '0';
    rotuloData.textContent = umaVez ? 'Data' : 'Última vez';
    if (umaVez) data.removeAttribute('max'); else data.max = hoje();
  };
  pintarAnimal(); sincronizar();
  ov.querySelector<HTMLElement>('.ffvr-pets')!.onclick = (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-pet]'); if (b) { animal = b.dataset.pet!; pintarAnimal(); } };
  tipo.onchange = () => { const t = TIPOS.find((x) => x[0] === tipo.value); if (t && tipo.value !== 'outro') repetir.value = String(t[2]); sincronizar(); };
  repetir.onchange = sincronizar;
  const fechar = () => { ov.classList.remove('in'); setTimeout(() => ov.remove(), 250); };
  ov.querySelector<HTMLElement>('.ffvr-cancel')!.onclick = fechar;
  ov.onclick = (e) => { if (e.target === ov) fechar(); };
  const eliminar = ov.querySelector<HTMLElement>('.ffvr-del');
  if (eliminar) eliminar.onclick = () => {
    if (!window.confirm('Eliminar este lembrete?')) return;
    gravar(todos().filter((x) => String(x.id) !== String(id))); vibrar([40, 60, 40]); fechar();
  };
  f.onsubmit = (e) => {
    e.preventDefault();
    const cada = +repetir.value, ultima = data.value || (cada > 0 ? hoje() : ''), rotulo = String(campo('label').value || '').trim();
    if (!ultima) { erro.textContent = 'Indica a data.'; return; }
    if (tipo.value === 'outro' && !rotulo) { erro.textContent = 'Indica o nome do lembrete.'; return; }
    const novo: Lembrete = { id: r ? r.id : Date.now(), pet: animal, type: tipo.value, label: tipo.value === 'outro' ? rotulo : undefined, last: ultima, every: cada, note: String(campo('note').value || '').trim() || undefined };
    let a = todos();
    if (r) a = a.map((x) => (String(x.id) === String(id) ? novo : x)); else a.push(novo);
    gravar(a); vibrar(30); fechar();
  };
}

const urgentes = () => ordenados().filter((r) => dias(r) <= 3);

/** Ponto no botão «Mais» quando há um lembrete para os próximos 7 dias. */
export function ponto() {
  const n = document.querySelector('.bottom-nav .ffnav-more');
  if (!n) return;
  const ligado = ordenados().some((r) => dias(r) <= 7);
  let i = n.querySelector('.ffvet-dot');
  if (ligado && !i) { i = document.createElement('i'); i.className = 'ffvet-dot'; i.setAttribute('aria-hidden', 'true'); n.appendChild(i); }
  else if (!ligado && i) i.remove();
}

/** Aviso "Lembrete veterinário" (devolve `false` se não houver nada urgente ou se foi adiado). */
export function aviso(irPara: (p: string) => void): boolean {
  const u = urgentes();
  if (!u.length || +(localStorage.getItem(ADIAR) ?? 0) > Date.now()) return false;
  const r = u[0]!, d = dias(r), nav = document.querySelector('.bottom-nav'), el = document.createElement('div');
  el.id = 'ff-vetbn';
  el.setAttribute('role', 'status');
  el.style.bottom = `${(nav ? window.innerHeight - nav.getBoundingClientRect().top : 0) + 12}px`;
  const mais = u.length > 1 ? ` (+${u.length - 1}${u.length > 2 ? ' outros' : ' outro'})` : '';
  const msg = d < 0 ? `em atraso há ${-d}${d === -1 ? ' dia' : ' dias'}` : d === 0 ? 'é hoje' : d === 1 ? 'é amanhã' : `daqui a ${d} dias`;
  el.innerHTML = `<div class="ic">${ICONES.sino.replace(/18/g, '22')}</div><div class="tx"><strong>Lembrete veterinário</strong><p><b>${escapar(r.pet)}</b> · ${escapar(nome(r))} ${msg}.${mais}</p><div class="bt"><button type="button" class="no">Mais tarde</button><button type="button" class="yes">Ver</button></div></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  const fechar = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); };
  el.querySelector<HTMLElement>('.no')!.onclick = () => {
    const t = new Date(); t.setHours(24, 0, 0, 0);
    try { localStorage.setItem(ADIAR, String(t.getTime())); } catch { /* sem armazenamento */ }
    fechar();
  };
  el.querySelector<HTMLElement>('.yes')!.onclick = () => { fechar(); irPara('veterinario'); };
  return true;
}

/** Ponto no «Mais» e atualizações ao voltar à app (o aviso ao abrir é mostrado por `iniciarAvisos`). */
export function iniciarLembretes() {
  setInterval(() => { if (document.visibilityState === 'visible') ponto(); }, 10000);
  document.addEventListener('click', () => { setTimeout(ponto, 400); }, true);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') atualizar(); });
  // A mesma interface da app atual (usada pelos testes e, mais tarde, pelo Jarvis)
  window.ffVet = { info, all: todos, set: definir, sorted: ordenados, done: feito, mount: montar, refresh: atualizar, soon: () => ordenados().some((r) => dias(r) <= 7) };
}
