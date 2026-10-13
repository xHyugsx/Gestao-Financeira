// Arco do sol/lua do cabeçalho da Principal e saudação — mesmas fórmulas da app atual (latitude ~38,7° N).

/** Horas (decimais, hora local) do nascer e do pôr do sol no dia de `d`. */
export function horasDoSol(d: Date): [number, number] {
  const r = Math.PI / 180;
  const n = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5);
  const de = -23.44 * Math.cos(((2 * Math.PI) / 365) * (n + 10)) * r;
  const h = Math.acos(Math.max(-1, Math.min(1, -Math.tan(38.72 * r) * Math.tan(de)))) / r;
  const b = (2 * Math.PI * (n - 81)) / 364;
  const eq = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const meio = 12 + 9.14 / 15 - eq / 60 - d.getTimezoneOffset() / 60;
  return [meio - h / 15, meio + h / 15];
}

export function saudacao(d: Date): string {
  const h = d.getHours() + d.getMinutes() / 60;
  const [, por] = horasDoSol(d);
  return h >= 6 && h < 12 ? 'Bom dia' : h >= 12 && h < por ? 'Boa tarde' : 'Boa noite';
}

/** SVG do céu (texto), igual ao da app atual. */
export function svgDoCeu(d: Date): string {
  const [nascer, por] = horasDoSol(d);
  const t = d.getHours() + d.getMinutes() / 60;
  const dia = t >= nascer && t <= por;
  const x0 = 18, x1 = 282, hy = 66, tp = 12;
  const p = dia ? (t - nascer) / (por - nascer) : ((t - por + 24) % 24) / (24 - (por - nascer));
  const x = x0 + (x1 - x0) * p, y = hy - (hy - tp) * Math.sin(Math.PI * p), e = Math.sin(Math.PI * p);
  const crepusculo = Math.min(Math.abs(t - nascer), Math.abs(t - por));
  const estrelas = dia ? 0 : Math.min(1, crepusculo / 0.7);
  const hm = (h: number) => {
    const m = Math.round(((h + 24) % 24) * 60);
    return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };
  const mistura = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v * (1 - k) + b[i]! * k)).join(',')})`;
  let arco = '';
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    arco += `${i ? 'L' : 'M'}${(x0 + (x1 - x0) * k).toFixed(1)} ${(hy - (hy - tp) * Math.sin(Math.PI * k)).toFixed(1)}`;
  }
  let o = `<svg viewBox="0 0 300 76"><path d="${arco}" fill="none" stroke="currentColor" stroke-opacity=".4" stroke-dasharray="2 4"/><line x1="8" x2="292" y1="${hy}" y2="${hy}" stroke="currentColor" stroke-opacity=".35"/><g style="opacity:${estrelas};transition:opacity .6s">`
    + [[40, 18], [78, 34], [120, 12], [166, 28], [210, 16], [252, 36], [286, 20], [98, 52], [236, 56], [20, 44]]
      .map(([a, b], i) => `<circle class="ws-star" cx="${a}" cy="${b}" r="${i % 3 ? 0.9 : 1.3}" fill="#fff" style="animation-delay:${(i * 0.37).toFixed(2)}s"/>`).join('')
    + '</g>';
  if (dia) {
    const c = mistura([255, 138, 76], [255, 212, 92], Math.min(1, e * 1.4));
    o += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle class="ws-halo" r="20" fill="${c}" style="filter:blur(6px)"/><g class="ws-rays">${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="-13" x2="0" y2="-17" stroke="${c}" stroke-width="2" stroke-linecap="round" transform="rotate(${i * 45})"/>`).join('')}</g><circle r="9" fill="${c}"/></g>`;
  } else {
    o += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g class="ws-moon"><circle r="16" fill="#cfd8ff" opacity=".18" style="filter:blur(5px)"/><path d="M4 -9 A10 10 0 1 0 4 9 A7.5 7.5 0 1 1 4 -9Z" fill="#e8ecff"/><circle cx="-4" cy="3" r="1.3" fill="#c3cbef"/><circle cx="-1" cy="-4" r=".9" fill="#c3cbef"/></g></g>`;
  }
  return `${o}<text x="10" y="75" font-size="7" fill="currentColor">${hm(nascer)}</text><text x="290" y="75" font-size="7" fill="currentColor" text-anchor="end">${hm(por)}</text></svg>`;
}
