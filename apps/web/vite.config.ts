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

    /*
      Kaynak haritaları ÜRETİME ÇIKMAZ.

      `true` iken derleme, yorumlar dahil tüm TypeScript kaynağını
      `sourcesContent` içinde taşıyan 75 harita dosyası üretiyor ve bunlar
      `dist/` ile birlikte sunuluyordu. Küçültülmüş kod zaten istemciye
      gidiyor; harita onu okunur yapmakla kalmıyor, savunmaların gerekçesini de
      veriyor.

      Somut örneği bot tuzağı: `honeypot-field.tsx` kaynağı, alanın nasıl
      gizlendiğini ve sunucunun tuzağa düşen isteğe SESSİZCE başarılı yanıt
      verdiğini anlatan yorumla birlikte pakette duruyordu. Tuzağın tek değeri
      bilinmemesidir; onu okuyan bir araç hem alanı boş bırakır hem 201
      yanıtına güvenmemesi gerektiğini öğrenir. Hız sınırı eşikleri, CSRF
      koşulları ve müşteriden gizlenen alanlar da aynı şekilde açıktaydı.

      Hata toplama servisi eklendiğinde `'hidden'` yapılmalı: haritalar üretilir
      ama pakette bir `sourceMappingURL` bırakılmaz; dağıtım adımı onları
      servise yükleyip yayımlanan dizinden siler.
    */
    sourcemap: false,
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
