/**
 * Sepet ve sipariş uçlarının testleri.
 *
 * Bu dosyanın en önemli bölümü "fiyat manipülasyonu": denetimde bulunan en ciddi
 * mali açığın kapandığını kanıtlar. Eski kod tabanında sipariş toplamı istemcinin
 * gönderdiği fiyatlardan hesaplanıyordu ve herhangi bir ürün 1 TL'ye sipariş
 * edilebiliyordu.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../../../platform/db/client.ts';
import { createTestUser, loginAs, request, resetDatabase } from '../../../test/helpers.ts';
import {
  brands,
  categories,
  productImages,
  products,
} from '../../catalog/infrastructure/schema.ts';
import { orderItems, orders } from '../infrastructure/schema.ts';
import { cancelExpiredUnpaidOrders } from '../index.ts';

/**
 * Ürün fiyatı, ücretsiz teslimat eşiğinin (15.000 TL) ALTINDA seçilmiştir ki
 * teslimat ücretinin hesaba katıldığı doğrulanabilsin. Eşiğin üstü için ayrı
 * bir test var.
 */
const PRICE = 1_000_000; // 10.000,00 TL
const DELIVERY_FEE = 50_000; // 500,00 TL

let categoryId: string;
let productId: string;
let customerCookie: string;
let customerId: string;

/** Adrese teslimat için geçerli bir sipariş gövdesi üretir. */
function orderPayload(overrides?: Record<string, unknown>) {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 3);
  const date = tomorrow.toISOString().slice(0, 10);

  return {
    contact: { fullName: 'Ayşe Yılmaz', phone: '0507 194 05 50' },
    delivery: {
      method: 'home_delivery',
      address: {
        district: 'Bornova',
        neighborhood: 'Kazımdirik',
        street: 'Üniversite Caddesi',
        buildingNo: '12',
      },
      deliveryDate: date,
      deliveryTimeSlot: { startTime: '09:00', endTime: '11:00' },
    },
    paymentMethod: 'cash_on_delivery',
    expectedTotal: PRICE + DELIVERY_FEE,
    ...overrides,
  };
}

async function addToCart(cookie: string, id: string): Promise<Response> {
  return request('/api/cart', {
    method: 'POST',
    cookie,
    body: JSON.stringify({ productId: id, quantity: 1 }),
  });
}

beforeEach(async () => {
  await resetDatabase();

  const [category] = await db
    .insert(categories)
    .values({ name: 'Beyaz Eşya', slug: 'beyaz-esya' })
    .returning({ id: categories.id });
  if (category === undefined) throw new Error('Kategori oluşturulamadı.');
  categoryId = category.id;

  const [brand] = await db
    .insert(brands)
    .values({ name: 'Arçelik', slug: 'arcelik' })
    .returning({ id: brands.id });
  if (brand === undefined) throw new Error('Marka oluşturulamadı.');

  const [product] = await db
    .insert(products)
    .values({
      title: 'Arçelik No-Frost Buzdolabı',
      slug: 'arcelik-no-frost-buzdolabi',
      description: 'Az kullanılmış, A++ enerji sınıfı buzdolabı.',
      priceKurus: PRICE,
      condition: 'like_new',
      status: 'for_sale',
      categoryId,
      brandId: brand.id,
    })
    .returning({ id: products.id });
  if (product === undefined) throw new Error('Ürün oluşturulamadı.');
  productId = product.id;

  await db.insert(productImages).values({
    productId,
    storageKey: 'product_image/2026/08/00000000-0000-0000-0000-000000000001.webp',
    altText: 'Buzdolabı',
    displayOrder: 0,
  });

  const user = await createTestUser({ email: 'musteri@ornek.com' });
  customerId = user.id;
  customerCookie = await loginAs(user.email, user.password);
});

// ═══════════════════════════════════════════════════════════════════════════
// FİYAT MANİPÜLASYONU — denetimdeki en ciddi mali açık
// ═══════════════════════════════════════════════════════════════════════════

describe('fiyat manipülasyonu', () => {
  it('sipariş şeması hiçbir fiyat alanı kabul etmez', async () => {
    await addToCart(customerCookie, productId);

    /*
     * Saldırganın eski kodda işe yarayan girişimi: kalemlere kendi fiyatını
     * yazmak. Yeni şemada `items` alanı yoktur — sepet sunucuda tutulur ve
     * fiyat oradan bile gelmez.
     */
    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(
        orderPayload({
          items: [{ productId, price: 100, quantity: 1 }],
          subtotal: 100,
          total: 100,
        }),
      ),
    });

    expect(response.status).toBe(201);

    // Gönderilen sahte fiyatlar tamamen yok sayılmalı.
    const [order] = await db
      .select({ subtotal: orders.subtotalKurus, total: orders.totalKurus })
      .from(orders);

    expect(order?.subtotal).toBe(PRICE);
    expect(order?.total).toBe(PRICE + DELIVERY_FEE);
  });

  it('kalem birim fiyatını veritabanından yazar', async () => {
    await addToCart(customerCookie, productId);
    await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });

    const [item] = await db
      .select({ unitPrice: orderItems.unitPriceKurus, lineTotal: orderItems.lineTotalKurus })
      .from(orderItems);

    expect(item?.unitPrice).toBe(PRICE);
    expect(item?.lineTotal).toBe(PRICE);
  });

  it('istemcinin beklediği tutar uyuşmazsa siparişi reddeder', async () => {
    await addToCart(customerCookie, productId);

    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload({ expectedTotal: 100 })),
    });

    expect(response.status).toBe(409);

    const payload = (await response.json()) as { error: { code: string; message: string } };
    expect(payload.error.code).toBe('resource_conflict');
    // Kullanıcıya güncel tutar bildirilmeli.
    expect(payload.error.message).toContain('10.500');
  });

  it('ürün fiyatı sepetteyken değişirse siparişi reddeder', async () => {
    await addToCart(customerCookie, productId);

    // Yönetici fiyatı güncelledi.
    await db.update(products).set({ priceKurus: 1_200_000 }).where(eq(products.id, productId));

    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });

    // Kullanıcının onayladığı fiyattan farklı tutar tahsil edilmemeli.
    expect(response.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// Sepet
// ---------------------------------------------------------------------------

describe('sepet', () => {
  it('oturum gerektirir', async () => {
    expect((await request('/api/cart')).status).toBe(401);
    expect(
      (
        await request('/api/cart', {
          method: 'POST',
          body: JSON.stringify({ productId, quantity: 1 }),
        })
      ).status,
    ).toBe(401);
  });

  it('ürün ekler ve güncel fiyatla döner', async () => {
    const response = await addToCart(customerCookie, productId);
    expect(response.status).toBe(201);

    const payload = (await response.json()) as {
      cart: { items: { unitPrice: number; isAvailable: boolean }[]; subtotal: number };
    };

    expect(payload.cart.items).toHaveLength(1);
    expect(payload.cart.items[0]?.unitPrice).toBe(PRICE);
    expect(payload.cart.subtotal).toBe(PRICE);
  });

  it('sepet fiyatı saklamaz; ürün fiyatı değişince günceli gösterir', async () => {
    await addToCart(customerCookie, productId);
    await db.update(products).set({ priceKurus: 1_750_000 }).where(eq(products.id, productId));

    const response = await request('/api/cart', { cookie: customerCookie });
    const payload = (await response.json()) as { cart: { subtotal: number } };

    expect(payload.cart.subtotal).toBe(1_750_000);
  });

  it('satışta olmayan ürünü eklemeyi reddeder', async () => {
    await db.update(products).set({ status: 'sold' }).where(eq(products.id, productId));

    const response = await addToCart(customerCookie, productId);
    expect(response.status).toBe(400);
  });

  it('aynı ürünü iki kez eklerse tek satır kalır', async () => {
    await addToCart(customerCookie, productId);
    await addToCart(customerCookie, productId);

    const response = await request('/api/cart', { cookie: customerCookie });
    const payload = (await response.json()) as { cart: { items: unknown[] } };

    expect(payload.cart.items).toHaveLength(1);
  });

  it('ürünü sepetten çıkarır', async () => {
    await addToCart(customerCookie, productId);

    const response = await request(`/api/cart/${productId}`, {
      method: 'DELETE',
      cookie: customerCookie,
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { cart: { items: unknown[] } };
    expect(payload.cart.items).toHaveLength(0);
  });

  it('sepette olmayan ürünü çıkarmayı reddeder', async () => {
    const response = await request(`/api/cart/${productId}`, {
      method: 'DELETE',
      cookie: customerCookie,
    });

    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Sipariş oluşturma
// ---------------------------------------------------------------------------

describe('sipariş oluşturma', () => {
  it('boş sepetle sipariş vermeyi reddeder', async () => {
    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload({ expectedTotal: 0 })),
    });

    expect(response.status).toBe(400);
  });

  it('sipariş sonrası sepeti boşaltır', async () => {
    await addToCart(customerCookie, productId);
    await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });

    const cart = await request('/api/cart', { cookie: customerCookie });
    const payload = (await cart.json()) as { cart: { items: unknown[] } };

    expect(payload.cart.items).toHaveLength(0);
  });

  it('ürünü rezerve eder ve süre bitişi belirler', async () => {
    await addToCart(customerCookie, productId);
    await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });

    const [product] = await db
      .select({ status: products.status, reservedUntil: products.reservedUntil })
      .from(products)
      .where(eq(products.id, productId));

    expect(product?.status).toBe('reserved');
    expect(product?.reservedUntil).not.toBeNull();
  });

  it('rezerve ürün başkasının sepetinden sipariş edilemez', async () => {
    // İki müşteri de ürünü sepetine ekliyor.
    const other = await createTestUser({ email: 'diger@ornek.com' });
    const otherCookie = await loginAs(other.email, other.password);

    await addToCart(customerCookie, productId);
    await addToCart(otherCookie, productId);

    const first = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });
    expect(first.status).toBe(201);

    // İkinci müşteri aynı tekil ürünü sipariş edemez.
    const second = await request('/api/orders', {
      method: 'POST',
      cookie: otherCookie,
      body: JSON.stringify(orderPayload()),
    });
    expect(second.status).toBe(409);
  });

  it('takip numarası üretir', async () => {
    await addToCart(customerCookie, productId);
    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });

    const payload = (await response.json()) as { order: { referenceNumber: string } };
    expect(payload.order.referenceNumber).toMatch(/^SIP-\d{4}-\d{6}$/);
  });

  it('mağazadan teslim alımda teslimat ücreti almaz', async () => {
    await addToCart(customerCookie, productId);

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 3);

    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({
        contact: { fullName: 'Ayşe Yılmaz', phone: '0507 194 05 50' },
        delivery: {
          method: 'store_pickup',
          pickupDate: tomorrow.toISOString().slice(0, 10),
          pickupTimeSlot: { startTime: '14:00', endTime: '16:00' },
        },
        paymentMethod: 'cash_on_delivery',
        expectedTotal: PRICE,
      }),
    });

    expect(response.status).toBe(201);

    const [order] = await db
      .select({ fee: orders.deliveryFeeKurus, total: orders.totalKurus })
      .from(orders);

    expect(order?.fee).toBe(0);
    expect(order?.total).toBe(PRICE);
  });

  it('ücretsiz teslimat eşiğinin üstünde kargo ücreti almaz', async () => {
    // Eşik 15.000 TL; 20.000 TL'lik siparişte adrese teslimat ücretsizdir.
    await db.update(products).set({ priceKurus: 2_000_000 }).where(eq(products.id, productId));
    await addToCart(customerCookie, productId);

    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload({ expectedTotal: 2_000_000 })),
    });

    expect(response.status).toBe(201);

    const [order] = await db
      .select({ fee: orders.deliveryFeeKurus, total: orders.totalKurus })
      .from(orders);

    expect(order?.fee).toBe(0);
    expect(order?.total).toBe(2_000_000);
  });

  it('Buca içi teslimatta kargo ücreti almaz', async () => {
    await addToCart(customerCookie, productId);

    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(
        orderPayload({
          delivery: {
            method: 'home_delivery',
            address: {
              district: 'Buca',
              neighborhood: 'Menderes',
              street: 'Cadde',
              buildingNo: '5',
            },
            deliveryDate: orderPayload().delivery.deliveryDate,
            deliveryTimeSlot: { startTime: '09:00', endTime: '11:00' },
          },
          expectedTotal: PRICE,
        }),
      ),
    });

    expect(response.status).toBe(201);

    const [order] = await db.select({ fee: orders.deliveryFeeKurus }).from(orders);
    expect(order?.fee).toBe(0);
  });

  it('havale seçilirse ödeme kaydını beklemede açar', async () => {
    await addToCart(customerCookie, productId);
    await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload({ paymentMethod: 'bank_transfer' })),
    });

    const [order] = await db.select({ status: orders.status }).from(orders);
    expect(order?.status).toBe('pending_payment');
  });
});

// ---------------------------------------------------------------------------
// Erişim yetkisi (IDOR)
// ---------------------------------------------------------------------------

describe('sipariş erişimi', () => {
  async function createOrderAs(cookie: string): Promise<string> {
    await addToCart(cookie, productId);
    const response = await request('/api/orders', {
      method: 'POST',
      cookie,
      body: JSON.stringify(orderPayload()),
    });
    const payload = (await response.json()) as { order: { orderId: string } };
    return payload.order.orderId;
  }

  it('müşteri kendi siparişini görebilir', async () => {
    const orderId = await createOrderAs(customerCookie);

    const response = await request(`/api/orders/${orderId}`, { cookie: customerCookie });
    expect(response.status).toBe(200);
  });

  it('müşteri başkasının siparişini göremez', async () => {
    // Eski kodda /orders/customer/:email ucu sahiplik kontrolü hiç yapmıyordu.
    const orderId = await createOrderAs(customerCookie);

    const other = await createTestUser({ email: 'diger@ornek.com' });
    const otherCookie = await loginAs(other.email, other.password);

    const response = await request(`/api/orders/${orderId}`, { cookie: otherCookie });
    expect(response.status).toBe(403);
  });

  it('personel tüm siparişleri görebilir', async () => {
    const orderId = await createOrderAs(customerCookie);

    const staff = await createTestUser({ email: 'personel@ersinspot.com', role: 'staff' });
    const staffCookie = await loginAs(staff.email, staff.password);

    const response = await request(`/api/orders/${orderId}`, { cookie: staffCookie });
    expect(response.status).toBe(200);
  });

  it('personel notu müşteri yanıtında görünmez', async () => {
    const orderId = await createOrderAs(customerCookie);

    await db
      .update(orders)
      .set({ staffNote: 'Müşteri telefonla arandı, gizli not' })
      .where(eq(orders.id, orderId));

    const response = await request(`/api/orders/${orderId}`, { cookie: customerCookie });
    const text = await response.text();

    expect(text).not.toContain('gizli not');
  });

  it('müşteri yalnızca kendi siparişlerini listeler', async () => {
    await createOrderAs(customerCookie);

    const other = await createTestUser({ email: 'diger@ornek.com' });
    const otherCookie = await loginAs(other.email, other.password);

    const response = await request('/api/orders', { cookie: otherCookie });
    const payload = (await response.json()) as { totalItems: number };

    expect(payload.totalItems).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Sipariş takibi (oturumsuz)
// ---------------------------------------------------------------------------

describe('takip numarasıyla sorgulama', () => {
  it('gerçek siparişin durumunu döner', async () => {
    // Eski sitede bu özellik tamamen sahte veriyle çalışıyordu; gerçek bir
    // müşteri kendi numarasını girdiğinde "bulunamadı" alıyordu.
    await addToCart(customerCookie, productId);
    const created = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });
    const { order } = (await created.json()) as { order: { referenceNumber: string } };

    const response = await request(`/api/order-tracking/${order.referenceNumber}`);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      order: { status: string; itemCount: number; timeline: unknown[] };
    };

    expect(payload.order.status).toBe('received');
    expect(payload.order.itemCount).toBe(1);
    expect(payload.order.timeline).toHaveLength(1);
  });

  it('kişisel veri döndürmez', async () => {
    await addToCart(customerCookie, productId);
    const created = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });
    const { order } = (await created.json()) as { order: { referenceNumber: string } };

    const response = await request(`/api/order-tracking/${order.referenceNumber}`);
    const text = await response.text();

    // Oturumsuz uçta ad, telefon ve adres yer almamalı.
    expect(text).not.toContain('Ayşe');
    expect(text).not.toContain('905071940550');
    expect(text).not.toContain('Kazımdirik');
  });

  it('geçersiz biçimdeki numarayı veritabanına gitmeden reddeder', async () => {
    const response = await request('/api/order-tracking/RASTGELE');
    expect(response.status).toBe(400);
  });

  it('bulunamayan numara için 404 döner', async () => {
    const response = await request('/api/order-tracking/SIP-2026-999999');
    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// İptal ve durum değişikliği
// ---------------------------------------------------------------------------

describe('sipariş iptali', () => {
  async function createOrder(): Promise<string> {
    await addToCart(customerCookie, productId);
    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });
    const payload = (await response.json()) as { order: { orderId: string } };
    return payload.order.orderId;
  }

  it('müşteri kendi siparişini iptal edebilir ve ürün satışa döner', async () => {
    const orderId = await createOrder();

    const response = await request(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ reason: 'Vazgeçtim' }),
    });

    expect(response.status).toBe(200);

    const [product] = await db
      .select({ status: products.status, reservedUntil: products.reservedUntil })
      .from(products)
      .where(eq(products.id, productId));

    expect(product?.status).toBe('for_sale');
    expect(product?.reservedUntil).toBeNull();
  });

  it('müşteri başkasının siparişini iptal edemez', async () => {
    const orderId = await createOrder();

    const other = await createTestUser({ email: 'diger@ornek.com' });
    const otherCookie = await loginAs(other.email, other.password);

    const response = await request(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      cookie: otherCookie,
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(403);
  });

  it('hazırlığa geçmiş siparişi müşteri iptal edemez', async () => {
    const orderId = await createOrder();

    const staff = await createTestUser({ email: 'personel@ersinspot.com', role: 'staff' });
    const staffCookie = await loginAs(staff.email, staff.password);

    await request(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      cookie: staffCookie,
      body: JSON.stringify({ status: 'preparing' }),
    });

    const response = await request(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
  });
});

describe('durum değişikliği', () => {
  async function setup(): Promise<{ orderId: string; staffCookie: string }> {
    await addToCart(customerCookie, productId);
    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });
    const payload = (await response.json()) as { order: { orderId: string } };

    const staff = await createTestUser({ email: 'personel@ersinspot.com', role: 'staff' });
    const staffCookie = await loginAs(staff.email, staff.password);

    return { orderId: payload.order.orderId, staffCookie };
  }

  it('müşteri durum değiştiremez', async () => {
    const { orderId } = await setup();

    const response = await request(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      cookie: customerCookie,
      body: JSON.stringify({ status: 'delivered' }),
    });

    expect(response.status).toBe(403);
  });

  it('geçersiz geçişi reddeder', async () => {
    const { orderId, staffCookie } = await setup();

    // received → delivered doğrudan geçilemez; arada hazırlık ve sevkiyat var.
    const response = await request(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      cookie: staffCookie,
      body: JSON.stringify({ status: 'delivered' }),
    });

    expect(response.status).toBe(400);

    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe('invalid_state_transition');
  });

  it('teslimat tamamlandığında ürünü satıldı yapar', async () => {
    const { orderId, staffCookie } = await setup();

    for (const status of ['preparing', 'shipped', 'delivered'] as const) {
      const response = await request(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        cookie: staffCookie,
        body: JSON.stringify({ status }),
      });
      expect(response.status, `geçiş: ${status}`).toBe(200);
    }

    const [product] = await db
      .select({ status: products.status })
      .from(products)
      .where(eq(products.id, productId));

    expect(product?.status).toBe('sold');
  });

  it('her durum değişikliğini zaman çizelgesine yazar', async () => {
    const { orderId, staffCookie } = await setup();

    await request(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      cookie: staffCookie,
      body: JSON.stringify({ status: 'preparing', note: 'Depodan alındı' }),
    });

    const response = await request(`/api/orders/${orderId}`, { cookie: customerCookie });
    const payload = (await response.json()) as {
      order: { timeline: { status: string; note: string | null }[] };
    };

    expect(payload.order.timeline).toHaveLength(2);
    expect(payload.order.timeline[1]?.status).toBe('preparing');
    expect(payload.order.timeline[1]?.note).toBe('Depodan alındı');
  });
});

// ---------------------------------------------------------------------------
// Kullanıcı kimliğinin doğru bağlanması
// ---------------------------------------------------------------------------

describe('sipariş sahipliği', () => {
  it('siparişi oturum sahibine bağlar', async () => {
    await addToCart(customerCookie, productId);
    await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });

    const [order] = await db.select({ userId: orders.userId }).from(orders);
    expect(order?.userId).toBe(customerId);
  });
});

// ---------------------------------------------------------------------------
// Favoriler
// ---------------------------------------------------------------------------

describe('favoriler', () => {
  it('oturum gerektirir', async () => {
    for (const [path, init] of [
      ['/api/favorites', {}],
      ['/api/favorites', { method: 'POST', body: JSON.stringify({ productId }) }],
    ] as const) {
      const response = await request(path, init);
      expect(response.status).toBe(401);
    }
  });

  it('ekler, listeler ve çıkarır', async () => {
    const added = await request('/api/favorites', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ productId }),
    });

    expect(added.status).toBe(200);
    expect(await added.json()).toEqual({ isFavorite: true });

    const list = await request('/api/favorites', { cookie: customerCookie });
    const listed = (await list.json()) as { products: { id: string }[] };
    expect(listed.products.map((product) => product.id)).toEqual([productId]);

    const removed = await request('/api/favorites', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ productId }),
    });

    expect(await removed.json()).toEqual({ isFavorite: false });

    const empty = await request('/api/favorites', { cookie: customerCookie });
    expect(((await empty.json()) as { products: unknown[] }).products).toEqual([]);
  });

  it('favori sayacını veritabanı tetikleyicisi günceller', async () => {
    await request('/api/favorites', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ productId }),
    });

    const [row] = await db
      .select({ favoriteCount: products.favoriteCount })
      .from(products)
      .where(eq(products.id, productId));

    expect(row?.favoriteCount).toBe(1);
  });

  it('listedeki ürünlerin durumunu tek istekte döndürür', async () => {
    await request('/api/favorites', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ productId }),
    });

    const response = await request(`/api/favorites/status?productIds=${productId}`, {
      cookie: customerCookie,
    });

    expect(await response.json()).toEqual({ favorited: [productId] });
  });

  it('favori bir ürün vitrinden kalkarsa listede görünmez', async () => {
    await request('/api/favorites', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ productId }),
    });

    await db.update(products).set({ status: 'draft' }).where(eq(products.id, productId));

    const list = await request('/api/favorites', { cookie: customerCookie });
    expect(((await list.json()) as { products: unknown[] }).products).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Ödemesi gelmeyen siparişler
// ---------------------------------------------------------------------------

describe('ödeme süresi dolan siparişler', () => {
  /**
   * Havale ile verilen sipariş `pending_payment` başlar ve ürünü rezerve eder.
   *
   * Ödeme gelmezse rezervasyon süresi dolar. Önceden yalnızca ÜRÜN serbest
   * bırakılıyor, sipariş açık kalıyordu: aynı ürün ikinci kez satılabilir hâle
   * gelirken bekleyen sipariş hâlâ onu bekliyordu.
   */
  async function createUnpaidOrder(): Promise<string> {
    await addToCart(customerCookie, productId);

    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload({ paymentMethod: 'bank_transfer' })),
    });

    const payload = (await response.json()) as { order: { orderId: string } };
    return payload.order.orderId;
  }

  it('süresi dolan siparişi iptal eder ve ürünü satışa döndürür', async () => {
    const orderId = await createUnpaidOrder();

    // Siparişi rezervasyon süresinden daha eskiye taşı.
    await db
      .update(orders)
      .set({ createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) })
      .where(eq(orders.id, orderId));

    expect(await cancelExpiredUnpaidOrders()).toBe(1);

    const [order] = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId));
    expect(order?.status).toBe('cancelled');

    const [product] = await db
      .select({ status: products.status, reservedUntil: products.reservedUntil })
      .from(products)
      .where(eq(products.id, productId));
    expect(product?.status).toBe('for_sale');
    expect(product?.reservedUntil).toBeNull();
  });

  it('süresi dolmamış siparişe dokunmaz', async () => {
    const orderId = await createUnpaidOrder();

    expect(await cancelExpiredUnpaidOrders()).toBe(0);

    const [order] = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId));
    expect(order?.status).toBe('pending_payment');
  });
});

// ---------------------------------------------------------------------------
// Personel notu
// ---------------------------------------------------------------------------

describe('sipariş personel notu', () => {
  /**
   * Sütun, servis fonksiyonu ve müşteriden gizleme baştan vardı ama notu
   * yazacak bir uç yoktu: personel siparişe not düşemiyordu.
   */
  async function placeOrder(): Promise<string> {
    await addToCart(customerCookie, productId);

    const response = await request('/api/orders', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(orderPayload()),
    });

    const payload = (await response.json()) as { order: { orderId: string } };
    return payload.order.orderId;
  }

  it('müşteri not yazamaz', async () => {
    const orderId = await placeOrder();

    const response = await request(`/api/admin/orders/${orderId}/staff-note`, {
      method: 'PUT',
      cookie: customerCookie,
      body: JSON.stringify({ note: 'İçeriden not' }),
    });

    expect(response.status).toBe(403);
  });

  it('personel not yazar; müşteri yanıtında görünmez', async () => {
    const staff = await createTestUser({ email: 'personel-not@ersinspot.com', role: 'staff' });
    const staffCookie = await loginAs(staff.email, staff.password);

    const orderId = await placeOrder();

    const saved = await request(`/api/admin/orders/${orderId}/staff-note`, {
      method: 'PUT',
      cookie: staffCookie,
      body: JSON.stringify({ note: 'Müşteri kapıda ödeme yapacak.' }),
    });
    expect(saved.status).toBe(200);

    const staffView = await request(`/api/orders/${orderId}`, { cookie: staffCookie });
    const staffOrder = (await staffView.json()) as { order: { staffNote?: string | null } };
    expect(staffOrder.order.staffNote).toBe('Müşteri kapıda ödeme yapacak.');

    const customerView = await request(`/api/orders/${orderId}`, { cookie: customerCookie });
    const customerOrder = (await customerView.json()) as { order: Record<string, unknown> };
    expect('staffNote' in customerOrder.order).toBe(false);
  });

  it('boş not gönderilince not silinir', async () => {
    const staff = await createTestUser({ email: 'personel-sil@ersinspot.com', role: 'staff' });
    const staffCookie = await loginAs(staff.email, staff.password);

    const orderId = await placeOrder();

    await request(`/api/admin/orders/${orderId}/staff-note`, {
      method: 'PUT',
      cookie: staffCookie,
      body: JSON.stringify({ note: 'Yanlışlıkla yazıldı' }),
    });

    // Boş metin bilinçli olarak geçerlidir: notu silmenin tek yolu budur.
    const cleared = await request(`/api/admin/orders/${orderId}/staff-note`, {
      method: 'PUT',
      cookie: staffCookie,
      body: JSON.stringify({ note: '' }),
    });
    expect(cleared.status).toBe(200);

    const [row] = await db
      .select({ staffNote: orders.staffNote })
      .from(orders)
      .where(eq(orders.id, orderId));

    expect(row?.staffNote).toBeNull();
  });
});
