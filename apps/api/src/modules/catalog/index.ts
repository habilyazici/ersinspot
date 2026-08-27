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

import {
  getPurchasableProducts,
  markProductsAsSold,
  releaseExpiredReservations,
  releaseProducts,
  reserveProducts,
} from './application/inventory-service.ts';
import { getCategoryById } from './application/category-service.ts';
import { createProductFromSellRequest } from './application/product-writer.ts';

/**
 * Diğer modüllerin kullandığı işlemler.
 *
 * Tek nesne olarak dışa aktarılır: çağrı yerinde `catalog.reserveProducts(...)`
 * biçiminde görünür ve hangi modülün sorumluluğunda olduğu okunurken belli olur.
 */
export const catalog = {
  // ordering: sipariş oluştururken fiyat ve uygunluk sorar, envanteri günceller
  getPurchasableProducts,
  reserveProducts,
  releaseProducts,
  markProductsAsSold,

  // servicing: satış talebini katalog kaydına dönüştürür, kategori bilgisi alır
  createProductFromSellRequest,
  getCategoryById,
} as const;

export type { PurchasableProduct } from './application/inventory-service.ts';

// Bakım görevi: süresi geçmiş rezervasyonları serbest bırakır.
export { releaseExpiredReservations };
