import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Настройка сборщика Vite.
 * Обращения к /api переадресуются на сервер NestJS, что позволяет
 * вести разработку клиента и сервера на разных портах без ограничений
 * политики одинакового источника (CORS).
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
