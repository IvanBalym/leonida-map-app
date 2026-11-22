import { defineConfig } from 'vite';

// base './' makes the build work from any sub-path (GitHub Pages /repo/, Cloudflare root, Telegram).
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: { target: 'es2020', sourcemap: false, assetsInlineLimit: 0 },
});
