/**
 * Ürün veri erişimi.
 *
 * Bu katman yalnızca sorgu kurar ve satırları alan tiplerine çevirir; iş kuralı
 * içermez. Kurallar `domain/`, akış `application/` katmanındadır.
 *
 * Tüm sorgular Drizzle üzerinden parametreli üretilir. Eski kod tabanında
 * PostgREST filtreleri dize birleştirmeyle kuruluyordu
 * (`.or(\`email.eq.${email}\`)`), bu da filtre enjeksiyonuna açıktı.
 */

import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type {
  AdminProductListQuery,
  ProductCondition,
  ProductListQuery,
  ProductSort,
  ProductStatus,
} from '@ersinspot/shared';
import { PUBLICLY_VISIBLE_PRODUCT_STATUSES } from '@ersinspot/shared';
import { contains } from '../../../platform/db/search.ts';
import { db } from '../../../platform/db/client.ts';
import type { Transaction } from '../../../platform/db/client.ts';
import { brands, categories, productImages, productSpecs, products } from './schema.ts';

type Executor = Transaction | typeof db;

// ---------------------------------------------------------------------------
// Satır tipleri
// ---------------------------------------------------------------------------

export interface ProductRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceKurus: number;
  condition: ProductCondition;
  status: ProductStatus;
  warrantyMonths: number;
  viewCount: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  brandId: string | null;
  brandName: string | null;
  brandSlug: string | null;
}

export interface ProductImageRow {
  id: string;
  productId: string;
  storageKey: string;
  altText: string;
  displayOrder: number;
}

export interface ProductSpecRow {
  productId: string;
  key: string;
  value: string;
  displayOrder: number;
}

/** Ortak seçim listesi: ürün + kategori + marka birleşimi. */
const productSelection = {
  id: products.id,
  slug: products.slug,
  title: products.title,
  description: products.description,
  priceKurus: products.priceKurus,
  condition: products.condition,
  status: products.status,
  warrantyMonths: products.warrantyMonths,
  viewCount: products.viewCount,
  favoriteCount: products.favoriteCount,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
  categoryId: categories.id,
  categoryName: categories.name,
  categorySlug: categories.slug,
  brandId: brands.id,
  brandName: brands.name,
  brandSlug: brands.slug,
} as const;

function baseQuery(executor: Executor = db) {
  return executor
    .select(productSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id));
}

// ---------------------------------------------------------------------------
// Sıralama
// ---------------------------------------------------------------------------

/**
 * Sıralama anahtarları. Sonuncusu DAİMA kimliktir.
 *
 * Sayfalama `LIMIT`/`OFFSET` ile yapılır ve sıralama anahtarı eşit olan
 * satırların birbirine göre sırası tanımsızdır. İki sorgu arasında bu sıra
 * değişirse aynı ürün iki sayfada birden görünür, bir başkası hiç görünmez.
 * Fiyata göre sıralamada bu kuramsal bir risk değil: aynı fiyatlı ürünler
 * olağandır.
 *
 * Kimlik, eşitliği bozan ve sorgudan sorguya değişmeyen bir anahtardır.
 */
function orderClause(sort: ProductSort): SQL[] {
  const stable = asc(products.id);

  switch (sort) {
    case 'newest':
      return [desc(products.createdAt), stable];
    case 'oldest':
      return [asc(products.createdAt), stable];
    case 'price_asc':
      return [asc(products.priceKurus), stable];
    case 'price_desc':
      return [desc(products.priceKurus), stable];
    case 'most_viewed':
      return [desc(products.viewCount), desc(products.createdAt), stable];
    case 'most_favorited':
      return [desc(products.favoriteCount), desc(products.createdAt), stable];
  }
}

// ---------------------------------------------------------------------------
// Filtreleme
// ---------------------------------------------------------------------------

/**
 * Vitrin sorgusunun koşulları.
 *
 * Durum filtresi çağıranın kontrolünde DEĞİLDİR: yalnızca herkese açık durumlar
 * döner. Eski kodda `showAll=true` sorgu parametresiyle taslak ürünler dışarıdan
 * listelenebiliyordu.
 */
function publicConditions(query: ProductListQuery): SQL[] {
  const conditions: SQL[] = [
    isNull(products.deletedAt),
    inArray(products.status, [...PUBLICLY_VISIBLE_PRODUCT_STATUSES]),
  ];

  if (query.categorySlug !== undefined) {
    conditions.push(eq(categories.slug, query.categorySlug));
  }
  if (query.brandSlug !== undefined) {
    conditions.push(eq(brands.slug, query.brandSlug));
  }
  if (query.condition !== undefined) {
    conditions.push(eq(products.condition, query.condition));
  }
  if (query.minPrice !== undefined) {
    conditions.push(gte(products.priceKurus, query.minPrice));
  }
  if (query.maxPrice !== undefined) {
    conditions.push(lte(products.priceKurus, query.maxPrice));
  }

  if (query.search !== undefined && query.search !== '') {
    // Başlık ve marka üzerinde kısmi eşleşme. Desen parametreli üretilir ve
    // joker karakterler kaçırılır; arama metni sorgu yapısını etkileyemez.
    const searchCondition = or(
      contains(products.title, query.search),
      contains(brands.name, query.search),
    );
    if (searchCondition !== undefined) {
      conditions.push(searchCondition);
    }
  }

  return conditions;
}

/** Yönetim panelinin sorgu koşulları. Durum filtresine izin verir. */
function adminConditions(query: AdminProductListQuery): SQL[] {
  const conditions: SQL[] = [isNull(products.deletedAt)];

  if (query.categoryId !== undefined) {
    conditions.push(eq(products.categoryId, query.categoryId));
  }
  if (query.brandId !== undefined) {
    conditions.push(eq(products.brandId, query.brandId));
  }
  if (query.condition !== undefined) {
    conditions.push(eq(products.condition, query.condition));
  }
  if (query.status !== undefined) {
    conditions.push(eq(products.status, query.status));
  }

  if (query.search !== undefined && query.search !== '') {
    const searchCondition = or(
      contains(products.title, query.search),
      contains(products.slug, query.search),
      contains(brands.name, query.search),
    );
    if (searchCondition !== undefined) {
      conditions.push(searchCondition);
    }
  }

  return conditions;
}

// ---------------------------------------------------------------------------
// Listeleme
// ---------------------------------------------------------------------------

export interface ListResult {
  readonly rows: readonly ProductRow[];
  readonly totalCount: number;
}

/** Site vitrini için ürün listesi. Yalnızca herkese açık durumlar döner. */
export async function listPublic(query: ProductListQuery): Promise<ListResult> {
  const conditions = publicConditions(query);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await baseQuery()
    .where(and(...conditions))
    .orderBy(...orderClause(query.sort))
    .limit(query.pageSize)
    .offset(offset);

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(...conditions));

  return { rows, totalCount: countRow?.value ?? 0 };
}

/** Yönetim paneli için ürün listesi. Tüm durumları görebilir. */
export async function listForAdmin(query: AdminProductListQuery): Promise<ListResult> {
  const conditions = adminConditions(query);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await baseQuery()
    .where(and(...conditions))
    .orderBy(...orderClause(query.sort))
    .limit(query.pageSize)
    .offset(offset);

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(...conditions));

  return { rows, totalCount: countRow?.value ?? 0 };
}

// ---------------------------------------------------------------------------
// Tekil okuma
// ---------------------------------------------------------------------------

/**
 * Vitrin için bağlantı adına göre ürün.
 *
 * Durum filtresi çağıranın kontrolünde DEĞİLDİR: liste sorgusuyla aynı küme
 * uygulanır. Filtre olmadığında taslak ve depodaki ürünler, bağlantı adı
 * bilinen herkese açılıyordu — listede gizlenen bir ürünün detayının açık
 * kalması, gizlemeyi anlamsız kılar.
 */
export async function findPublicBySlug(slug: string): Promise<ProductRow | null> {
  const rows = await baseQuery()
    .where(
      and(
        eq(products.slug, slug),
        isNull(products.deletedAt),
        inArray(products.status, [...PUBLICLY_VISIBLE_PRODUCT_STATUSES]),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function findById(id: string, executor: Executor = db): Promise<ProductRow | null> {
  const rows = await baseQuery(executor)
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Verilen kimliklerdeki ürünleri vitrin kurallarıyla döndürür.
 *
 * Favori listesi gibi, kimlik kümesi başka bir modülden gelen ekranlar için.
 * Durum filtresi burada da uygulanır: favorilere eklenmiş bir ürün sonradan
 * taslağa çekildiyse listede görünmemelidir.
 *
 * Sıra korunmaz; çağıran taraf kendi sırasını uygular.
 */
export async function findPublicByIds(productIds: readonly string[]): Promise<ProductRow[]> {
  if (productIds.length === 0) return [];

  return baseQuery().where(
    and(
      inArray(products.id, [...productIds]),
      isNull(products.deletedAt),
      inArray(products.status, [...PUBLICLY_VISIBLE_PRODUCT_STATUSES]),
    ),
  );
}

/** Bağlantı adının kullanımda olup olmadığını söyler. */
export async function slugExists(slug: string, excludeProductId?: string): Promise<boolean> {
  const conditions: SQL[] = [eq(products.slug, slug)];

  if (excludeProductId !== undefined) {
    conditions.push(sql`${products.id} <> ${excludeProductId}`);
  }

  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(and(...conditions))
    .limit(1);

  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Görseller ve özellikler
// ---------------------------------------------------------------------------

/**
 * Birden çok ürünün görsellerini tek sorguda çeker.
 *
 * Liste ekranlarında her ürün için ayrı sorgu çalıştırmak N+1 sorununa yol açar;
 * eski kod tabanında bu desenden 14 tane vardı.
 */
export async function findImagesForProducts(
  productIds: readonly string[],
): Promise<Map<string, ProductImageRow[]>> {
  if (productIds.length === 0) return new Map();

  const rows = await db
    .select({
      id: productImages.id,
      productId: productImages.productId,
      storageKey: productImages.storageKey,
      altText: productImages.altText,
      displayOrder: productImages.displayOrder,
    })
    .from(productImages)
    .where(inArray(productImages.productId, [...productIds]))
    .orderBy(asc(productImages.productId), asc(productImages.displayOrder));

  const grouped = new Map<string, ProductImageRow[]>();

  for (const row of rows) {
    const existing = grouped.get(row.productId);
    if (existing === undefined) {
      grouped.set(row.productId, [row]);
    } else {
      existing.push(row);
    }
  }

  return grouped;
}

export async function findSpecsForProduct(productId: string): Promise<ProductSpecRow[]> {
  return db
    .select({
      productId: productSpecs.productId,
      key: productSpecs.key,
      value: productSpecs.value,
      displayOrder: productSpecs.displayOrder,
    })
    .from(productSpecs)
    .where(eq(productSpecs.productId, productId))
    .orderBy(asc(productSpecs.displayOrder));
}

// ---------------------------------------------------------------------------
// Satın alınabilirlik — ordering modülünün kullandığı yol
// ---------------------------------------------------------------------------

export interface PurchasableRow {
  id: string;
  slug: string;
  title: string;
  priceKurus: number;
  status: ProductStatus;
  condition: ProductCondition;
  coverStorageKey: string | null;
}

/** Kapak görseli olmadan, yalnızca fiyat ve durum. */
const purchasableSelection = {
  id: products.id,
  slug: products.slug,
  title: products.title,
  priceKurus: products.priceKurus,
  status: products.status,
  condition: products.condition,
} as const;

/**
 * Sipariş oluşturmak için gereken ürün bilgisini döndürür ve satırları kilitler.
 *
 * `FOR UPDATE` kilidi kullanılır: iki müşteri aynı tekil ürünü aynı anda sipariş
 * etmeye çalıştığında ikincisi ilkinin işlemi bitene kadar bekler ve ardından
 * ürünü `reserved` durumda görüp reddedilir. Kilit olmadan her iki sipariş de
 * geçerdi ve aynı buzdolabı iki kez satılırdı.
 *
 * SIRALAMA KİLİDİN PARÇASIDIR. Kilitler satırların döndüğü sırayla alınır;
 * sıra belirtilmediğinde bunu tarama planı belirler. İki sepette aynı iki ürün
 * ters sırada kilitlendiğinde işlemler birbirini bekler ve PostgreSQL birini
 * ölü kilit (deadlock) hatasıyla düşürür. Kimliğe göre sıralamak, tüm
 * işlemlerin aynı sırayı izlemesini ve bu durumun hiç oluşmamasını sağlar.
 */
export async function findPurchasableForUpdate(
  productIds: readonly string[],
  tx: Transaction,
): Promise<PurchasableRow[]> {
  if (productIds.length === 0) return [];

  const rows = await tx
    .select(purchasableSelection)
    .from(products)
    .where(and(inArray(products.id, [...productIds]), isNull(products.deletedAt)))
    .orderBy(asc(products.id))
    .for('update');

  // Kapak görselleri ayrı çekilir: `FOR UPDATE`, dış birleşimle birlikte kullanılamaz.
  const images = await findImagesForProducts(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...row,
    coverStorageKey: images.get(row.id)?.[0]?.storageKey ?? null,
  }));
}

/**
 * Aynı bilgiyi KİLİTSİZ döndürür: sepet ve benzeri okuma yolları için.
 *
 * Sepeti görüntülemek ürün satırlarını kilitlememelidir. Önceden okuma yolu da
 * `findPurchasableForUpdate` çağırıyordu; sepete bakan her ziyaretçi ürünleri
 * kilitliyor ve o sırada sipariş vermeye çalışan müşteri bekliyordu.
 */
export async function findPurchasable(productIds: readonly string[]): Promise<PurchasableRow[]> {
  if (productIds.length === 0) return [];

  const rows = await db
    .select(purchasableSelection)
    .from(products)
    .where(and(inArray(products.id, [...productIds]), isNull(products.deletedAt)));

  const images = await findImagesForProducts(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...row,
    coverStorageKey: images.get(row.id)?.[0]?.storageKey ?? null,
  }));
}

/**
 * Durum geçişi için gereken en az bilgiyi kilitleyerek okur.
 *
 * Rezervasyonu çözmek ve satıldı işaretlemek yalnızca mevcut durumu bilmeyi
 * gerektirir. Önceden bu iki yol da `findPurchasableForUpdate` çağırıyor,
 * kullanılmayan kapak görsellerini de çekiyordu: her sipariş iptalinde ve her
 * teslimatta fazladan bir sorgu.
 */
export async function findStatusesForUpdate(
  productIds: readonly string[],
  tx: Transaction,
): Promise<{ id: string; status: ProductStatus }[]> {
  if (productIds.length === 0) return [];

  return tx
    .select({ id: products.id, status: products.status })
    .from(products)
    .where(and(inArray(products.id, [...productIds]), isNull(products.deletedAt)))
    .orderBy(asc(products.id))
    .for('update');
}

/**
 * Ürünlerin durumunu topluca değiştirir. Rezervasyon ve satış akışında kullanılır.
 *
 * Rezervasyon süresi durumla birlikte yönetilir: `reserved` durumuna geçerken
 * dolar, çıkarken temizlenir. Veritabanı kısıtı ikisinin tutarlı olmasını
 * zorunlu kılar (`products_reserved_has_expiry`).
 */
export async function updateStatuses(
  productIds: readonly string[],
  status: ProductStatus,
  tx: Transaction,
  reservedUntil?: Date,
): Promise<void> {
  if (productIds.length === 0) return;

  await tx
    .update(products)
    .set({
      status,
      reservedUntil: status === 'reserved' ? (reservedUntil ?? null) : null,
    })
    .where(inArray(products.id, [...productIds]));
}

/**
 * Süresi geçmiş rezervasyonları serbest bırakır.
 *
 * Ödenmeyen ve iptal de edilmeyen siparişler ürünü kalıcı olarak satıştan
 * çıkarırdı. Zamanlanmış bakım görevinden çağrılır.
 *
 * @returns Serbest bırakılan ürün sayısı.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const released = await db
    .update(products)
    .set({ status: 'for_sale', reservedUntil: null })
    .where(and(eq(products.status, 'reserved'), lt(products.reservedUntil, new Date())))
    .returning({ id: products.id });

  return released.length;
}

// ---------------------------------------------------------------------------
// Görüntülenme sayacı
// ---------------------------------------------------------------------------

/**
 * Görüntülenme sayacını artırır.
 *
 * Okuma yolunda çalıştığı için hata durumunda sessizce geçilir: sayaç
 * güncellenemedi diye ürün sayfası açılmamalıdır. Çağıran taraf sonucu beklemez.
 */
export async function incrementViewCount(productId: string): Promise<void> {
  await db
    .update(products)
    .set({ viewCount: sql`${products.viewCount} + 1` })
    .where(eq(products.id, productId));
}
