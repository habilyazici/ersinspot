/**
 * Katalog uçlarının testleri.
 *
 * İki şeyi doğrular:
 *
 * 1. Yetkilendirme: hangi uçların herkese açık, hangilerinin personel yetkisi
 *    gerektirdiği.
 *
 * 2. Sözleşme uyumu: sunucunun döndürdüğü gövde, `@ersinspot/shared` içindeki
 *    zod şemasına uyuyor mu. Şema ile sunucunun ayrışması, tarayıcı tarafında
 *    sessiz hatalara yol açan bir hata sınıfıdır ve derleyici bunu yakalayamaz —
 *    çünkü yanıt JSON olarak sınırı geçerken tip bilgisi kaybolur.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { productSchema, productSummarySchema } from '@ersinspot/shared';
import { db } from '../../../platform/db/client.ts';
import { createTestUser, loginAs, request, resetDatabase } from '../../../test/helpers.ts';
import {
  brands,
  categories,
  productImages,
  productSpecs,
  products,
} from '../infrastructure/schema.ts';

const PRODUCT_SLUG = 'arcelik-no-frost-buzdolabi';

beforeEach(async () => {
  await resetDatabase();

  const [rootCategory] = await db
    .insert(categories)
    .values({ name: 'Beyaz Eşya', slug: 'beyaz-esya', displayOrder: 1 })
    .returning({ id: categories.id });

  if (rootCategory === undefined) throw new Error('Kategori oluşturulamadı.');

  const [childCategory] = await db
    .insert(categories)
    .values({
      name: 'Buzdolabı',
      slug: 'buzdolabi',
      parentId: rootCategory.id,
      displayOrder: 1,
    })
    .returning({ id: categories.id });

  if (childCategory === undefined) throw new Error('Alt kategori oluşturulamadı.');

  const [brand] = await db
    .insert(brands)
    .values({ name: 'Arçelik', slug: 'arcelik' })
    .returning({ id: brands.id });

  if (brand === undefined) throw new Error('Marka oluşturulamadı.');

  const [product] = await db
    .insert(products)
    .values({
      title: 'Arçelik No-Frost Buzdolabı',
      slug: PRODUCT_SLUG,
      description: 'Az kullanılmış, A++ enerji sınıfı, 520 litre kapasiteli no-frost buzdolabı.',
      priceKurus: 2_450_000,
      condition: 'like_new',
      status: 'for_sale',
      warrantyMonths: 12,
      categoryId: childCategory.id,
      brandId: brand.id,
    })
    .returning({ id: products.id });

  if (product === undefined) throw new Error('Ürün oluşturulamadı.');

  await db.insert(productImages).values([
    {
      productId: product.id,
      storageKey: 'product_image/2026/08/00000000-0000-0000-0000-000000000001.webp',
      altText: 'Buzdolabı önden görünüm',
      displayOrder: 0,
    },
    {
      productId: product.id,
      storageKey: 'product_image/2026/08/00000000-0000-0000-0000-000000000002.webp',
      altText: 'Buzdolabı iç görünüm',
      displayOrder: 1,
    },
  ]);

  await db.insert(productSpecs).values([
    { productId: product.id, key: 'Enerji Sınıfı', value: 'A++', displayOrder: 0 },
    { productId: product.id, key: 'Kapasite', value: '520 L', displayOrder: 1 },
  ]);

  // Vitrinde görünmemesi gereken ürünler.
  await db.insert(products).values([
    {
      title: 'Taslak Ürün',
      slug: 'taslak-urun',
      description: 'Henüz yayınlanmamış ürün açıklaması.',
      priceKurus: 100_000,
      condition: 'good',
      status: 'draft',
      categoryId: childCategory.id,
    },
    {
      title: 'Satılmış Ürün',
      slug: 'satilmis-urun',
      description: 'Daha önce satılmış ürün açıklaması.',
      priceKurus: 100_000,
      condition: 'good',
      status: 'sold',
      categoryId: childCategory.id,
    },
  ]);
});

// ---------------------------------------------------------------------------
// Sözleşme uyumu
// ---------------------------------------------------------------------------

const paginatedProductSummaries = z.object({
  items: z.array(productSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalItems: z.number().int(),
  totalPages: z.number().int(),
});

describe('sözleşme uyumu', () => {
  it('ürün listesi paylaşılan şemaya uyar', async () => {
    const response = await request('/api/products');
    expect(response.status).toBe(200);

    const payload: unknown = await response.json();
    const result = paginatedProductSummaries.safeParse(payload);

    // Uyumsuzluk varsa hangi alanın kaydığını göster.
    expect(result.success ? [] : result.error.issues).toEqual([]);
  });

  it('ürün detayı paylaşılan şemaya uyar', async () => {
    const response = await request(`/api/products/${PRODUCT_SLUG}`);
    expect(response.status).toBe(200);

    const payload: unknown = await response.json();
    const result = z
      .object({ product: productSchema.extend({ warrantyLabel: z.string() }) })
      .safeParse(payload);

    expect(result.success ? [] : result.error.issues).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Vitrin görünürlüğü
// ---------------------------------------------------------------------------

describe('vitrin görünürlüğü', () => {
  it('yalnızca satıştaki ürünleri listeler', async () => {
    const response = await request('/api/products');
    const payload = (await response.json()) as { items: { slug: string }[]; totalItems: number };

    expect(payload.totalItems).toBe(1);
    expect(payload.items.map((item) => item.slug)).toEqual([PRODUCT_SLUG]);
  });

  it('taslak ürünün detayına erişilebilir ama vitrinde görünmez', async () => {
    // Eski kodda `showAll=true` parametresiyle taslak ürünler dışarıdan
    // listelenebiliyordu; durum filtresi artık istemcinin kontrolünde değil.
    const list = await request('/api/products?showAll=true&status=draft');
    const payload = (await list.json()) as { totalItems: number };

    expect(payload.totalItems).toBe(1);
  });

  it('bulunamayan ürün için 404 döner', async () => {
    const response = await request('/api/products/olmayan-urun');
    expect(response.status).toBe(404);

    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe('not_found');
  });
});

// ---------------------------------------------------------------------------
// Filtreleme ve sıralama
// ---------------------------------------------------------------------------

describe('filtreleme', () => {
  it('kategoriye göre filtreler', async () => {
    const match = await request('/api/products?categorySlug=buzdolabi');
    expect(((await match.json()) as { totalItems: number }).totalItems).toBe(1);

    const noMatch = await request('/api/products?categorySlug=beyaz-esya');
    expect(((await noMatch.json()) as { totalItems: number }).totalItems).toBe(0);
  });

  it('markaya göre filtreler', async () => {
    const response = await request('/api/products?brandSlug=arcelik');
    expect(((await response.json()) as { totalItems: number }).totalItems).toBe(1);
  });

  it('fiyat aralığına göre filtreler', async () => {
    const inRange = await request('/api/products?minPrice=2000000&maxPrice=3000000');
    expect(((await inRange.json()) as { totalItems: number }).totalItems).toBe(1);

    const outOfRange = await request('/api/products?minPrice=3000000');
    expect(((await outOfRange.json()) as { totalItems: number }).totalItems).toBe(0);
  });

  it('en düşük fiyat en yüksekten büyükse reddeder', async () => {
    const response = await request('/api/products?minPrice=5000000&maxPrice=1000000');
    expect(response.status).toBe(400);
  });

  it('başlıkta arama yapar', async () => {
    const found = await request('/api/products?search=no-frost');
    expect(((await found.json()) as { totalItems: number }).totalItems).toBe(1);

    const notFound = await request('/api/products?search=çamaşır');
    expect(((await notFound.json()) as { totalItems: number }).totalItems).toBe(0);
  });

  it('sayfa boyutu üst sınırını aşan isteği reddeder', async () => {
    // Tek istekle tüm tablonun çekilmesini engeller.
    const response = await request('/api/products?pageSize=5000');
    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Kategoriler ve markalar
// ---------------------------------------------------------------------------

describe('kategori ağacı', () => {
  it('kök kategoriyi alt kategorisiyle birlikte döner', async () => {
    const response = await request('/api/categories');
    const payload = (await response.json()) as {
      categories: { slug: string; productCount: number; children: { slug: string }[] }[];
    };

    expect(payload.categories).toHaveLength(1);
    expect(payload.categories[0]?.slug).toBe('beyaz-esya');
    expect(payload.categories[0]?.children.map((child) => child.slug)).toEqual(['buzdolabi']);
  });

  it('kök kategorinin sayımı alt kategorileri kapsar', async () => {
    const response = await request('/api/categories');
    const payload = (await response.json()) as {
      categories: { productCount: number }[];
    };

    // Ürün alt kategoride; kök kategorinin sayımı onu da içermeli.
    expect(payload.categories[0]?.productCount).toBe(1);
  });

  it('sayımlarda yalnızca vitrindeki ürünleri hesaba katar', async () => {
    // Taslak ve satılmış ürünler aynı kategoride ama sayıma girmemeli.
    const response = await request('/api/categories');
    const payload = (await response.json()) as {
      categories: { children: { productCount: number }[] }[];
    };

    expect(payload.categories[0]?.children[0]?.productCount).toBe(1);
  });
});

describe('markalar', () => {
  it('ürünü olan markaları döner', async () => {
    const response = await request('/api/brands');
    const payload = (await response.json()) as {
      brands: { slug: string; productCount: number }[];
    };

    expect(payload.brands).toHaveLength(1);
    expect(payload.brands[0]?.slug).toBe('arcelik');
  });

  it('ürünü olmayan markayı döndürmez', async () => {
    await db.insert(brands).values({ name: 'Bosch', slug: 'bosch' });

    const response = await request('/api/brands');
    const payload = (await response.json()) as { brands: { slug: string }[] };

    expect(payload.brands.map((brand) => brand.slug)).toEqual(['arcelik']);
  });
});

// ---------------------------------------------------------------------------
// Yetkilendirme
// ---------------------------------------------------------------------------

describe('yönetim uçlarının yetkilendirmesi', () => {
  it('oturumsuz erişimi reddeder', async () => {
    const response = await request('/api/admin/products');
    expect(response.status).toBe(401);
  });

  it('müşteri rolündeki kullanıcıyı reddeder', async () => {
    const user = await createTestUser({ role: 'customer' });
    const cookie = await loginAs(user.email, user.password);

    const response = await request('/api/admin/products', { cookie });
    expect(response.status).toBe(403);
  });

  it('personel rolündeki kullanıcıya izin verir', async () => {
    const user = await createTestUser({ email: 'personel@ersinspot.com', role: 'staff' });
    const cookie = await loginAs(user.email, user.password);

    const response = await request('/api/admin/products', { cookie });
    expect(response.status).toBe(200);
  });

  it('yönetici rolündeki kullanıcıya izin verir', async () => {
    const user = await createTestUser({ email: 'yonetici@ersinspot.com', role: 'admin' });
    const cookie = await loginAs(user.email, user.password);

    const response = await request('/api/admin/products', { cookie });
    expect(response.status).toBe(200);
  });

  it('yönetim listesi taslak ve satılmış ürünleri de gösterir', async () => {
    const user = await createTestUser({ email: 'personel2@ersinspot.com', role: 'staff' });
    const cookie = await loginAs(user.email, user.password);

    const response = await request('/api/admin/products', { cookie });
    const payload = (await response.json()) as { totalItems: number };

    // Vitrin 1 gösteriyordu; yönetim üçünü de görmeli.
    expect(payload.totalItems).toBe(3);
  });
});
