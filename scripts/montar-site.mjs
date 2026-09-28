// Monta o site publicado em _site/:
//   /      → app atual, ficheiros copiados sem qualquer alteração
//   /v2/   → versão de teste: cópia da app com dados isolados (prefixo financas-v2:),
//            service worker e cache próprios, bibliotecas locais e menu "V2 · teste"
// Uso: node scripts/montar-site.mjs
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSAO_V2 = '2.00.1';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(RAIZ, '_site');
const V2 = join(SITE, 'v2');

const versao = JSON.parse(readFileSync(join(RAIZ, 'version.json'), 'utf8'));
const ficheirosApp = [...new Set(['index.html', 'version.json', 'service-worker.js', ...versao.files])];
const extrasV2 = {
  'js/v2/prefixo.js': 'espelho-v2/prefixo.js',
  'js/v2/menu-v2.js': 'espelho-v2/menu-v2.js',
  'vendor/xlsx/xlsx.full.min.js': 'vendor/xlsx/xlsx.full.min.js',
  'vendor/pdfjs/pdf.min.mjs': 'vendor/pdfjs/pdf.min.mjs',
  'vendor/pdfjs/pdf.worker.min.mjs': 'vendor/pdfjs/pdf.worker.min.mjs',
};

function copiar(origem, destino) {
  if (!existsSync(origem)) throw new Error(`ficheiro em falta: ${origem}`);
  mkdirSync(dirname(destino), { recursive: true });
  cpSync(origem, destino);
}

// Substitui exatamente uma ocorrência; falha se houver zero ou mais de uma.
function trocar(ficheiro, de, para) {
  const caminho = join(V2, ficheiro);
  const texto = readFileSync(caminho, 'utf8');
  const n = texto.split(de).length - 1;
  if (n !== 1) throw new Error(`${ficheiro}: esperava 1 ocorrência de «${de.slice(0, 60)}», encontrei ${n}`);
  writeFileSync(caminho, texto.replace(de, () => para));
}

rmSync(SITE, { recursive: true, force: true });

for (const f of ficheirosApp) {
  copiar(join(RAIZ, f), join(SITE, f));
  copiar(join(RAIZ, f), join(V2, f));
}
for (const [destino, origem] of Object.entries(extrasV2)) copiar(join(RAIZ, origem), join(V2, destino));

// Dados isolados e menu (o prefixo tem de correr antes de qualquer outro script)
trocar('index.html', '  <script src="js/modulos/bloqueio.js"></script>',
  '  <script src="js/v2/prefixo.js"></script>\n  <script src="js/modulos/bloqueio.js"></script>');
trocar('index.html', '  <script src="js/modulos/atualizacoes.js"></script>',
  '  <script src="js/modulos/atualizacoes.js"></script>\n  <script src="js/v2/menu-v2.js"></script>');
trocar('index.html', '<title>Finanças</title>', '<title>Finanças V2</title>');
trocar('index.html', '<meta name="apple-mobile-web-app-title" content="Finanças">', '<meta name="apple-mobile-web-app-title" content="Finanças V2">');

// Instalação separada
const manifesto = JSON.parse(readFileSync(join(V2, 'manifest.webmanifest'), 'utf8'));
Object.assign(manifesto, { id: './', name: 'Finanças V2', short_name: 'Finanças V2' });
writeFileSync(join(V2, 'manifest.webmanifest'), JSON.stringify(manifesto, null, 2) + '\n');

// Service worker, cache e impressão digital próprios
trocar('service-worker.js', "const CACHE = 'financas-app';", "const CACHE = 'financas-v2';");
trocar('js/modulos/atualizacoes.js', "var CACHE='financas-app'", "var CACHE='financas-v2'");
trocar('js/modulos/bloqueio.js', "rp:{name:'Finanças'}", "rp:{name:'Finanças V2'}");
trocar('js/modulos/bloqueio.js', "displayName:'Finanças'", "displayName:'Finanças V2'");

// Bibliotecas locais (funcionam offline)
trocar('js/modulos/extratos.js', "'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'", "'vendor/xlsx/xlsx.full.min.js'");
trocar('js/app.js', 'import(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs`)', 'import(`../vendor/pdfjs/pdf.min.mjs`)');
trocar('js/app.js', '`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`', '`vendor/pdfjs/pdf.worker.min.mjs`');

// Versão
trocar('js/app.js', `ffVer=\`${versao.version}\``, `ffVer=\`${VERSAO_V2}\``);
writeFileSync(join(V2, 'version.json'),
  JSON.stringify({ version: VERSAO_V2, files: [...versao.files, ...Object.keys(extrasV2)].sort() }, null, 2) + '\n');

console.log(`Site montado em _site/ (raiz ${versao.version} · /v2/ ${VERSAO_V2})`);
