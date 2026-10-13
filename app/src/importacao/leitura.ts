// Leitura de extratos bancários (XLSX, XLS, CSV) — mesmas regras de js/modulos/extratos.js.

export interface LinhaExtrato { date: string; raw: string; amount: number }
export interface Extrato { bank: string; from: string; to: string; balance: number | null; lines: LinhaExtrato[] }

/** Texto sem acentos, em maiúsculas e com espaços simples (para comparar descrições). */
export const normalizar = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

/** Valores de extrato: "1.234,56", "-12,30 €", "1,234.56", número do Excel. */
export function numero(v: unknown): number {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').replace(/[€\s]|EUR/gi, '').replace(/−/g, '-');
  if (!s) return NaN;
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  else s = s.replace(/,/g, '');
  return parseFloat(s);
}

/** Data de extrato ("dd-mm-aaaa", "aaaa-mm-dd" ou número de série do Excel) → "aaaa-mm-dd". */
export function dataExtrato(v: unknown): string | null {
  if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${`0${m[2]}`.slice(-2)}-${`0${m[1]}`.slice(-2)}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// ---- XLSX sem dependências (ZIP + XML) ----
async function descomprimir(bytes: Uint8Array): Promise<Uint8Array> {
  const fluxo = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

async function abrirZip(buf: ArrayBuffer) {
  const v = new DataView(buf), u8 = new Uint8Array(buf);
  let fim = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { fim = i; break; }
  if (fim < 0) throw new Error('zip');
  const n = v.getUint16(fim + 10, true), td = new TextDecoder();
  let off = v.getUint32(fim + 16, true);
  const ficheiros: Record<string, { metodo: number; tamanho: number; local: number }> = {};
  for (let k = 0; k < n; k++) {
    const metodo = v.getUint16(off + 10, true), tamanho = v.getUint32(off + 20, true), fl = v.getUint16(off + 28, true), xl = v.getUint16(off + 30, true), cl = v.getUint16(off + 32, true);
    const local = v.getUint32(off + 42, true), nome = td.decode(u8.subarray(off + 46, off + 46 + fl));
    ficheiros[nome] = { metodo, tamanho, local };
    off += 46 + fl + xl + cl;
  }
  return {
    nomes: Object.keys(ficheiros),
    async ler(nome: string): Promise<string | null> {
      const f = ficheiros[nome];
      if (!f) return null;
      const fl = v.getUint16(f.local + 26, true), xl = v.getUint16(f.local + 28, true), inicio = f.local + 30 + fl + xl;
      const dados = u8.subarray(inicio, inicio + f.tamanho);
      return td.decode(f.metodo === 8 ? await descomprimir(dados) : dados);
    },
  };
}

function coluna(ref: string | null): number {
  const m = String(ref).match(/^[A-Z]+/);
  if (!m) return 0;
  let n = 0;
  for (const c of m[0]) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

export async function lerXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const z = await abrirZip(buf), P = new DOMParser(), partilhados: string[] = [];
  const x = await z.ler('xl/sharedStrings.xml');
  if (x) {
    const d = P.parseFromString(x, 'application/xml');
    for (const si of Array.from(d.getElementsByTagName('si'))) partilhados.push(Array.from(si.getElementsByTagName('t')).map((t) => t.textContent).join(''));
  }
  const folha = z.nomes.filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!folha) throw new Error('sheet');
  const d2 = P.parseFromString((await z.ler(folha))!, 'application/xml');
  return Array.from(d2.getElementsByTagName('row')).map((r) => {
    const linha: string[] = [];
    for (const c of Array.from(r.getElementsByTagName('c'))) {
      const t = c.getAttribute('t'), vv = c.getElementsByTagName('v')[0];
      let val = '';
      if (t === 's') val = partilhados[+(vv?.textContent ?? '')] || '';
      else if (t === 'inlineStr') val = c.getElementsByTagName('t')[0]?.textContent ?? '';
      else val = vv?.textContent ?? '';
      linha[coluna(c.getAttribute('r'))] = val;
    }
    return linha;
  });
}

/** SheetJS (cópia local em vendor/) para ficheiros XLS antigos. */
function carregarSheetJS(): Promise<{ read: (b: ArrayBuffer, o: object) => { SheetNames: string[]; Sheets: Record<string, unknown> }; utils: { sheet_to_json: (s: unknown, o: object) => string[][] } }> {
  const w = window as unknown as { XLSX?: never };
  if (w.XLSX) return Promise.resolve(w.XLSX);
  return new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = new URL('vendor/xlsx/xlsx.full.min.js', document.baseURI).href;
    s.onload = () => ok((window as unknown as { XLSX: never }).XLSX);
    s.onerror = falha;
    document.head.appendChild(s);
  });
}

export function lerCsv(texto: string): string[][] {
  const primeira = texto.split(/\r?\n/).find((l) => l.trim()) || '';
  const sep = primeira.split(';').length >= primeira.split(',').length ? ';' : ',';
  const linhas: string[][] = [];
  let linha: string[] = [], atual = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]!;
    if (aspas) {
      if (ch === '"') { if (texto[i + 1] === '"') { atual += '"'; i++; } else aspas = false; } else atual += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(atual); atual = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      linha.push(atual); linhas.push(linha); linha = []; atual = '';
    } else atual += ch;
  }
  if (atual || linha.length) { linha.push(atual); linhas.push(linha); }
  return linhas;
}

/** Algumas exportações põem a linha inteira numa só célula separada por ";". */
export function campos(linhas: unknown[][]): string[][] {
  const juntas = linhas.filter((r) => r?.[0] && String(r[0]).split(';').length >= 4).length >= 3;
  return linhas.map((r) => {
    const l = (r || []).map((c) => (c == null ? '' : String(c)));
    if (!juntas) return l;
    const cells = l.filter((c) => c !== '');
    return cells.length ? cells.join(',').split(';') : [];
  });
}

/** Encontra o cabeçalho e as linhas de movimentos; `null` se não parecer um extrato (menos de 3 movimentos). */
export function interpretar(F: string[][]): Extrato | null {
  let hi = -1;
  let ci = { d: -1, ds: -1, am: -1, db: -1, cr: -1, fee: -1, st: -1 };
  for (let i = 0; i < F.length && i < 60; i++) {
    const h = F[i]!.map(normalizar);
    let d = h.findIndex((x) => /^DATA MOV|^DATA LANC|COMPLETED DATE|^DATA$/.test(x));
    if (d < 0) d = h.findIndex((x) => /DATA|DATE/.test(x) && !/VALOR/.test(x));
    const ds = h.findIndex((x) => /DESCRI/.test(x));
    const am = h.findIndex((x) => /MONTANTE|^VALOR$|IMPORTANCIA|^AMOUNT$|^VALOR \(/.test(x) && !/SALDO|BALANCE/.test(x));
    const db = h.findIndex((x) => /DEBITO/.test(x)), cr = h.findIndex((x) => /CREDITO/.test(x));
    if (d >= 0 && ds >= 0 && (am >= 0 || (db >= 0 && cr >= 0))) {
      hi = i;
      ci = { d, ds, am, db, cr, fee: h.findIndex((x) => /^FEE$|COMISS/.test(x)), st: h.findIndex((x) => /^STATE$|^ESTADO$/.test(x)) };
      break;
    }
  }
  if (hi < 0) return null;
  const topo = F.slice(0, hi).map((r) => r.join(';')).join('\n'), tudo = normalizar(`${topo} ${F[hi]!.join(' ')}`);
  const lines: LinhaExtrato[] = [];
  for (let j = hi + 1; j < F.length; j++) {
    const r = F[j];
    if (!r || !r.length) continue;
    const dt = dataExtrato(r[ci.d]);
    if (!dt) continue;
    if (ci.st >= 0 && r[ci.st] && !/COMPLETED|CONCLU/.test(normalizar(r[ci.st]))) continue;
    let a = ci.am >= 0 ? numero(r[ci.am]) : (numero(r[ci.cr]) || 0) - Math.abs(numero(r[ci.db]) || 0);
    if (ci.fee >= 0 && numero(r[ci.fee])) a -= Math.abs(numero(r[ci.fee]));
    if (!Number.isFinite(a) || !a) continue;
    lines.push({ date: dt, raw: String(r[ci.ds] || '').trim(), amount: Math.round(a * 100) / 100 });
  }
  if (lines.length < 3) return null;
  // diferença intencional: aceita espaços antes do ";" (a app atual só lia o saldo sem eles)
  const bm = topo.match(/saldo contabil[ií]stico\s*;\s*([-\d.,]+)/i);
  const datas = lines.map((l) => l.date).sort();
  return {
    bank: /CONSULTAR SALDOS E MOVIMENTOS|CAIXA GERAL|\bCGD\b/.test(tudo) ? 'CGD' : /PRODUCT|REVOLUT/.test(tudo) ? 'Revolut' : 'banco',
    from: datas[0]!, to: datas[datas.length - 1]!, balance: bm ? numero(bm[1]) : null, lines,
  };
}

/** Lê um ficheiro de extrato; `null` se não for reconhecido. */
export async function lerFicheiro(f: File): Promise<Extrato | null> {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  let linhas: string[][];
  if (ext === 'csv' || ext === 'txt') linhas = lerCsv(await f.text());
  else {
    const buf = await f.arrayBuffer();
    try {
      if (ext !== 'xlsx') throw new Error('xls');
      linhas = await lerXlsx(buf);
    } catch {
      const X = await carregarSheetJS();
      const wb = X.read(buf, { type: 'array' });
      linhas = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!], { header: 1, raw: false });
    }
  }
  return interpretar(campos(linhas));
}
