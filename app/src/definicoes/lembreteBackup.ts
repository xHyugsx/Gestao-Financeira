// Avisos ao abrir a app: primeiro o lembrete veterinário urgente; se não houver, o lembrete de backup
// (sem backup ou o último há mais de 30 dias). Mesma marcação e regras de js/modulos/lembrete-backup.js.
import { PREFIXO } from '../config';
import { chave } from '../dados';

const ULTIMO = chave('ultimoBackup', PREFIXO), ADIAR = chave('adiarBackup', PREFIXO), DIA = 864e5;

export interface Backup {
  /** Número de movimentos (sem movimentos não há nada para guardar). */
  contar: () => number;
  /** Conteúdo do ficheiro de backup. */
  conteudo: () => unknown;
  descarregar: () => void;
  /** Regista a data do backup feito (partilhado). */
  feito: () => void;
}

const ler = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
function idade(): number | null { const d = ler(ULTIMO); return d ? Math.floor((Date.now() - new Date(d).getTime()) / DIA) : null; }
function devido(b: Backup) {
  if (!b.contar()) return false;
  if (+(ler(ADIAR) ?? 0) > Date.now()) return false;
  const a = idade();
  return a === null || a > 30;
}
const pronta = () => !document.getElementById('ff-lock') && !!document.querySelector('.bottom-nav') && !document.querySelector('.settings-sheet') && document.visibilityState === 'visible';
const fechar = (el: HTMLElement) => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); };

function ficheiro(b: Backup): File | null {
  const json = JSON.stringify(b.conteudo(), null, 2), nome = `financas-familiar-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (!window.File || !navigator.canShare) return null;
  let f = new File([json], nome, { type: 'application/json' });
  if (navigator.canShare({ files: [f] })) return f;
  f = new File([json], nome, { type: 'text/plain' });
  return navigator.canShare({ files: [f] }) ? f : null;
}

function fazer(b: Backup, el: HTMLElement, botao: HTMLButtonElement) {
  let f: File | null = null;
  try { f = ficheiro(b); } catch { /* sem partilha */ }
  if (!f || !navigator.share) { b.descarregar(); fechar(el); return; }
  botao.disabled = true;
  navigator.share({ files: [f], title: 'Cópia de segurança · Finanças' }).then(() => { b.feito(); fechar(el); }).catch((e: unknown) => {
    botao.disabled = false;
    if (!(e instanceof Error) || e.name !== 'AbortError') { b.descarregar(); fechar(el); }
  });
}

function mostrar(b: Backup) {
  const a = idade(), nav = document.querySelector('.bottom-nav'), el = document.createElement('div');
  el.id = 'ff-bk';
  el.setAttribute('role', 'status');
  el.style.bottom = `${(nav ? window.innerHeight - nav.getBoundingClientRect().top : 0) + 12}px`;
  el.innerHTML = '<div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg></div>'
    + `<div class="tx"><strong>Cópia de segurança</strong><p>${a === null ? 'Ainda não fizeste nenhuma cópia de segurança.' : `O último backup foi há <b>${a} dias</b>.`} Guarda uma cópia fora do telemóvel.</p><div class="bt"><button type="button" class="no">Mais tarde</button><button type="button" class="yes">Fazer backup</button></div></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  el.querySelector<HTMLElement>('.no')!.onclick = () => { try { localStorage.setItem(ADIAR, String(Date.now() + 7 * DIA)); } catch { /* sem armazenamento */ } fechar(el); };
  const sim = el.querySelector<HTMLButtonElement>('.yes')!;
  sim.onclick = () => fazer(b, el, sim);
}

/** Quando a app fica pronta (sem bloqueio): aviso veterinário, senão lembrete de backup. */
export function iniciarAvisos(b: Backup, avisoVeterinario: () => boolean) {
  let feito = false;
  const t = setInterval(() => {
    if (feito || !pronta()) return;
    feito = true;
    clearInterval(t);
    setTimeout(() => {
      if (!pronta()) return;
      if (avisoVeterinario()) return;
      if (devido(b)) mostrar(b);
    }, 2000);
  }, 1000);
}
