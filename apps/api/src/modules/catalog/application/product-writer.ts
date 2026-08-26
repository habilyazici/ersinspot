/**
 * Ürün oluşturma ve düzenleme.
 *
 * Katalogda ürün iki yoldan doğar:
 *
 *  1. Personel doğrudan ekler (yönetim paneli).
 *  2. Kabul edilen bir satış talebinden dönüştürülür (`servicing` modülü).
 *
 * İkinci yol, `catalog` sözleşmesinden sunulur: `servicing` modülü `products`
 * tablosuna erişemez, bu fonksiyonu çağırır.
 */

import { eq } from 'drizzle-orm';
import type { CreateProductInput, ProductCondition, UpdateProductInput } from '@ersinspot/shared';
import { db } from '../../../platform/db/client.ts';
import type { Transaction } from '../../../platform/db/client.ts';
import { businessRule, notFound } from '../../../platform/errors/index.ts';
import { logger } from '../../../platform/observability/logger.ts';
import { canTransitionProduct } from '../domain/product-rules.ts';
import { productImages, productSpecs, products } from '../infrastructure/schema.ts';
import * as repository from '../infrastructure/product-repository.ts';
import { generateUniqueSlug } from './slug-service.ts';

// ---------------------------------------------------------------------------
// Personel tarafından ürün ekleme
// ---------------------------------------------------------------------------

export async function createProduct(input: CreateProductInput): Promise<{ productId: string }> {
  const slug = await generateUniqueSlug(input.title);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values({
        slug,
        title: input.title,
        description: input.description,
        priceKurus: input.price,
        condition: input.condition,
        status: input.status,
        warrantyMonths: input.warrantyMonths,
        categoryId: input.categoryId,
        brandId: input.brandId,
      })
      .returning({ id: products.id });

    if (created === undefined) {
      throw new Error('Ürün kaydı oluşturulamadı.');
    }

    await tx.insert(productImages).values(
      input.images.map((image, index) => ({
        productId: created.id,
        storageKey: image.storageKey,
        altText: image.altText ?? input.title,
        displayOrder: index,
      })),
    );

    if (input.specs.length > 0) {
      await tx.insert(productSpecs).values(
        input.specs.map((spec, index) => ({
          productId: created.id,
          key: spec.key,
          value: spec.value,
          displayOrder: index,
        })),
      );
    }

    logger.info('Ürün oluşturuldu', { productId: created.id, slug });

    return { productId: created.id };
  });
}

/**
 * Ürünü günceller.
 *
 * Başlık değişirse bağlantı adı yeniden üretilir — ancak eski bağlantı adı
 * korunmaz. Ürün henüz yayınlanmamışsa bu sorun değildir; yayındaki ürünlerde
 * bağlantı adının sabit kalması tercih edilir, bu yüzden yalnızca taslak ve
 * depodaki ürünlerde yenilenir.
 */
export async function updateProduct(productId: string, input: UpdateProductInput): Promise<void> {
  const existing = await repository.findById(productId);

  if (existing === null) {
    throw notFound('Ürün');
  }

  const shouldRenewSlug =
    input.title !== undefined &&
    input.title !== existing.title &&
    (existing.status === 'draft' || existing.status === 'in_storage');

  const slug = shouldRenewSlug
    ? await generateUniqueSlug(input.title as string, productId)
    : undefined;

  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.price === undefined ? {} : { priceKurus: input.price }),
        ...(input.condition === undefined ? {} : { condition: input.condition }),
        ...(input.warrantyMonths === undefined ? {} : { warrantyMonths: input.warrantyMonths }),
        ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
        ...(input.brandId === undefined ? {} : { brandId: input.brandId }),
        ...(slug === undefined ? {} : { slug }),
      })
      .where(eq(products.id, productId));

    // Görseller verilmişse tamamen değiştirilir; kısmi güncelleme yerine
    // tam liste beklenir — sıralama da böyle korunur.
    if (input.images !== undefined) {
      await tx.delete(productImages).where(eq(productImages.productId, productId));
      await tx.insert(productImages).values(
        input.images.map((image, index) => ({
          productId,
          storageKey: image.storageKey,
          altText: image.altText ?? existing.title,
          displayOrder: index,
        })),
      );
    }

    if (input.specs !== undefined) {
      await tx.delete(productSpecs).where(eq(productSpecs.productId, productId));

      if (input.specs.length > 0) {
        await tx.insert(productSpecs).values(
          input.specs.map((spec, index) => ({
            productId,
            key: spec.key,
            value: spec.value,
            displayOrder: index,
          })),
        );
      }
    }
  });

  logger.info('Ürün güncellendi', { productId });
}

/**
 * Ürün durumunu değiştirir.
 *
 * Durum makinesi geçerliliği denetler: satıştaki ürün doğrudan satılmış
 * yapılamaz, önce bir siparişe bağlanıp rezerve olmalıdır.
 *
 * Rezervasyon durumu bu uçtan değiştirilemez; o, sipariş akışının sorumluluğudur.
 */
export async function changeProductStatus(
  productId: string,
  newStatus: CreateProductInput['status'],
): Promise<void> {
  const existing = await repository.findById(productId);

  if (existing === null) {
    throw notFound('Ürün');
  }

  if (newStatus === 'reserved' || existing.status === 'reserved') {
    throw businessRule('Rezervasyon durumu sipariş akışıyla yönetilir; buradan değiştirilemez.');
  }

  if (!canTransitionProduct(existing.status, newStatus)) {
    throw businessRule(
      `Ürün "${existing.status}" durumundayken "${newStatus}" durumuna geçirilemez.`,
    );
  }

  await db.transaction(async (tx) => {
    await repository.updateStatuses([productId], newStatus, tx);
  });

  logger.info('Ürün durumu değişti', { productId, from: existing.status, to: newStatus });
}

/**
 * Ürünü siler.
 *
 * Yumuşak silme: sipariş geçmişindeki referanslar bozulmasın diye satır kalır.
 * Satılmış veya rezerve ürün silinemez.
 */
export async function deleteProduct(productId: string): Promise<void> {
  const existing = await repository.findById(productId);

  if (existing === null) {
    throw notFound('Ürün');
  }

  if (existing.status === 'reserved' || existing.status === 'sold') {
    throw businessRule(
      'Siparişe bağlı veya satılmış ürün silinemez. Bunun yerine depoya alabilirsiniz.',
    );
  }

  await db.update(products).set({ deletedAt: new Date() }).where(eq(products.id, productId));

  logger.info('Ürün silindi', { productId });
}

// ---------------------------------------------------------------------------
// Satış talebinden dönüştürme — servicing modülünün kullandığı yol
// ---------------------------------------------------------------------------

export interface CreateFromSellRequestInput {
  readonly title: string;
  readonly description: string;
  readonly priceKurus: number;
  readonly categoryId: string;
  readonly brandId: string | null;
  readonly condition: ProductCondition;
  readonly warrantyMonths: number;
  /** Talep fotoğrafları; ürün görseli olarak kopyalanır. */
  readonly imageStorageKeys: readonly string[];
}

/**
 * Kabul edilen satış talebinden katalog ürünü oluşturur.
 *
 * Ürün TASLAK olarak oluşturulur: personel görselleri ve açıklamayı gözden
 * geçirdikten sonra satışa açar. Doğrudan satışa çıkarmak, kontrol edilmemiş
 * bir ilanın vitrine düşmesi demek olurdu.
 *
 * Çağıran işlemin içinde çalışır: talep dönüşümü ve ürün oluşturma ya birlikte
 * kalıcı olur ya da hiçbiri.
 */
export async function createProductFromSellRequest(
  input: CreateFromSellRequestInput,
  tx: Transaction,
): Promise<string> {
  const slug = await generateUniqueSlug(input.title);

  const [created] = await tx
    .insert(products)
    .values({
      slug,
      title: input.title,
      description: input.description,
      priceKurus: input.priceKurus,
      condition: input.condition,
      status: 'draft',
      warrantyMonths: input.warrantyMonths,
      categoryId: input.categoryId,
      brandId: input.brandId,
    })
    .returning({ id: products.id });

  if (created === undefined) {
    throw new Error('Satış talebinden ürün oluşturulamadı.');
  }

  if (input.imageStorageKeys.length > 0) {
    await tx.insert(productImages).values(
      input.imageStorageKeys.map((storageKey, index) => ({
        productId: created.id,
        storageKey,
        altText: input.title,
        displayOrder: index,
      })),
    );
  }

  return created.id;
}
