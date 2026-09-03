/**
 * ordering modülü — genel sözleşme.
 *
 * Sahip olduğu tablolar:
 *   cart_items, favorites, orders, order_addresses, order_items,
 *   order_events
 *
 * Bağımlılıkları: catalog (ürün fiyatı ve rezervasyon), identity (kullanıcı)
 *
 * Bu modül `products` tablosuna ERİŞEMEZ. Fiyat ve satılabilirlik bilgisini
 * `catalog` sözleşmesinden ister; bu sınır, sipariş tutarının istemciden gelen
 * fiyatla hesaplanmasını yapısal olarak engeller.
 */

export { orderingRoutes } from './api/routes.ts';

/** Bakım görevi: ödemesi gelmeyen siparişleri iptal eder ve ürünleri serbest bırakır. */
export { cancelExpiredUnpaidOrders } from './application/order-service.ts';
