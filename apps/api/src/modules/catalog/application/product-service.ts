/**
 * Ürün kullanım senaryoları.
 *
 * Bu katman `domain` kurallarını ve `infrastructure` sorgularını birleştirir.
 * HTTP bilmez: girdi olarak doğrulanmış veri alır, çıktı olarak alan tipleri verir.
 * Hataları `AppError` olarak fırlatır; HTTP durum koduna çevirme işi
 * `platform/http/error-handler.ts` katmanındadır.
 */

import type {
  AdminProductListQuery,
  Paginated,
  Product,
  ProductListQuery,
  ProductSummary,
} from '@ersinspot/shared';
import { paginate } from '@ersinspot/shared';
import { logger } from '../../../platform/observability/logger.ts';
import { notFound } from '../../../platform/errors/index.ts';
import { resolveStorageUrl } from '../../../platform/storage.ts';
import { formatWarranty } from '../domain/product-rules.ts';
import type {
  ProductImageRow,
  ProductRow,
  ProductSpecRow,
} from '../infrastructure/product-repository.ts';
import * as repository from '../infrastructure/product-repository.ts';

// ---------------------------------------------------------------------------
// Satırdan alan tipine dönüşüm
// ---------------------------------------------------------------------------

function toProductImage(row: ProductImageRow) {
  return {
    id: row.id,
    url: resolveStorageUrl(row.storageKey),
    storageKey: row.storageKey,
    altText: row.altText,
    displayOrder: row.displayOrder,
  };
}

function toCategoryRef(row: ProductRow) {
  return { id: row.categoryId, name: row.categoryName, slug: row.categorySlug };
}

function toBrandRef(row: ProductRow) {
  if (row.brandId === null || row.brandName === null || row.brandSlug === null) {
    return null;
  }
  return { id: row.brandId, name: row.brandName, slug: row.brandSlug };
}

function toSummary(row: ProductRow, images: readonly ProductImageRow[]): ProductSummary {
  const cover = images[0];

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    price: row.priceKurus,
    condition: row.condition,
    status: row.status,
    category: toCategoryRef(row),
    brand: toBrandRef(row),
    coverImage: cover === undefined ? null : toProductImage(cover),
    favoriteCount: row.favoriteCount,
    createdAt: row.createdAt.toISOString(),
  };
}

function toProduct(
  row: ProductRow,
  images: readonly ProductImageRow[],
  specs: readonly ProductSpecRow[],
): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: row.priceKurus,
    condition: row.condition,
    status: row.status,
    warrantyMonths: row.warrantyMonths,
    category: toCategoryRef(row),
    brand: toBrandRef(row),
    images: images.map(toProductImage),
    specs: specs.map((spec) => ({ key: spec.key, value: spec.value })),
    viewCount: row.viewCount,
    favoriteCount: row.favoriteCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Listeyi görselleriyle birlikte tek sorguda zenginleştirir (N+1 önlenir). */
async function attachImages(rows: readonly ProductRow[]): Promise<ProductSummary[]> {
  const imagesByProduct = await repository.findImagesForProducts(rows.map((row) => row.id));
  return rows.map((row) => toSummary(row, imagesByProduct.get(row.id) ?? []));
}

// ---------------------------------------------------------------------------
// Listeleme
// ---------------------------------------------------------------------------

/** Site vitrini. Yalnızca satıştaki ve rezerve ürünler döner. */
export async function listProducts(query: ProductListQuery): Promise<Paginated<ProductSummary>> {
  const { rows, totalCount } = await repository.listPublic(query);
  const items = await attachImages(rows);
  return paginate(items, totalCount, query);
}

/** Yönetim paneli. Taslak ve depodaki ürünler dahil tüm durumlar döner. */
export async function listProductsForAdmin(
  query: AdminProductListQuery,
): Promise<Paginated<ProductSummary>> {
  const { rows, totalCount } = await repository.listForAdmin(query);
  const items = await attachImages(rows);
  return paginate(items, totalCount, query);
}

// ---------------------------------------------------------------------------
// Ürün detayı
// ---------------------------------------------------------------------------

export interface ProductDetail extends Product {
  /** Garanti süresinin okunabilir karşılığı: "2 Yıl Garanti". */
  readonly warrantyLabel: string;
}

/**
 * Bağlantı adına göre ürün detayı.
 *
 * Görüntülenme sayacı artırılır ancak sonucu beklenmez: sayaç güncellemesi
 * başarısız olsa bile sayfa açılmalıdır.
 */
export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const row = await repository.findBySlug(slug);

  if (row === null) {
    throw notFound('Ürün');
  }

  const [imagesByProduct, specs] = await Promise.all([
    repository.findImagesForProducts([row.id]),
    repository.findSpecsForProduct(row.id),
  ]);

  void repository.incrementViewCount(row.id).catch((error: unknown) => {
    logger.warn('Görüntülenme sayacı güncellenemedi', { productId: row.id, error: String(error) });
  });

  const product = toProduct(row, imagesByProduct.get(row.id) ?? [], specs);

  return { ...product, warrantyLabel: formatWarranty(row.warrantyMonths) };
}

/** Kimliğe göre ürün detayı. Yönetim panelinde kullanılır. */
export async function getProductById(id: string): Promise<ProductDetail> {
  const row = await repository.findById(id);

  if (row === null) {
    throw notFound('Ürün');
  }

  const [imagesByProduct, specs] = await Promise.all([
    repository.findImagesForProducts([row.id]),
    repository.findSpecsForProduct(row.id),
  ]);

  const product = toProduct(row, imagesByProduct.get(row.id) ?? [], specs);

  return { ...product, warrantyLabel: formatWarranty(row.warrantyMonths) };
}
