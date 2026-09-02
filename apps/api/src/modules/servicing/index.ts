/**
 * servicing modülü — genel sözleşme.
 *
 * Üç hizmet türünü tek yaşam döngüsü altında toplar: nakliye, teknik servis,
 * ürün satış talebi.
 *
 * Sahip olduğu tablolar:
 *   service_requests, request_addresses, request_photos, request_quotes,
 *   request_appointments, request_events, moving_request_details,
 *   moving_request_items, technical_service_details, sell_request_details
 *
 * Bağımlılıkları: identity (kullanıcı), catalog (satış talebi → ürün dönüşümü)
 */

export { servicingRoutes } from './api/routes.ts';
