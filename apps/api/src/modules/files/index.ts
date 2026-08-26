/**
 * files modülü — genel sözleşme.
 *
 * Sahip olduğu tablolar:
 *   uploaded_files
 *
 * Yükleme, depolama soyutlaması ve yetim dosya temizliği. Depolama sürücüsünün
 * kendisi altyapıdadır (`platform/storage.ts`); bu modül kayıtların ve yükleme
 * politikasının sahibidir.
 */

export { filesRoutes } from './api/routes.ts';

/**
 * Yerel sürücüde saklanan dosyaları sunan rotalar.
 *
 * Yalnızca `STORAGE_DRIVER=local` iken bağlanır; üretimde dosyalar CDN'den
 * sunulur.
 */
export { localFileRoutes } from './api/routes.ts';

/** Dosyaları bir kayda bağlar; yetim olmaktan çıkarır. */
export { attachFiles } from './application/upload-service.ts';

/** Depolama anahtarından görüntüleme adresi üretir. */
export { resolveUrl } from './application/upload-service.ts';

/** Bakım görevi: bir kayda bağlanmamış eski yüklemeleri siler. */
export { cleanupOrphanedFiles } from './application/upload-service.ts';
