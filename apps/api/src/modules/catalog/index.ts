/**
 * catalog modülü — genel sözleşme.
 *
 * Bu dosya, diğer modüllerin `catalog` hakkında görebildiği TEK yüzeydir.
 * Tablolar, repository'ler ve iç yardımcılar bilinçli olarak dışa aktarılmaz.
 *
 * Sahip olduğu tablolar:
 *   categories, brands, products, product_images, product_specs
 *
 * KRİTİK SORUMLULUK: ürün fiyatı ve satılabilirlik durumu yalnızca bu modülden
 * öğrenilir. `ordering` modülü `products` tablosunu okuyamaz — sipariş tutarının
 * istemciden gelen fiyatla hesaplanması bu sınırla yapısal olarak engellenir.
 * Eski kod tabanında bu sınır olmadığı için herhangi bir ürün 1 TL'ye sipariş
 * edilebiliyordu.
 */

// HTTP yönlendiricisi — app.ts tarafından bağlanır.
export { catalogRoutes } from './api/routes.ts';

// Diğer modüllerin kullandığı işlemler.
export {
  getPurchasableProducts,
  reserveProducts,
  releaseProducts,
  markProductsAsSold,
} from './application/inventory-service.ts';

export type { PurchasableProduct } from './application/inventory-service.ts';

// Bakım görevi: süresi geçmiş rezervasyonları serbest bırakır.
export { releaseExpiredReservations } from './application/inventory-service.ts';
