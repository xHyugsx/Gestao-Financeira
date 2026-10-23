// Ano em revista › «Partilhar»: desenha o ecrã atual numa imagem (1080×1350) e partilha-a (ou guarda-a, se não der).

export interface Cartao {
  olho: string;
  valor: string;
  linhas: string[];
  barras?: { rotulo: string; v: number; futuro?: boolean }[];
  lista?: { nome: string; texto: string; parte: number }[];
}

const PALETAS: [string, string][] = [
  ['rgba(139, 92, 246, .55)', 'rgba(236, 72, 153, .4)'], ['rgba(0, 200, 255, .45)', 'rgba(139, 92, 246, .45)'],
  ['rgba(236, 72, 153, .45)', 'rgba(251, 146, 60, .35)'], ['rgba(52, 211, 153, .4)', 'rgba(0, 200, 255, .4)'],
  ['rgba(250, 204, 21, .3)', 'rgba(236, 72, 153, .4)'],
];
const W = 1080, H = 1350, X = 80;

function linhasQueCabem(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const palavras = texto.split(/\s+/), out: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const t = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(t).width > largura && atual) { out.push(atual); atual = p; } else atual = t;
  }
  if (atual) out.push(atual);
  return out;
}

function mancha(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, cor: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, cor); g.addColorStop(1, 'rgba(7, 10, 34, 0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

export async function desenharCartao(c: Cartao, ano: number, estilo: number): Promise<Blob> {
  await document.fonts?.ready;
  const raiz = getComputedStyle(document.documentElement);
  const titulo = raiz.getPropertyValue('--font-display').trim() || 'sans-serif', texto = getComputedStyle(document.body).fontFamily || 'sans-serif';
  const tela = document.createElement('canvas');
  tela.width = W; tela.height = H;
  const ctx = tela.getContext('2d')!;
  const [a, b] = PALETAS[estilo % PALETAS.length]!;
  ctx.fillStyle = '#070a22'; ctx.fillRect(0, 0, W, H);
  mancha(ctx, W * 0.2, H * 0.1, W * 1.1, a); mancha(ctx, W * 0.9, H * 0.9, W, b);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255, 255, 255, .55)'; ctx.font = `600 34px ${texto}`;
  ctx.fillText(`ANO EM REVISTA ${ano}`.split('').join(String.fromCharCode(8202)), X, 130);

  let y = c.barras || c.lista ? 330 : 470;
  ctx.fillStyle = 'rgba(255, 255, 255, .72)'; ctx.font = `600 40px ${texto}`;
  ctx.fillText(c.olho.toUpperCase(), X, y);
  y += 40;
  let tam = 150;
  ctx.font = `700 ${tam}px ${titulo}`;
  while (ctx.measureText(c.valor).width > W - X * 2 && tam > 60) { tam -= 6; ctx.font = `700 ${tam}px ${titulo}`; }
  y += tam;
  const grad = ctx.createLinearGradient(X, y - tam, W - X, y);
  grad.addColorStop(0, '#00f0ff'); grad.addColorStop(0.55, '#a78bfa'); grad.addColorStop(1, '#f472b6');
  ctx.fillStyle = grad; ctx.fillText(c.valor, X, y);
  y += 40;
  ctx.fillStyle = 'rgba(255, 255, 255, .86)'; ctx.font = `400 42px ${texto}`;
  for (const l of c.linhas) for (const t of linhasQueCabem(ctx, l, W - X * 2)) { y += 62; ctx.fillText(t, X, y); }

  if (c.barras?.length) {
    const max = Math.max(1, ...c.barras.map((e) => e.v)), base = 1130, alto = 330, passo = (W - X * 2) / c.barras.length;
    c.barras.forEach((e, i) => {
      const h = Math.max(8, (e.v / max) * alto), x = X + i * passo + passo * 0.18, w = passo * 0.64;
      ctx.fillStyle = e.futuro ? 'rgba(255, 255, 255, .12)' : grad;
      ctx.beginPath(); ctx.roundRect(x, base - h, w, h, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, .6)'; ctx.font = `600 30px ${texto}`; ctx.textAlign = 'center';
      ctx.fillText(e.rotulo, x + w / 2, base + 44); ctx.textAlign = 'left';
    });
  }
  if (c.lista?.length) {
    let ly = Math.max(y + 90, 640);
    c.lista.slice(0, 5).forEach((e, i) => {
      ctx.fillStyle = '#f0abfc'; ctx.font = `700 64px ${titulo}`; ctx.fillText(String(i + 1), X, ly + 20);
      ctx.fillStyle = '#fff'; ctx.font = `600 44px ${texto}`; ctx.fillText(e.nome, X + 90, ly);
      ctx.fillStyle = 'rgba(255, 255, 255, .7)'; ctx.font = `400 34px ${texto}`; ctx.fillText(e.texto, X + 90, ly + 46);
      ctx.fillStyle = 'rgba(255, 255, 255, .1)'; ctx.beginPath(); ctx.roundRect(X + 90, ly + 66, W - X * 2 - 90, 10, 5); ctx.fill();
      ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(X + 90, ly + 66, Math.max(10, ((W - X * 2 - 90) * e.parte) / 100), 10, 5); ctx.fill();
      ly += 140;
    });
  }
  ctx.fillStyle = 'rgba(255, 255, 255, .5)'; ctx.font = `600 32px ${texto}`;
  ctx.fillText('Finanças', X, H - 80);
  return new Promise((ok, falha) => tela.toBlob((bl) => (bl ? ok(bl) : falha(new Error('sem imagem'))), 'image/png'));
}

/** Partilha a imagem (menu «Partilhar» do Android) ou, se não houver, guarda-a nas transferências. */
export async function partilharImagem(blob: Blob, nome: string): Promise<'partilhado' | 'guardado' | 'cancelado'> {
  const ficheiro = new File([blob], nome, { type: 'image/png' });
  if (navigator.canShare?.({ files: [ficheiro] })) {
    try { await navigator.share({ files: [ficheiro], title: 'Ano em revista' }); return 'partilhado'; } catch (e) { if ((e as Error).name === 'AbortError') return 'cancelado'; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'guardado';
}
