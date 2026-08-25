/**
 * Sepet, favoriler ve sipariş tabloları.
 *
 * Tasarım kararları:
 *
 * 1. Sepet veritabanında tutulur, tarayıcıda değil. Eski kodda sepet hem
 *    `localStorage`'da hem sunucuda tutuluyordu ve ikisi ayrışabiliyordu.
 *
 * 2. Sipariş kalemleri, ürün bilgisinin sipariş anındaki kopyasını (`*Snapshot`)
 *    saklar. Ürün sonradan silinse veya fiyatı değişse bile geçmiş sipariş
 *    olduğu gibi kalır — muhasebe ve müşteri güveni için zorunlu.
 *
 * 3. Teslimat adresi ayrı bir tabloda ve gerçek sütunlarda tutulur (bkz.
 *    `orderAddresses`). Adres, siparişin o anki fotoğrafıdır; kullanıcı adres
 *    defterindeki kaydı sonradan değiştirse bile sipariş etkilenmez.
 */

import { sql } from 'drizzle-orm';
import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../../identity/infrastructure/schema.ts';
import { addressColumns } from '../../../platform/db/columns.ts';
import { products } from '../../catalog/infrastructure/schema.ts';
import {
  actorEnum,
  deliveryMethodEnum,
  orderStatusEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  productConditionEnum,
} from '../../../platform/db/enums.ts';

// ---------------------------------------------------------------------------
// Sepet ve favoriler
// ---------------------------------------------------------------------------

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid().primaryKey().defaultRandom(),

    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    quantity: integer().notNull().default(1),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Aynı ürün sepette iki satır olarak duramaz; adet artırılır.
    uniqueIndex('cart_items_user_product_unique').on(table.userId, table.productId),
    index('cart_items_user_id_idx').on(table.userId),
  ],
);

export const favorites = pgTable(
  'favorites',
  {
    id: uuid().primaryKey().defaultRandom(),

    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('favorites_user_product_unique').on(table.userId, table.productId),
    index('favorites_user_id_idx').on(table.userId),
    index('favorites_product_id_idx').on(table.productId),
  ],
);

// ---------------------------------------------------------------------------
// Siparişler
// ---------------------------------------------------------------------------

/**
 * Sipariş numarası dizisi. Veritabanı seviyesinde tutulur ki eşzamanlı iki
 * sipariş aynı numarayı alamasın. Eski kodda numara `Date.now()` ile üretiliyordu;
 * aynı milisaniyede gelen iki sipariş çakışabilirdi.
 */
export const orderNumberSequence = sql`order_number_seq`;

export const orders = pgTable(
  'orders',
  {
    id: uuid().primaryKey().defaultRandom(),

    /** Müşteriye gösterilen takip numarası: "SIP-2026-000123". */
    referenceNumber: text().notNull(),

    /**
     * Siparişi veren kullanıcı. Hesap silinse bile sipariş kaydı korunur;
     * bu yüzden `set null` kullanılır ve iletişim bilgileri satıra kopyalanır.
     */
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),

    status: orderStatusEnum().notNull(),

    /** Teslimatta aranacak kişi. Hesap sahibinden farklı olabilir. */
    contactName: text().notNull(),
    contactPhone: text().notNull(),

    deliveryMethod: deliveryMethodEnum().notNull(),

    /**
     * Teslimat günü ve saat aralığı.
     *
     * Saat aralığı metin yerine iki `time` sütununda tutulur: metin olarak
     * ("09:00-11:00") saklandığında aralıklar karşılaştırılamaz, sıralanamaz ve
     * "bugün 14:00'te kaç teslimat var" sorgusu yazılamaz.
     */
    deliveryDate: date(),
    deliveryStartTime: time(),
    deliveryEndTime: time(),

    paymentMethod: paymentMethodEnum().notNull(),

    /** Tüm tutarlar kuruş cinsinden. Sunucuda hesaplanır, istemciden alınmaz. */
    subtotalKurus: bigint({ mode: 'number' }).notNull(),
    deliveryFeeKurus: bigint({ mode: 'number' }).notNull(),
    totalKurus: bigint({ mode: 'number' }).notNull(),

    /** Müşterinin sipariş notu. */
    note: text(),

    /** Yalnızca personelin gördüğü not. Müşteri yanıtlarında asla yer almaz. */
    staffNote: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('orders_reference_number_unique').on(table.referenceNumber),
    index('orders_user_created_idx').on(table.userId, table.createdAt),
    index('orders_status_created_idx').on(table.status, table.createdAt),
    index('orders_delivery_date_idx').on(table.deliveryDate),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid().primaryKey().defaultRandom(),

    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),

    /** Ürün silinirse null olur; sipariş kaleminin kendisi kopya bilgiyle ayakta kalır. */
    productId: uuid().references(() => products.id, { onDelete: 'set null' }),

    /*
     * Sipariş anındaki ürün bilgisinin kopyası.
     *
     * Görsel, URL olarak değil depolama anahtarı olarak saklanır: URL
     * yapılandırmadan türetilir ve depolama sunucusu değiştiğinde geçmiş
     * siparişlerin görselleri kırılırdı.
     */
    titleSnapshot: text().notNull(),
    imageStorageKeySnapshot: text(),
    conditionSnapshot: productConditionEnum().notNull(),

    /** Sipariş anındaki birim fiyat. Ürün fiyatı sonradan değişse bile sabit kalır. */
    unitPriceKurus: bigint({ mode: 'number' }).notNull(),
    quantity: integer().notNull(),
    lineTotalKurus: bigint({ mode: 'number' }).notNull(),
  },
  (table) => [index('order_items_order_id_idx').on(table.orderId)],
);

/**
 * Sipariş durum geçmişi.
 *
 * Her durum değişikliği bir satır olarak eklenir; müşteri sipariş takip ekranında
 * bu zaman çizelgesini görür. Kayıtlar hiçbir zaman güncellenmez veya silinmez.
 */
export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid().primaryKey().defaultRandom(),

    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),

    status: orderStatusEnum().notNull(),
    note: text(),

    actor: actorEnum().notNull(),
    /** İşlemi yapan personel. Sistem olaylarında ve müşteri işlemlerinde null. */
    actorUserId: uuid().references(() => users.id, { onDelete: 'set null' }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('order_events_order_created_idx').on(table.orderId, table.createdAt)],
);

/**
 * Siparişin teslimat adresi.
 *
 * Ayrı tabloda ve değişmezdir: sipariş anındaki adresin fotoğrafıdır. Müşteri
 * adres defterindeki kaydı sonradan düzenlese veya silse bile siparişin adresi
 * olduğu gibi kalır.
 *
 * `jsonb` yerine gerçek sütunlar kullanılır. Adres alanları sorgulanır —
 * "Bornova'ya kaç sipariş gitti", "hangi mahallede yoğunuz" — ve `jsonb`
 * içinde bunlar indekslenemez, ilçe kısıtı uygulanamaz.
 *
 * Mağazadan teslim alınan siparişlerde satır oluşturulmaz.
 */
export const orderAddresses = pgTable(
  'order_addresses',
  {
    /** Sipariş başına en fazla bir adres: birincil anahtar aynı zamanda yabancı anahtardır. */
    orderId: uuid()
      .primaryKey()
      .references(() => orders.id, { onDelete: 'cascade' }),

    ...addressColumns,

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Bölge bazlı raporlama ve teslimat planlaması için.
    index('order_addresses_district_idx').on(table.district),
  ],
);

/**
 * Ödeme kayıtları.
 *
 * `orders.payment_method` ödemenin NASIL yapılacağını söyler; bu tablo
 * ödemenin GERÇEKLEŞTİĞİNİ kaydeder. İkisi farklı sorulardır ve eski tasarımda
 * ikincisinin cevabı hiçbir yerde tutulmuyordu.
 *
 * Havale/EFT'de personel, bankaya gelen parayı siparişle elle eşleştirir;
 * `reference` alanı havale açıklamasını taşır ve eşleştirmenin izini bırakır.
 * Kapıda ödemede tahsilat teslimatta yapılır ve teslim eden kişi kaydeder.
 *
 * Bir siparişin birden çok ödeme kaydı olabilir: kısmi ödeme, iade veya
 * başarısız denemenin ardından ikinci deneme.
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid().primaryKey().defaultRandom(),

    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),

    method: paymentMethodEnum().notNull(),
    status: paymentStatusEnum().notNull().default('pending'),

    /** Kuruş cinsinden. İade kayıtlarında negatif olabilir. */
    amountKurus: bigint({ mode: 'number' }).notNull(),

    /**
     * Havale açıklaması veya dekont numarası. Personelin gelen parayı
     * siparişle eşleştirirken girdiği referans.
     */
    reference: text(),

    /** Ödemenin onaylandığı an. Onaylanmamış kayıtlarda null. */
    confirmedAt: timestamp({ withTimezone: true }),

    /** Ödemeyi kaydeden personel. Denetim izi. */
    recordedByUserId: uuid().references(() => users.id, { onDelete: 'set null' }),

    note: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('payments_order_idx').on(table.orderId),
    // Muhasebe ekranı: belirli bir tarihteki onaylanmış tahsilatlar.
    index('payments_status_confirmed_idx').on(table.status, table.confirmedAt),
  ],
);
