import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    cors: true
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000
  }
});
