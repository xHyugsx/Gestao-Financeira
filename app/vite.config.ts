import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// A app nova é compilada para a versão de teste /v2/ (scripts/montar-site.mjs trata do resto).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../_build/v2', import.meta.url)),
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
});
