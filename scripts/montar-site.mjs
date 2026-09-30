// Monta o site publicado em _site/:
//   /      → app (código em app/, compilada pelo Vite em modo «raiz»), com as chaves reais financas-familiar:*
//   /v1/   → app anterior (1.9.x, ficheiros da raiz do repositório), para recuo; mesmos dados, cache própria
//   /v2/   → versão de teste (modo «v2»), com dados isolados (financas-v2:*), service worker, cache e manifesto próprios
// Uso: node scripts/montar-site.mjs
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(RAIZ, '_site');
const V1 = join(SITE, 'v1');
const V2 = join(SITE, 'v2');

const antiga = JSON.parse(readFileSync(join(RAIZ, 'version.json'), 'utf8'));
const { versao: VERSAO } = JSON.parse(readFileSync(join(RAIZ, 'app', 'versao.json'), 'utf8'));
const ficheirosAntiga = [...new Set(['index.html', 'version.json', 'service-worker.js', ...antiga.files])];
const manifesto = JSON.parse(readFileSync(join(RAIZ, 'manifest.webmanifest'), 'utf8'));

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

// Substitui exatamente uma ocorrência; falha se houver zero ou mais de uma.
function trocar(caminho, de, para) {
  const texto = readFileSync(caminho, 'utf8');
  const n = texto.split(de).length - 1;
  if (n !== 1) throw new Error(`${relative(RAIZ, caminho)}: esperava 1 ocorrência de «${de.slice(0, 60)}», encontrei ${n}`);
  writeFileSync(caminho, texto.replace(de, () => para));
}

/** Compila a app, junta ícones, bibliotecas locais, manifesto e service worker, e gera o version.json. */
async function app(modo, destino, { cache, nome, id }) {
  await build({ configFile: join(RAIZ, 'app', 'vite.config.ts'), mode: modo, logLevel: 'warn' });
  copiar(join(RAIZ, '_build', modo), destino);
  copiar(join(RAIZ, 'icons'), join(destino, 'icons'));
  // SheetJS (extratos XLS) e pdf.js (recibos PDF): cópias locais, guardadas offline como o resto da app
  copiar(join(RAIZ, 'vendor', 'xlsx'), join(destino, 'vendor', 'xlsx'));
  copiar(join(RAIZ, 'vendor', 'pdfjs'), join(destino, 'vendor', 'pdfjs'));
  const m = { ...manifesto, ...(nome ? { name: nome, short_name: nome } : {}), ...(id ? { id } : {}) };
  writeFileSync(join(destino, 'manifest.webmanifest'), JSON.stringify(m, null, 2) + '\n');
  copiar(join(RAIZ, 'app', 'service-worker.js'), join(destino, 'service-worker.js'));
  if (cache !== 'financas-v2') trocar(join(destino, 'service-worker.js'), "const CACHE = 'financas-v2';", `const CACHE = '${cache}';`);
  const ficheiros = listar(destino).filter((c) => destino !== SITE || (!c.startsWith(V1 + '/') && !c.startsWith(V2 + '/')))
    .map((c) => relative(destino, c).split('\\').join('/'))
    .filter((f) => f !== 'service-worker.js' && f !== 'version.json' && !f.endsWith('LICENSE')).sort();
  writeFileSync(join(destino, 'version.json'), JSON.stringify({ version: VERSAO, files: ficheiros }, null, 2) + '\n');
  return ficheiros.length;
}

rmSync(SITE, { recursive: true, force: true });

// Raiz: app de produção (manifesto igual ao da app anterior, para o telemóvel a tratar como a mesma app instalada)
const nRaiz = await app('raiz', SITE, { cache: 'financas-app' });

// /v1/: app anterior, sem alterações exceto o nome da cache (a da raiz é da app nova) e o nome no manifesto
for (const f of ficheirosAntiga) copiar(join(RAIZ, f), join(V1, f));
trocar(join(V1, 'service-worker.js'), "const CACHE = 'financas-app';", "const CACHE = 'financas-v1';");
trocar(join(V1, 'js', 'modulos', 'atualizacoes.js'), "var CACHE='financas-app'", "var CACHE='financas-v1'");
writeFileSync(join(V1, 'manifest.webmanifest'), JSON.stringify({ ...manifesto, id: './', name: `Finanças ${antiga.version}`, short_name: `Finanças ${antiga.version}` }, null, 2) + '\n');

// /v2/: versão de teste
const nV2 = await app('v2', V2, { cache: 'financas-v2', nome: 'Finanças V2', id: './' });

console.log(`Site montado em _site/ (raiz ${VERSAO}, ${nRaiz} ficheiros · /v1/ ${antiga.version} · /v2/ ${VERSAO}, ${nV2} ficheiros)`);
