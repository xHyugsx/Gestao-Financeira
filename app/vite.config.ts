import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Compila a app para _build/app (scripts/montar-site.mjs trata do resto).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../_build/app', import.meta.url)),
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
