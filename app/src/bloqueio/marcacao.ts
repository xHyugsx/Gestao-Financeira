// Marcação do ecrã de bloqueio — igual à da app atual (as classes estão em css/app.css, secção ff-lock-style).

/** Estrelas: esquerda %, topo %, tamanho px, duração s, atraso s, brilho máximo. */
const ESTRELAS: readonly (readonly [string, string, string, string, string, string])[] = [
  ['32.74', '5.98', '3', '3.89', '2.11', '0.98'],
  ['64.79', '3.39', '2', '4.77', '0.78', '0.96'],
  ['13.13', '8.37', '1', '2.85', '1.17', '0.77'],
  ['62.49', '32.27', '2', '3.05', '2.18', '0.95'],
  ['96.67', '2.54', '1', '4.57', '1.42', '0.84'],
  ['15.14', '4.89', '2', '4.32', '2.07', '0.95'],
  ['54.68', '3.07', '2', '2.54', '0.61', '0.85'],
  ['64.42', '33.77', '2', '4.22', '2.43', '0.93'],
  ['17.47', '4.86', '1', '2.65', '1.89', '0.92'],
  ['13.68', '9.17', '2', '2.36', '2.73', '0.86'],
  ['18.27', '8.65', '2', '4.24', '0.42', '0.87'],
  ['58.73', '9.67', '1', '2.7', '0.17', '0.73'],
  ['67.27', '2.78', '2', '3.66', '3.04', '0.97'],
  ['21.46', '6.36', '2', '3.05', '3.89', '0.88'],
  ['34.33', '2.73', '1', '4.0', '1.81', '0.86'],
  ['61.18', '5.9', '2', '3.52', '0.99', '0.86'],
  ['36.69', '5.05', '1', '4.6', '3.57', '0.76'],
  ['84.2', '33.77', '2', '2.56', '0.49', '0.83'],
  ['34.58', '9.74', '1', '3.95', '1.71', '0.76'],
  ['3.26', '32.38', '1', '4.24', '3.59', '0.75'],
  ['52.77', '5.84', '3', '3.87', '1.46', '0.78'],
  ['54.23', '1.89', '1', '4.72', '0.88', '0.99'],
  ['52.75', '33.29', '2', '4.5', '0.65', '0.9'],
  ['33.31', '8.36', '1', '2.62', '1.73', '0.85'],
  ['80.53', '33.5', '1', '3.3', '1.43', '0.73'],
  ['35.85', '1.96', '1', '2.25', '2.22', '0.83'],
  ['92.83', '33.61', '1', '3.2', '2.07', '0.79'],
  ['22.61', '8.49', '1', '2.49', '3.67', '0.77'],
  ['20.28', '7.74', '1', '2.42', '1.09', '0.97'],
  ['62.16', '30.71', '1', '2.9', '0.52', '0.83'],
  ['64.99', '27.39', '3', '4.33', '1.03', '0.74'],
  ['40.34', '32.24', '2', '3.68', '2.8', '0.73'],
  ['13.45', '5.99', '1', '4.28', '0.73', '0.97'],
  ['13.84', '1.47', '1', '4.64', '2.54', '0.94'],
];

/** Ícone da impressão digital (lucide "fingerprint"). */
export const SVG_IMPRESSAO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>';

const SVG_SETA = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>';
const SVG_APAGAR = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="m18 9-6 6M12 9l6 6"/></svg>';

const tecla = (k: string, conteudo = k, extra = '') => `<button type="button" class="ffl-key${extra}" data-k="${k}"${extra ? ` aria-label="${k === 'bio' ? 'Biometria' : 'Apagar'}"` : ''}>${conteudo}</button>`;

export function marcacaoBloqueio(): string {
  const estrelas = ESTRELAS.map(([l, t, s, d, a, p]) =>
    `<i class="ffl-star" style="left:${l}%;top:${t}%;width:${s}px;height:${s}px;animation-duration:${d}s;animation-delay:${a}s;--peak:${p}"></i>`).join('');
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => tecla(k)).join('')
    + tecla('bio', '', ' ghost') + tecla('0') + tecla('del', SVG_APAGAR, ' ghost');
  return '<div class="ffl-backdrop ffl-img"></div>'
    + `<div class="ffl-stage"><div class="ffl-base ffl-img"></div><div class="ffl-clouds"><div class="ffl-layer ffl-img"></div></div>${estrelas}<div class="ffl-cw"><div class="ffl-comet"></div></div></div>`
    + '<div class="ffl-veil"></div>'
    + `<div class="ffl-hint">${SVG_SETA}<span>Deslize para cima para desbloquear</span><div class="ffl-bar"></div></div>`
    + `<div class="ffl-pad" aria-hidden="true"><h2>Introduza o PIN</h2><div class="ffl-dots"><i class="ffl-dot"></i><i class="ffl-dot"></i><i class="ffl-dot"></i><i class="ffl-dot"></i></div><div class="ffl-keys">${teclas}</div><button type="button" class="ffl-back">Cancelar</button></div>`
    + `<div class="ffl-wait"><div class="ffl-fp">${SVG_IMPRESSAO}</div><p>A aguardar impressão digital</p><button type="button" class="ffl-back ffl-usepin">Usar PIN</button></div>`
    + `<div class="ffl-sheet"><div class="ffl-sic">${SVG_IMPRESSAO}</div><h3>Desbloquear com impressão digital?</h3><p>Da próxima vez, entra na app com o sensor do telemóvel. O PIN continua disponível.</p><div class="ffl-btns"><button type="button" class="ffl-no">Agora não</button><button type="button" class="ffl-yes">Ativar</button></div></div>`;
}
