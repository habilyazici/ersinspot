/**
 * Envanter sözleşmesinin entegrasyon testleri.
 *
 * Bu dosya, denetimde bulunan iki kritik davranışı doğrular:
 *
 * 1. Fiyat daima veritabanından okunur — istemcinin gönderdiği değer değil.
 * 2. Tekil ürünler iki kez satılamaz; eşzamanlı sipariş denemelerinden yalnızca
 *    biri başarılı olur.
 *
 * İkincisi ancak gerçek bir veritabanında, gerçek işlemlerle sınanabilir; sahte
 * veritabanıyla kilit davranışı görünmez.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../../../platform/db/client.ts';
import { isAppError } from '../../../platform/errors/index.ts';
import { categories, products } from '../infrastructure/schema.ts';
import { resetDatabase } from '../../../test/helpers.ts';
import {
  getPurchasableProducts,
  markProductsAsSold,
  releaseProducts,
  reserveProducts,
} from './inventory-service.ts';
import type { ProductStatus } from '@ersinspot/shared';

let categoryId: string;

beforeEach(async () => {
  await resetDatabase();

  const [category] = await db
    .insert(categories)
    .values({ name: 'Beyaz Eşya', slug: 'beyaz-esya' })
    .returning({ id: categories.id });

  if (category === undefined) throw new Error('Kategori oluşturulamadı.');
  categoryId = category.id;
});

async function createProduct(options?: {
  title?: string;
  priceKurus?: number;
  status?: ProductStatus;
}): Promise<string> {
  const title = options?.title ?? 'Test Buzdolabı';
  const [created] = await db
    .insert(products)
    .values({
      title,
      slug: `${title.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 8)}`,
      description: 'Test amaçlı ürün açıklaması.',
      priceKurus: options?.priceKurus ?? 2_500_000,
      condition: 'good',
      status: options?.status ?? 'for_sale',
      // Veritabanı kısıtı, rezerve ürünün süre bitişi olmasını zorunlu kılar.
      reservedUntil:
        (options?.status ?? 'for_sale') === 'reserved'
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          : null,
      categoryId,
    })
    .returning({ id: products.id });

  if (created === undefined) throw new Error('Ürün oluşturulamadı.');
  return created.id;
}

async function statusOf(productId: string): Promise<ProductStatus> {
  const rows = await db
    .select({ status: products.status })
    .from(products)
    .where(eq(products.id, productId));

  const status = rows[0]?.status;
  if (status === undefined) throw new Error('Ürün bulunamadı.');
  return status;
}

// ---------------------------------------------------------------------------
// Fiyatın kaynağı
// ---------------------------------------------------------------------------

describe('fiyat kaynağı', () => {
  it('fiyatı veritabanından okur', async () => {
    const productId = await createProduct({ priceKurus: 4_999_00 });

    const [product] = await db.transaction(async (tx) => getPurchasableProducts([productId], tx));

    expect(product?.price).toBe(4_999_00);
  });

  it('ürün fiyatı değiştiğinde yeni fiyatı döndürür', async () => {
    const productId = await createProduct({ priceKurus: 1_000_00 });

    await db.update(products).set({ priceKurus: 1_500_00 }).where(eq(products.id, productId));

    const [product] = await db.transaction(async (tx) => getPurchasableProducts([productId], tx));

    expect(product?.price).toBe(1_500_00);
  });

  it('bulunamayan ürünleri sonuçta döndürmez', async () => {
    const existing = await createProduct();
    const missing = '00000000-0000-0000-0000-000000000000';

    const result = await db.transaction(async (tx) =>
      getPurchasableProducts([existing, missing], tx),
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(existing);
  });

  it('boş listede boş sonuç döner', async () => {
    const result = await db.transaction(async (tx) => getPurchasableProducts([], tx));
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Satılabilirlik
// ---------------------------------------------------------------------------

describe('satılabilirlik', () => {
  it('satıştaki ürünü satılabilir işaretler', async () => {
    const productId = await createProduct({ status: 'for_sale' });

    const [product] = await db.transaction(async (tx) => getPurchasableProducts([productId], tx));

    expect(product?.isPurchasable).toBe(true);
  });

  it('taslak, depodaki, rezerve ve satılmış ürünleri satılamaz işaretler', async () => {
    for (const status of ['draft', 'in_storage', 'reserved', 'sold'] as const) {
      const productId = await createProduct({ status });

      const [product] = await db.transaction(async (tx) => getPurchasableProducts([productId], tx));

      expect(product?.isPurchasable, `durum: ${status}`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Rezervasyon
// ---------------------------------------------------------------------------

describe('rezervasyon', () => {
  it('satıştaki ürünü rezerve eder', async () => {
    const productId = await createProduct({ status: 'for_sale' });

    await db.transaction(async (tx) => {
      const items = await getPurchasableProducts([productId], tx);
      await reserveProducts(items, tx);
    });

    expect(await statusOf(productId)).toBe('reserved');
  });

  it('satılmış ürünü rezerve etmeyi reddeder', async () => {
    const productId = await createProduct({ status: 'sold' });

    const attempt = db.transaction(async (tx) => {
      const items = await getPurchasableProducts([productId], tx);
      await reserveProducts(items, tx);
    });

    await expect(attempt).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === 'product_unavailable',
    );
  });

  it('bir ürün uygun değilse hiçbirini rezerve etmez', async () => {
    const available = await createProduct({ title: 'Uygun', status: 'for_sale' });
    const unavailable = await createProduct({ title: 'Satılmış', status: 'sold' });

    const attempt = db.transaction(async (tx) => {
      const items = await getPurchasableProducts([available, unavailable], tx);
      await reserveProducts(items, tx);
    });

    await expect(attempt).rejects.toThrow();

    // İşlem geri alındığı için uygun ürün de rezerve edilmemiş olmalı.
    expect(await statusOf(available)).toBe('for_sale');
  });

  it('hata mesajında ürün adını belirtir', async () => {
    const productId = await createProduct({ title: 'Arçelik Buzdolabı', status: 'sold' });

    const attempt = db.transaction(async (tx) => {
      const items = await getPurchasableProducts([productId], tx);
      await reserveProducts(items, tx);
    });

    await expect(attempt).rejects.toThrow(/Arçelik Buzdolabı/);
  });
});

// ---------------------------------------------------------------------------
// Eşzamanlılık — çift satış koruması
// ---------------------------------------------------------------------------

describe('eşzamanlı sipariş', () => {
  it('aynı tekil ürünü iki kez satmaz', async () => {
    const productId = await createProduct({ status: 'for_sale' });

    /*
     * İki işlem aynı anda aynı ürünü rezerve etmeye çalışır.
     *
     * `FOR UPDATE` kilidi sayesinde ikinci işlem, ilki tamamlanana kadar satırı
     * okuyamaz. İlk işlem ürünü `reserved` yaptıktan sonra ikincisi ürünü bu
     * durumda görür ve reddedilir.
     *
     * Kilit olmasaydı her iki işlem de ürünü `for_sale` görür ve ikisi de
     * başarılı olurdu — aynı buzdolabı iki müşteriye satılırdı.
     */
    const attemptReserve = async (): Promise<'başarılı' | 'reddedildi'> => {
      try {
        await db.transaction(async (tx) => {
          const items = await getPurchasableProducts([productId], tx);
          await reserveProducts(items, tx);
        });
        return 'başarılı';
      } catch {
        return 'reddedildi';
      }
    };

    const results = await Promise.all([attemptReserve(), attemptReserve()]);

    const successCount = results.filter((result) => result === 'başarılı').length;

    expect(successCount).toBe(1);
    expect(await statusOf(productId)).toBe('reserved');
  });

  it('beş eşzamanlı denemeden yalnızca biri başarılı olur', async () => {
    const productId = await createProduct({ status: 'for_sale' });

    const attemptReserve = async (): Promise<boolean> => {
      try {
        await db.transaction(async (tx) => {
          const items = await getPurchasableProducts([productId], tx);
          await reserveProducts(items, tx);
        });
        return true;
      } catch {
        return false;
      }
    };

    const results = await Promise.all(Array.from({ length: 5 }, () => attemptReserve()));

    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Rezervasyonun çözülmesi
// ---------------------------------------------------------------------------

describe('rezervasyonun çözülmesi', () => {
  it('iptal edilen siparişte ürünü satışa döndürür', async () => {
    const productId = await createProduct({ status: 'reserved' });

    const released = await db.transaction(async (tx) => releaseProducts([productId], tx));

    expect(released).toBe(1);
    expect(await statusOf(productId)).toBe('for_sale');
  });

  it('satılmış ürünü satışa döndürmez', async () => {
    const productId = await createProduct({ status: 'sold' });

    const released = await db.transaction(async (tx) => releaseProducts([productId], tx));

    expect(released).toBe(0);
    expect(await statusOf(productId)).toBe('sold');
  });
});

describe('satışın tamamlanması', () => {
  it('rezerve ürünü satıldı yapar', async () => {
    const productId = await createProduct({ status: 'reserved' });

    const sold = await db.transaction(async (tx) => markProductsAsSold([productId], tx));

    expect(sold).toBe(1);
    expect(await statusOf(productId)).toBe('sold');
  });

  it('rezerve edilmemiş ürünü satıldı yapmaz', async () => {
    // Ürün bir siparişe bağlanmadan satılmış görünemez.
    const productId = await createProduct({ status: 'for_sale' });

    const sold = await db.transaction(async (tx) => markProductsAsSold([productId], tx));

    expect(sold).toBe(0);
    expect(await statusOf(productId)).toBe('for_sale');
  });
});
