// Monta o site publicado em _site/:
//   /           → app (código em app/, compilada pelo Vite), com as chaves reais financas-familiar:*
//   /v1/, /v2/  → versões retiradas (1.9.x e versão de teste): uma página e um service worker que apagam a
//                 respetiva cache (e, na /v2/, os dados de teste financas-v2:*), se desregistam e abrem a app
// Uso: node scripts/montar-site.mjs
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(RAIZ, 'app');
const SITE = join(RAIZ, '_site');
const { versao: VERSAO } = JSON.parse(readFileSync(join(APP, 'versao.json'), 'utf8'));

function copiar(origem, destino) {
  if (!existsSync(origem)) throw new Error(`ficheiro em falta: ${origem}`);
  mkdirSync(dirname(destino), { recursive: true });
  cpSync(origem, destino, { recursive: true });
}

function listar(pasta) {
  return readdirSync(pasta).flatMap((n) => {
    const c = join(pasta, n);
    return statSync(c).isDirectory() ? listar(c) : [c];
  });
}

rmSync(SITE, { recursive: true, force: true });

// App: build + ícones + bibliotecas locais (SheetJS para XLS, pdf.js para recibos) + manifesto + service worker
await build({ configFile: join(APP, 'vite.config.ts'), logLevel: 'warn' });
copiar(join(RAIZ, '_build', 'app'), SITE);
copiar(join(RAIZ, 'icons'), join(SITE, 'icons'));
copiar(join(RAIZ, 'vendor', 'xlsx'), join(SITE, 'vendor', 'xlsx'));
copiar(join(RAIZ, 'vendor', 'pdfjs'), join(SITE, 'vendor', 'pdfjs'));
copiar(join(APP, 'estatico', 'manifest.webmanifest'), join(SITE, 'manifest.webmanifest'));  // fora do alcance do Vite: o endereço e os caminhos dos ícones não mudam
copiar(join(APP, 'service-worker.js'), join(SITE, 'service-worker.js'));
const ficheiros = listar(SITE).map((c) => relative(SITE, c).split('\\').join('/'))
  .filter((f) => f !== 'service-worker.js' && f !== 'version.json' && !f.endsWith('LICENSE')).sort();
writeFileSync(join(SITE, 'version.json'), JSON.stringify({ version: VERSAO, files: ficheiros }, null, 2) + '\n');

// Versões retiradas
const retiradas = [
  { pasta: 'v1', cache: 'financas-v1', dados: '' },
  { pasta: 'v2', cache: 'financas-v2', dados: 'financas-v2:' },
];
for (const { pasta, cache, dados } of retiradas) {
  const limpar = dados
    ? `try { Object.keys(localStorage).filter((k) => k.startsWith('${dados}')).forEach((k) => localStorage.removeItem(k)); } catch { /* sem armazenamento */ }`
    : '';
  const preencher = (t) => t.replaceAll('{{CACHE}}', cache).replace('{{LIMPAR_DADOS}}', limpar)
    .replace('{{DADOS_COMENTARIO}}', dados ? `, os dados de teste (${dados}*)` : '');
  mkdirSync(join(SITE, pasta), { recursive: true });
  for (const f of ['index.html', 'service-worker.js']) {
    writeFileSync(join(SITE, pasta, f), preencher(readFileSync(join(APP, 'retirado', f), 'utf8')));
  }
}

console.log(`Site montado em _site/ (app ${VERSAO}, ${ficheiros.length} ficheiros · /v1/ e /v2/ retiradas)`);
