/**
 * catalog modülü — genel sözleşme.
 *
 * Sahip olduğu tablolar:
 *   categories, brands, products, product_images, product_specs
 *
 * Kritik sorumluluk: ürün fiyatı ve satılabilirlik durumu YALNIZCA bu modülden
 * öğrenilir. `ordering` modülü `products` tablosunu okuyamaz; sipariş tutarının
 * istemciden gelen fiyatla hesaplanması bu sınırla yapısal olarak engellenir.
 *
 * Planlanan sözleşme:
 *   getPurchasableProducts(ids)  — fiyat ve uygunluk; sipariş oluşturmada kullanılır
 *   reserveProducts(ids, tx)     — sipariş verilince rezerve eder
 *   releaseProducts(ids, tx)     — sipariş iptalinde serbest bırakır
 *   markAsSold(ids, tx)          — teslimatta satıldı işaretler
 *   createFromSellRequest(input) — kabul edilen satış talebini ürüne çevirir
 */

export {};
