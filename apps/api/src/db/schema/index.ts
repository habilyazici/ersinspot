/**
 * Veritabanı şemasının tek giriş noktası.
 *
 * Drizzle Kit migration üretirken bu dosyayı okur; buradan dışa aktarılmayan bir
 * tablo migration'a girmez. Yeni tablo eklendiğinde ilgili modül burada da
 * dışa aktarılmalıdır.
 */

export * from './enums.ts';
export * from './auth.ts';
export * from './catalog.ts';
export * from './orders.ts';
export * from './service-requests.ts';
export * from './content.ts';
export * from './relations.ts';
