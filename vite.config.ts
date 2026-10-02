import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const backend = 'http://127.0.0.1:17877';
export default defineConfig({
  root: 'web/admin',
  base: './',
  plugins: [react()],
  publicDir: 'public',
  build: { rollupOptions: { input: resolve('web/admin/index.html') }, outDir: 'dist', emptyOutDir: true, target: 'es2022' },
  resolve: { alias: { '@': resolve('web/admin/src'), '/shared': resolve('web/shared') } },
  server: {
    host: '127.0.0.1', port: 17878, strictPort: true,
    proxy: Object.fromEntries(['/api', '/ws', '/oauth', '/overlay', '/dock', '/shared', '/health'].map(path => [path, { target: backend, ws: path === '/ws' }])),
  },
});
