// vite.config.ts
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  // Для Mini App удобнее, чтобы фронт жил в корне домена.
  base: '/',

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
      },
    },
  },

  plugins: [
    react(),
    tsconfigPaths(),
    // HTTPS для локальной разработки (если захочешь использовать напрямую).
    process.env.HTTPS && mkcert(),
  ],

  build: {
    target: 'esnext',
    minify: 'terser',
  },

  publicDir: './public',

  server: {
    // Делаем dev-сервер доступным снаружи
    host: true,
    port: 5173,

    // Разрешаем любые ngrok-домены вида *.ngrok-free.app
    allowedHosts: ['.share.zrok.io'],

    // Прокси: все запросы к /api → на Django (localhost:8000)
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:8000/',
        changeOrigin: true,
      },
    },
  },
});