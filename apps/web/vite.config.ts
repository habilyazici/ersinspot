import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },

  /*
   * Bağımlılık ön-paketleme hedefi.
   *
   * Geliştirme sunucusu bağımlılıkları ayrıca paketler ve varsayılan hedefi
   * derleme hedefinden farklıdır. Hizalanmazsa modern söz dizimi kullanan
   * paketler geliştirmede çözümlenemez — üretim derlemesi çalışsa bile.
   */
  optimizeDeps: {
    esbuildOptions: { target: 'es2022' },
  },

  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        /*
         * Satıcı kodunu ayır.
         *
         * Eski derleme 2,2 MB'lık tek parça üretiyordu: anasayfayı açan
         * kullanıcı admin panelinin tamamını da indiriyordu. Rota bazlı bölme
         * React.lazy ile ayrıca yapılıyor.
         */
        manualChunks: {
          /*
           * Yalnızca doğrudan bağımlılıklar listelenir. `react-router`,
           * `react-router-dom` üzerinden gelen dolaylı bir bağımlılıktır;
           * pnpm'in katı node_modules düzeninde apps/web içinden çözümlenemez
           * ve Rollup "Could not resolve entry module" hatası verir. Rollup
           * onu zaten yalnızca react-router-dom'dan erişilebildiği için aynı
           * parçaya yerleştirir.
           */
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },

  server: {
    port: 3001,
    proxy: {
      // Geliştirmede API'yi aynı kaynaktan sun: çerezler sorunsuz çalışır.
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/files': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
