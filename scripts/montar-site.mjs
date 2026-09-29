// Monta o site publicado em _site/:
//   /      → app atual, ficheiros copiados sem qualquer alteração
//   /v2/   → app nova em construção (app/, compilada pelo Vite), com dados isolados (financas-v2:),
//            service worker, cache e manifesto próprios
// Uso: node scripts/montar-site.mjs
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(RAIZ, '_site');
const V2 = join(SITE, 'v2');
const COMPILADO = join(RAIZ, '_build', 'v2');

const versao = JSON.parse(readFileSync(join(RAIZ, 'version.json'), 'utf8'));
const { versao: VERSAO_V2 } = JSON.parse(readFileSync(join(RAIZ, 'app', 'versao.json'), 'utf8'));
const ficheirosApp = [...new Set(['index.html', 'version.json', 'service-worker.js', ...versao.files])];

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

rmSync(SITE, { recursive: true, force: true });

// Raiz: app atual, sem alterações
for (const f of ficheirosApp) copiar(join(RAIZ, f), join(SITE, f));

// /v2/: app nova
await build({ configFile: join(RAIZ, 'app', 'vite.config.ts'), logLevel: 'warn' });
copiar(COMPILADO, V2);
copiar(join(RAIZ, 'icons'), join(V2, 'icons'));

const manifesto = JSON.parse(readFileSync(join(RAIZ, 'manifest.webmanifest'), 'utf8'));
Object.assign(manifesto, { id: './', name: 'Finanças V2', short_name: 'Finanças V2' });
writeFileSync(join(V2, 'manifest.webmanifest'), JSON.stringify(manifesto, null, 2) + '\n');

copiar(join(RAIZ, 'service-worker.js'), join(V2, 'service-worker.js'));
trocar(join(V2, 'service-worker.js'), "const CACHE = 'financas-app';", "const CACHE = 'financas-v2';");

const ficheirosV2 = listar(V2).map((c) => relative(V2, c).split('\\').join('/'))
  .filter((f) => f !== 'service-worker.js' && f !== 'version.json').sort();
writeFileSync(join(V2, 'version.json'), JSON.stringify({ version: VERSAO_V2, files: ficheirosV2 }, null, 2) + '\n');

console.log(`Site montado em _site/ (raiz ${versao.version} · /v2/ ${VERSAO_V2}, ${ficheirosV2.length} ficheiros)`);
