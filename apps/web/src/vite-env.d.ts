/// <reference types="vite/client" />

/**
 * Ortam değişkenlerinin tipleri.
 *
 * `import.meta.env` varsayılan olarak `any` içerir; bildirimsiz kullanım tip
 * güvenliğini sessizce kaybettirir. Kullanılan her değişken burada tanımlanır.
 */
interface ImportMetaEnv {
  /** API taban adresi. Boşsa aynı kaynaktan sunulur (Vite vekili). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
