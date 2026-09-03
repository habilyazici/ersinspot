/**
 * Hizmet talebi tabloları: nakliye, teknik servis ve ürün satış talebi.
 *
 * MİMARİ KARAR: tek ortak taban tablo + türe özgü detay tabloları
 * ("class table inheritance").
 *
 * Eski şemada bu üç akış için birbirinden bağımsız ve kısmen çakışan dört tablo
 * seti vardı (`moving_requests` ve `moving_appointments`, `technical_service_requests`
 * ve `technical_service_appointments`), üstelik aynı veri ayrıca KV store'da da
 * tutuluyordu. Hangi kaydın nerede olduğu endpoint'e göre değişiyordu.
 *
 * Buradaki yapı şunu sağlar:
 *
 *  - "Taleplerim" ekranı üç türü tek sorguyla listeler.
 *  - Takip numarası, durum makinesi, teklif, randevu ve zaman çizelgesi bir kez
 *    yazılır; üç tür de aynı davranır.
 *  - Türe özgü alanlar kendi tablosunda ve doğru tiple durur — `jsonb` çöplüğü olmaz.
 *  - Yeni bir hizmet türü eklemek, yeni bir detay tablosu eklemekten ibarettir.
 *
 * Bütünlük kuralı: her `service_requests` satırının, `kind` alanına karşılık gelen
 * tam olarak bir detay satırı vardır. Bu kısıt migration'da tetikleyiciyle güvenceye
 * alınır (bkz. `0001_integrity.sql`).
 */

import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
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
import { categories, products } from '../../catalog/infrastructure/schema.ts';
import { addressColumns } from '../../../platform/db/columns.ts';
import {
  actorEnum,
  deviceTypeEnum,
  houseSizeEnum,
  problemCategoryEnum,
  productConditionEnum,
  requestAddressRoleEnum,
  requestStatusEnum,
  serviceKindEnum,
  warrantyStatusEnum,
} from '../../../platform/db/enums.ts';

// ---------------------------------------------------------------------------
// Ortak taban
// ---------------------------------------------------------------------------

export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuid().primaryKey().defaultRandom(),

    /** Müşteriye gösterilen takip numarası: "NAK-2026-000123", "TSV-...", "SAT-...". */
    referenceNumber: text().notNull(),

    /**
     * Talebin türü. Hangi detay tablosunun dolu olacağını belirler ve
     * sonradan değiştirilemez.
     */
    kind: serviceKindEnum().notNull(),

    /** Hesap silinse bile talep kaydı korunur; iletişim bilgileri satıra kopyalanmıştır. */
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),

    status: requestStatusEnum().notNull().default('pending'),

    /** Talep sahibiyle iletişim bilgileri. Hesap sahibinden farklı olabilir. */
    contactName: text().notNull(),
    contactPhone: text().notNull(),

    customerNote: text(),

    /** Yalnızca personelin gördüğü not. Müşteri yanıtlarında asla yer almaz. */
    staffNote: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('service_requests_reference_number_unique').on(table.referenceNumber),
    // "Taleplerim" ekranının ana sorgusu.
    index('service_requests_user_created_idx').on(table.userId, table.createdAt),
    // Yönetim panelinin iş kuyruğu: türe ve duruma göre.
    index('service_requests_kind_status_idx').on(table.kind, table.status, table.createdAt),
    index('service_requests_status_created_idx').on(table.status, table.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Nakliye detayı
// ---------------------------------------------------------------------------

export const movingRequestDetails = pgTable('moving_request_details', {
  /** Taban tabloyla bire bir: birincil anahtar aynı zamanda yabancı anahtardır. */
  requestId: uuid()
    .primaryKey()
    .references(() => serviceRequests.id, { onDelete: 'cascade' }),

  houseSize: houseSizeEnum().notNull(),

  /*
   * Bina erişim bilgileri.
   *
   * Adresin parçası değildir, işin zorluğunun parçasıdır: asansörsüz her kat
   * için ek ücret uygulanır. Fiyatlandırmanın doğrudan girdisi olduğu için
   * gerçek sütunlarda tutulur; adres kayıtları `requestAddresses` tablosundadır.
   */
  fromFloor: integer().notNull(),
  fromHasElevator: boolean().notNull(),
  toFloor: integer().notNull(),
  toHasElevator: boolean().notNull(),

  /** Müşterinin tercih ettiği tarih. Kesin randevu teklif onayından sonra verilir. */
  preferredDate: date().notNull(),
  preferredStartTime: time(),
  preferredEndTime: time(),

  needsPacking: boolean().notNull().default(false),
  needsAssembly: boolean().notNull().default(false),

  /**
   * Talep oluşturulurken hesaplanan tahmini tutar (kuruş).
   * Bağlayıcı değildir; bağlayıcı tutar `requestQuotes` tablosundadır.
   */
  estimatedTotalKurus: bigint({ mode: 'number' }).notNull(),
});

export const movingRequestItems = pgTable(
  'moving_request_items',
  {
    id: uuid().primaryKey().defaultRandom(),

    requestId: uuid()
      .notNull()
      .references(() => movingRequestDetails.requestId, { onDelete: 'cascade' }),

    name: text().notNull(),
    quantity: integer().notNull().default(1),

    /** Demontaj gerektiren eşyalar ekibin süre ve ücret planlamasını etkiler. */
    needsDisassembly: boolean().notNull().default(false),

    note: text(),
    displayOrder: integer().notNull().default(0),
  },
  (table) => [index('moving_request_items_request_idx').on(table.requestId, table.displayOrder)],
);

// ---------------------------------------------------------------------------
// Teknik servis detayı
// ---------------------------------------------------------------------------

export const technicalServiceDetails = pgTable('technical_service_details', {
  requestId: uuid()
    .primaryKey()
    .references(() => serviceRequests.id, { onDelete: 'cascade' }),

  deviceType: deviceTypeEnum().notNull(),

  /** `deviceType` "other" ise doldurulur. */
  customDeviceType: text(),

  brand: text().notNull(),
  model: text(),

  warrantyStatus: warrantyStatusEnum().notNull().default('unknown'),

  problemCategory: problemCategoryEnum().notNull(),
  problemDescription: text().notNull(),

  /** Servis adresi `requestAddresses` tablosunda, `service_location` rolüyle tutulur. */
  preferredDate: date().notNull(),
  preferredStartTime: time(),
  preferredEndTime: time(),

  /**
   * Keşif ücreti, talep oluşturulduğu andaki tarifeyle sabitlenir. Tarife
   * sonradan değişse bile müşteriye bildirilen tutar geçerli kalır.
   */
  inspectionFeeKurus: bigint({ mode: 'number' }).notNull(),

  /** Teknisyenin yerinde yaptığı tespit. Keşif sonrası dolar. */
  diagnosis: text(),
});

// ---------------------------------------------------------------------------
// Ürün satış talebi detayı
// ---------------------------------------------------------------------------

export const sellRequestDetails = pgTable(
  'sell_request_details',
  {
    requestId: uuid()
      .primaryKey()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),

    title: text().notNull(),

    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),

    brand: text().notNull(),
    model: text(),

    condition: productConditionEnum().notNull(),

    /** Ürünün satın alındığı yıl. Değerlemede kullanılır. */
    purchaseYear: integer(),

    description: text().notNull(),

    hasBox: boolean().notNull().default(false),
    hasAccessories: boolean().notNull().default(false),
    hasWarranty: boolean().notNull().default(false),

    /** Müşterinin aklındaki fiyat (kuruş). Bağlayıcı değildir. */
    askingPriceKurus: bigint({ mode: 'number' }),

    /** Teslim alma adresi `requestAddresses` tablosunda, `pickup` rolüyle tutulur. */

    /**
     * Talep kabul edilip ürün teslim alındıysa, katalogda oluşturulan ürünün kimliği.
     * Satış talebi ile envanter kaydı arasındaki izlenebilirliği sağlar.
     */
    resultingProductId: uuid().references(() => products.id, { onDelete: 'set null' }),
  },
  (table) => [index('sell_request_details_category_idx').on(table.categoryId)],
);

// ---------------------------------------------------------------------------
// Ortak yan tablolar
// ---------------------------------------------------------------------------

export const requestPhotos = pgTable(
  'request_photos',
  {
    id: uuid().primaryKey().defaultRandom(),

    requestId: uuid()
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),

    storageKey: text().notNull(),
    caption: text(),
    displayOrder: integer().notNull().default(0),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('request_photos_request_order_idx').on(table.requestId, table.displayOrder)],
);

/**
 * Fiyat teklifleri.
 *
 * Geçmiş teklifler silinmez; revize teklif yeni satır olarak eklenir. Geçerli teklif,
 * `supersededAt` alanı boş olan en son satırdır. Bu, "bize şu fiyatı vermiştiniz"
 * tartışmalarında kaydın korunmasını sağlar.
 */
export const requestQuotes = pgTable(
  'request_quotes',
  {
    id: uuid().primaryKey().defaultRandom(),

    requestId: uuid()
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),

    amountKurus: bigint({ mode: 'number' }).notNull(),

    validUntil: date().notNull(),
    note: text(),

    /** Teklifi giren personel. */
    createdByUserId: uuid().references(() => users.id, { onDelete: 'set null' }),

    /** Yerine yeni teklif verildiyse dolar. Boşsa bu teklif geçerlidir. */
    supersededAt: timestamp({ withTimezone: true }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('request_quotes_request_created_idx').on(table.requestId, table.createdAt)],
);

export const requestAppointments = pgTable(
  'request_appointments',
  {
    id: uuid().primaryKey().defaultRandom(),

    requestId: uuid()
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),

    scheduledDate: date().notNull(),
    startTime: time().notNull(),
    endTime: time().notNull(),
    note: text(),

    /** Randevu iptal edildiyse dolar. Kayıt silinmez, takvim geçmişi korunur. */
    cancelledAt: timestamp({ withTimezone: true }),

    createdByUserId: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('request_appointments_request_idx').on(table.requestId),
    // Takvim ekranının sorgusu: belirli bir gündeki tüm randevular, saat sırasıyla.
    index('request_appointments_date_idx').on(table.scheduledDate, table.startTime),
  ],
);

/**
 * Talep zaman çizelgesi.
 *
 * Hem durum değişikliklerini hem taraflar arasındaki notları taşır. Yalnızca
 * eklenir; hiçbir zaman güncellenmez veya silinmez.
 */
export const requestEvents = pgTable(
  'request_events',
  {
    id: uuid().primaryKey().defaultRandom(),

    requestId: uuid()
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),

    status: requestStatusEnum().notNull(),
    note: text(),

    actor: actorEnum().notNull(),
    actorUserId: uuid().references(() => users.id, { onDelete: 'set null' }),

    /**
     * Olayın gerçekleştiği an — `now()` DEĞİL, `clock_timestamp()`.
     *
     * `now()` işlemin başladığı anı verir ve işlem boyunca sabittir. Teklif
     * verilirken aynı işlemde iki olay yazılır ("incelemeye alındı" ve "teklif
     * verildi"); ikisi de aynı damgayı aldığında müşteri zaman çizelgesinde
     * teklifi incelemeden ÖNCE görebiliyordu. `clock_timestamp()` gerçek anı
     * verir.
     */
    createdAt: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (table) => [index('request_events_request_created_idx').on(table.requestId, table.createdAt)],
);

/**
 * Hizmet taleplerinin adresleri.
 *
 * Tek tabloda, rol sütunuyla ayrılır:
 *   moving_from       nakliyede çıkış adresi
 *   moving_to         nakliyede varış adresi
 *   service_location  teknik servisin gideceği adres
 *   pickup            satış talebinde ürünün alınacağı adres
 *
 * Adresler değişmezdir: talep oluşturulduğu andaki fotoğraftır. Müşteri adres
 * defterindeki kaydı sonradan düzenlese bile talebin adresi olduğu gibi kalır.
 *
 * `jsonb` yerine gerçek sütunlar kullanılır. Bu alanlar sorgulanır — "bu hafta
 * Bornova'da kaç iş var", "hangi ilçelerde talep yoğun" — ve `jsonb` içinde
 * indekslenemez, ilçe kısıtı uygulanamazdı.
 */
export const requestAddresses = pgTable(
  'request_addresses',
  {
    id: uuid().primaryKey().defaultRandom(),

    requestId: uuid()
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),

    role: requestAddressRoleEnum().notNull(),

    ...addressColumns,

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Bir talepte aynı rolden yalnızca bir adres olabilir: nakliyenin tek çıkış
    // ve tek varış adresi vardır.
    uniqueIndex('request_addresses_request_role_unique').on(table.requestId, table.role),
    index('request_addresses_district_idx').on(table.district),
  ],
);
