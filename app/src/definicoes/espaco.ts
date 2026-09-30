// Espaço ocupado no telemóvel: medidor no Backup, aviso diário quando está quase cheio e aviso quando a gravação falha.
// Mesma marcação e mesmas regras de js/modulos/armazenamento.js.
import { PREFIXO } from '../config';
import { chave, PREFIXO_REAL } from '../dados';

const LIMITE = 5242880, AVISO_DIA = chave('avisoEspaco', PREFIXO);
let aFalhar = false;

const tamanho = (n: number) => (n < 104858 ? `${n < 512 ? 0 : Math.max(1, Math.round(n / 1024))} KB`
  : `${(n / 1048576).toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`);

export function medir() {
  let total = 0, nmov = 0;
  const partes = { fotos: 0, mov: 0, jarvis: 0, outros: 0 };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!, v = localStorage.getItem(k) || '', n = k.length + v.length;
      total += n;
      if (k === `${PREFIXO_REAL}v3` || k === `${PREFIXO}v3`) {
        try {
          const d = JSON.parse(v) as { petPhotos?: unknown; transactions?: unknown[] };
          const f = JSON.stringify(d.petPhotos || {}).length, t = JSON.stringify(d.transactions || []).length;
          nmov = (d.transactions || []).length;
          partes.fotos += f; partes.mov += t; partes.outros += n - f - t;
        } catch { partes.outros += n; }
      } else if (/jarvis/i.test(k)) partes.jarvis += n;
      else partes.outros += n;
    }
  } catch { /* sem armazenamento */ }
  return { total, pct: Math.min(100, Math.round((total / LIMITE) * 100)), partes, nmov };
}

const cor = (p: number) => (p >= 85 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : p >= 60 ? 'linear-gradient(90deg,#fbbf24,#f59e0b)' : 'linear-gradient(90deg,#22c55e,#4ade80)');

function desenhar(el: HTMLElement) {
  const m = medir(), p = m.pct, maior = Object.entries(m.partes).sort((a, b) => b[1] - a[1])[0]!;
  el.innerHTML = `<section class="ffsto"><div class="ffsto-h"><strong>Espaço de armazenamento</strong><small>${tamanho(m.total)} de ~5 MB</small></div>`
    + `<div class="ffsto-bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="Espaço usado"><i style="width:${Math.max(p, 2)}%;background:${cor(p)}"></i></div>`
    + `<small class="ffsto-st ${p >= 85 ? 'r' : p >= 60 ? 'a' : 'g'}">${p}% usado${p >= 85 ? ' — está quase cheio' : p >= 60 ? ' — convém ir vigiando' : ' — tudo bem'}</small>`
    + `<div class="ffsto-l"><div><span>📷 Fotos dos animais</span><b>${tamanho(m.partes.fotos)}</b></div><div><span>💶 Movimentos (${m.nmov.toLocaleString('pt-PT')})</span><b>${tamanho(m.partes.mov)}</b></div><div><span>🤖 Conversa do Jarvis</span><b>${tamanho(m.partes.jarvis)}</b></div><div><span>⚙️ Definições e outros</span><b>${tamanho(m.partes.outros)}</b></div></div>`
    + (p >= 60 ? `<p class="ffsto-tip">${maior[0] === 'fotos' ? 'As fotos são o que mais ocupa. Trocar uma foto por outra mais pequena liberta espaço.' : maior[0] === 'jarvis' ? 'A conversa do Jarvis ocupa bastante. Limpá-la (🗑️ no Jarvis) liberta espaço.' : 'Faz um backup e guarda-o fora do telemóvel.'}</p>` : '')
    + '</section>';
}

let anfitrioes: HTMLElement[] = [];
export function montarEspaco(el: HTMLElement) { anfitrioes.push(el); desenhar(el); }
function atualizar() { anfitrioes = anfitrioes.filter((h) => h.isConnected); anfitrioes.forEach(desenhar); }

interface Acoes { fazerBackup: () => void; verEspaco: () => void }

function aviso(tipo: 'err' | 'warn', a: Acoes) {
  document.getElementById('ffsto-bn')?.remove();
  const el = document.createElement('div');
  el.id = 'ffsto-bn'; el.className = tipo; el.setAttribute('role', 'alert');
  const m = medir();
  el.innerHTML = tipo === 'err'
    ? '<b>⚠️ As últimas alterações não foram guardadas</b><span>O armazenamento da app neste telemóvel está cheio. Faz um backup e liberta espaço.</span><div><button class="bk">Fazer backup</button><button class="see">Ver o que ocupa</button></div>'
    : `<b>💾 Armazenamento a ${m.pct}%</b><span>Está quase cheio. Convém libertar espaço antes que as alterações deixem de ser guardadas.</span><div><button class="ok">Ok</button><button class="see">Ver o que ocupa</button></div>`;
  document.body.appendChild(el);
  el.querySelector<HTMLElement>('.bk')?.addEventListener('click', a.fazerBackup);
  el.querySelector<HTMLElement>('.ok')?.addEventListener('click', () => el.remove());
  el.querySelector<HTMLElement>('.see')!.onclick = () => { if (tipo !== 'err') el.remove(); a.verEspaco(); };
}

/** Avisos de gravação falhada e de espaço quase cheio (uma vez por dia). */
export function iniciarEspaco(a: Acoes) {
  window.ffSaveFail = () => { if (aFalhar) return; aFalhar = true; aviso('err', a); };
  window.ffSaveOk = () => {
    if (!aFalhar) return;
    aFalhar = false;
    const b = document.getElementById('ffsto-bn');
    if (b?.className === 'err') b.remove();
    atualizar();
  };
  setTimeout(() => {
    const m = medir();
    if (m.pct < 85) return;
    const dia = new Date().toDateString();
    try { if (localStorage.getItem(AVISO_DIA) === dia) return; localStorage.setItem(AVISO_DIA, dia); } catch { /* sem armazenamento */ }
    if (!aFalhar) aviso('warn', a);
  }, 3500);
}
