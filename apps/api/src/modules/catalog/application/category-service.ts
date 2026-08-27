/**
 * Kategori ve marka okuma işlemleri.
 *
 * Kategoriler iki seviyelidir: kök kategoriler (Beyaz Eşya, Elektronik, Mobilya)
 * ve alt kategoriler (Buzdolabı, Çamaşır Makinesi). Daha derin bir ağaç bu
 * işletmenin ihtiyacını aşar ve gezinmeyi zorlaştırır.
 */

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { PUBLICLY_VISIBLE_PRODUCT_STATUSES } from '@ersinspot/shared';
import { db } from '../../../platform/db/client.ts';
import { resolveStorageUrl } from '../../../platform/storage.ts';
import { brands, categories, products } from '../infrastructure/schema.ts';

/**
 * Vitrinde görünen ürünleri sayan ifade.
 *
 * Koşul `inArray` ile parametreli üretilir; durum listesi sorgu metnine
 * gömülmez. Değerler sabit olsa bile dize birleştirmeyle sorgu kurmak, zamanla
 * kullanıcı girdisinin de aynı yoldan geçmesine zemin hazırlar.
 */
const visibleProductCount = sql<number>`
  count(${products.id}) filter (
    where ${and(
      inArray(products.status, [...PUBLICLY_VISIBLE_PRODUCT_STATUSES]),
      isNull(products.deletedAt),
    )}
  )::int
`;

export interface CategoryNode {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly displayOrder: number;
  /** Bu kategoride ve alt kategorilerinde satıştaki ürün sayısı. */
  readonly productCount: number;
  readonly children: readonly CategoryNode[];
}

export interface BrandSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  /** Depolama anahtarından türetilen görüntüleme adresi. */
  readonly logoUrl: string | null;
  readonly productCount: number;
}

/**
 * Kategori ağacını ürün sayılarıyla birlikte döndürür.
 *
 * Sayımlar tek sorguda yapılır. Her kategori için ayrı sorgu çalıştırmak N+1
 * sorununa yol açardı; eski kod tabanında bu desenden 14 tane vardı.
 */
export async function listCategoryTree(): Promise<CategoryNode[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
      displayOrder: categories.displayOrder,
      productCount: visibleProductCount,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(
      categories.id,
      categories.name,
      categories.slug,
      categories.parentId,
      categories.displayOrder,
    )
    .orderBy(asc(categories.displayOrder), asc(categories.name));

  // Alt kategorileri üstlerine bağla.
  const childrenByParent = new Map<string, CategoryNode[]>();

  for (const row of rows) {
    if (row.parentId === null) continue;

    const node: CategoryNode = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      displayOrder: row.displayOrder,
      productCount: row.productCount,
      children: [],
    };

    const siblings = childrenByParent.get(row.parentId);
    if (siblings === undefined) {
      childrenByParent.set(row.parentId, [node]);
    } else {
      siblings.push(node);
    }
  }

  return rows
    .filter((row) => row.parentId === null)
    .map((row) => {
      const children = childrenByParent.get(row.id) ?? [];

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        displayOrder: row.displayOrder,
        // Kök kategorinin sayımı, kendi ürünleri ile alt kategorilerinin toplamıdır.
        productCount:
          row.productCount + children.reduce((total, child) => total + child.productCount, 0),
        children,
      };
    });
}

/** Markaları, satıştaki ürün sayısıyla birlikte döndürür. Ürünü olmayanlar gelmez. */
export async function listBrands(): Promise<BrandSummary[]> {
  const rows = await db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      logoStorageKey: brands.logoStorageKey,
      productCount: visibleProductCount,
    })
    .from(brands)
    .leftJoin(products, eq(products.brandId, brands.id))
    .groupBy(brands.id, brands.name, brands.slug, brands.logoStorageKey)
    .orderBy(asc(brands.name));

  return rows
    .filter((row) => row.productCount > 0)
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoStorageKey === null ? null : resolveStorageUrl(row.logoStorageKey),
      productCount: row.productCount,
    }));
}

/**
 * Kategoriyi kimliğe göre getirir.
 *
 * `servicing` modülü satış talebinin kategorisini göstermek için kullanır;
 * `categories` tablosuna doğrudan erişemez.
 */
export async function getCategoryById(
  categoryId: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  const rows = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  return rows[0] ?? null;
}

/** Kategori bağlantı adından kimliği bulur. Bulunamazsa null. */
export async function findCategoryIdBySlug(slug: string): Promise<string | null> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  return rows[0]?.id ?? null;
}

/** Kök kategorileri döndürür. Form seçeneklerinde kullanılır. */
export async function listRootCategories(): Promise<{ id: string; name: string; slug: string }[]> {
  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .where(isNull(categories.parentId))
    .orderBy(asc(categories.displayOrder), asc(categories.name));
}
