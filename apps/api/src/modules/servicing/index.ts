/**
 * servicing modülü — genel sözleşme.
 *
 * Üç hizmet türünü tek yaşam döngüsü altında toplar: nakliye, teknik servis,
 * ürün satış talebi. Eski kod tabanında bu üçü birbirinden bağımsız yazılmış,
 * durum listeleri ayrışmış ve aynı veri hem Postgres'te hem KV store'da
 * tutulmuştu.
 *
 * Sahip olduğu tablolar:
 *   service_requests, moving_request_details, moving_request_items,
 *   technical_service_details, sell_request_details,
 *   request_photos, request_quotes, request_appointments, request_events
 *
 * Bağımlılıkları: identity (kullanıcı), catalog (satış talebi → ürün dönüşümü),
 * files (talep fotoğrafları)
 *
 * Planlanan sözleşme:
 *   getRequestCountsForUser(userId) — müşteri panelindeki özet sayaçlar
 */

export {};
