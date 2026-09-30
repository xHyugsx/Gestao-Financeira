import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dois alvos (scripts/montar-site.mjs trata do resto):
//   --mode raiz → app de produção na raiz do site, com as chaves reais
//   --mode v2   → versão de teste /v2/, com os dados isolados (financas-v2:*) e o menu «V2 · teste»
export default defineConfig(({ mode }) => {
  const raiz = mode === 'raiz';
  return {
    root: fileURLToPath(new URL('.', import.meta.url)),
    base: './',
    publicDir: false,
    plugins: [react(), {
      name: 'alvo',
      transformIndexHtml: {
        order: 'pre',
        handler: (html: string) => (raiz ? html.replace(/Finanças V2/g, 'Finanças') : html.replace('./src/main.tsx', './src/main-v2.tsx')),
      },
    }],
    build: {
      outDir: fileURLToPath(new URL(`../_build/${raiz ? 'raiz' : 'v2'}`, import.meta.url)),
      emptyOutDir: true,
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          entryFileNames: 'js/app.js',
          chunkFileNames: 'js/[name]-[hash].js',
          assetFileNames: (a) => (a.names?.[0]?.endsWith('.css') ? 'css/app.css' : 'assets/[name]-[hash][extname]'),
        },
      },
    },
  };
});
