/**
 * Ürün kataloğu tabloları.
 *
 * Para birimi kararı: tüm tutarlar `bigint` sütunlarda kuruş cinsinden tam sayı
 * olarak saklanır. `numeric` yerine `bigint` seçilmesinin nedeni, uygulama katmanında
 * da tam sayı aritmetiği kullanılması ve tip dönüşümünde ondalık belirsizliği
 * oluşmamasıdır. Eski şemada fiyatlar `numeric` idi ve uygulama tarafında
 * `parseFloat` ile okunuyordu; bu, yuvarlama hatalarına açık bir kombinasyondu.
 */

import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { productConditionEnum, productStatusEnum } from './enums.ts';

export const categories = pgTable(
  'categories',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    slug: text().notNull(),

    /**
     * Alt kategoriler için üst kategori. Kök kategorilerde null.
     *
     * Kendine referans veren sütunlarda dönüş tipi açıkça `AnyPgColumn` olarak
     * yazılmalıdır; aksi halde TypeScript tip çıkarımı döngüye girer.
     */
    parentId: uuid().references((): AnyPgColumn => categories.id, {
      onDelete: 'restrict',
    }),

    displayOrder: integer().notNull().default(0),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('categories_slug_unique').on(table.slug),
    index('categories_parent_id_idx').on(table.parentId),
  ],
);

export const brands = pgTable(
  'brands',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    slug: text().notNull(),
    logoUrl: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('brands_slug_unique').on(table.slug)],
);

export const products = pgTable(
  'products',
  {
    id: uuid().primaryKey().defaultRandom(),

    /** SEO dostu bağlantı adı. Başlıktan üretilir, benzersizdir. */
    slug: text().notNull(),

    title: text().notNull(),
    description: text().notNull(),

    /** Kuruş cinsinden fiyat. Asla ondalıklı sayı olarak okunmaz. */
    priceKurus: bigint({ mode: 'number' }).notNull(),

    condition: productConditionEnum().notNull(),
    status: productStatusEnum().notNull().default('draft'),

    /** Garanti süresi (ay). 0 ise garanti yok. */
    warrantyMonths: integer().notNull().default(0),

    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),

    brandId: uuid().references(() => brands.id, { onDelete: 'set null' }),

    /**
     * Sayaçlar denormalize tutulur: her liste görüntülemesinde alt sorgu çalıştırmak
     * yerine tetikleyici/uygulama tarafından güncellenir.
     */
    viewCount: integer().notNull().default(0),
    favoriteCount: integer().notNull().default(0),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),

    /** Yumuşak silme: sipariş geçmişindeki referanslar bozulmasın diye. */
    deletedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    uniqueIndex('products_slug_unique').on(table.slug),
    // Vitrin sorgusunun ana indeksi: satıştaki ürünler, en yeniden eskiye.
    index('products_status_created_idx').on(table.status, table.createdAt),
    index('products_category_id_idx').on(table.categoryId),
    index('products_brand_id_idx').on(table.brandId),
    index('products_price_idx').on(table.priceKurus),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuid().primaryKey().defaultRandom(),

    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    /** Depolama katmanındaki kalıcı anahtar. URL bundan türetilir. */
    storageKey: text().notNull(),

    /** Erişilebilirlik için görsel açıklaması. Boş bırakılmaz. */
    altText: text().notNull().default(''),

    displayOrder: integer().notNull().default(0),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('product_images_product_order_idx').on(table.productId, table.displayOrder)],
);

export const productSpecs = pgTable(
  'product_specs',
  {
    id: uuid().primaryKey().defaultRandom(),

    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    /** Özellik adı: "Enerji Sınıfı", "Kapasite". */
    key: text().notNull(),
    value: text().notNull(),

    displayOrder: integer().notNull().default(0),
  },
  (table) => [
    index('product_specs_product_order_idx').on(table.productId, table.displayOrder),
    // Aynı ürüne aynı özellik iki kez eklenemez.
    uniqueIndex('product_specs_product_key_unique').on(table.productId, table.key),
  ],
);
