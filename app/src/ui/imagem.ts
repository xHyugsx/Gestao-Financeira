// Reduz fotografias antes de as guardar: o localStorage do navegador e da APK tem ~5 MB para todos os dados.

/** Lado maior (px) e qualidade JPEG para cada uso. */
export const TAMANHOS = { animal: [640, 0.82], bloqueio: [1600, 0.85] } as const;

/** Dimensões finais mantendo a proporção, sem aumentar. */
export function medidas(largura: number, altura: number, maximo: number): [number, number] {
  const f = Math.min(1, maximo / Math.max(largura, altura));
  return [Math.max(1, Math.round(largura * f)), Math.max(1, Math.round(altura * f))];
}

function carregar(origem: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('imagem')); i.src = origem; });
}

/** Ficheiro ou data URL → data URL JPEG reduzido. Se não der (ex.: formato que o telemóvel não lê), devolve o original. */
export async function reduzirImagem(origem: File | string, [maximo, qualidade]: readonly [number, number]): Promise<string> {
  const url = typeof origem === 'string' ? origem : URL.createObjectURL(origem);
  try {
    const img = await carregar(url);
    const [l, a] = medidas(img.naturalWidth, img.naturalHeight, maximo);
    const tela = document.createElement('canvas');
    tela.width = l; tela.height = a;
    const ctx = tela.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(img, 0, 0, l, a);
    return tela.toDataURL('image/jpeg', qualidade);
  } finally { if (typeof origem !== 'string') URL.revokeObjectURL(url); }
}

/** Fotografias grandes de versões anteriores (guardadas sem reduzir) a voltar a gravar mais pequenas. */
export const eGrande = (dataUrl: unknown, limite = 300_000) => typeof dataUrl === 'string' && dataUrl.startsWith('data:image') && dataUrl.length > limite;
