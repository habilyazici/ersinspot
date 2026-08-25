/**
 * ordering modülü — genel sözleşme.
 *
 * Sahip olduğu tablolar:
 *   cart_items, favorites, orders, order_items, order_events
 *
 * Bağımlılıkları: catalog (ürün fiyatı ve rezervasyon), identity (kullanıcı)
 *
 * Planlanan sözleşme:
 *   getOrderCountForUser(userId)   — müşteri panelindeki özet sayaç
 *   hasPurchasedProduct(userId, productId) — yorum yetkisi kontrolü
 */

export {};
