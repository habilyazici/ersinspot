/**
 * Yeniden kullanılan sütun tanımları.
 *
 * Modüler monolitte her modül kendi tablolarına sahiptir; ortak bir "adresler"
 * tablosu paylaşmak, sahipliği belirsizleştirir ve modüller arasında bağımlılık
 * merkezi yaratır. Bunun yerine her modül kendi adres tablosunu tanımlar, sütun
 * şekli ise buradan gelir.
 *
 * Sonuç: tablolar ayrı ve sahipleri net, sütun tanımı tek yerde.
 */

import { text } from 'drizzle-orm/pg-core';
import { izmirDistrictEnum } from './enums.ts';

/**
 * Adres sütunları.
 *
 * Adres bilgisi `jsonb` yerine ayrı sütunlarda tutulur. Nedeni pratiktir:
 * bu alanlar gerçekten sorgulanır — "Bornova'ya kaç sipariş gitti", "hangi
 * ilçelerde yoğunuz", "bu mahallede bekleyen kaç talep var". `jsonb` içinde
 * bunlar indekslenemez, kısıt uygulanamaz ve ilçe adı serbest metin olarak
 * kalır ("Buca" ile "buca" farklı sayılır).
 *
 * İlçe, veritabanı numaralandırması olarak tanımlıdır: hizmet verilmeyen veya
 * var olmayan bir ilçe adı yazılamaz.
 */
export const addressColumns = {
  district: izmirDistrictEnum().notNull(),
  neighborhood: text().notNull(),
  street: text().notNull(),
  buildingNo: text().notNull(),
  apartmentNo: text(),
  /** Kurye için ek tarif: "market karşısı, yeşil kapı". */
  directions: text(),
} as const;
