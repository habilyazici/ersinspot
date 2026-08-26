/**
 * Hizmet talebi uçlarının testleri.
 *
 * Bu modülün uçları eski kod tabanında en kötü durumdaydı:
 *
 *   - `technical_service.tsx` içindeki dört `/admin/*` ucunda HİÇ yetki
 *     kontrolü yoktu. Kimliksiz herkes tüm servis taleplerini müşteri
 *     bilgileriyle listeleyebiliyor, fiyat girebiliyor, durum değiştirebiliyor
 *     ve kayıt silebiliyordu.
 *
 *   - `moving.tsx` içindeki altı `/admin/*` ucu yalnızca `verifyUser()`
 *     çağırıyordu — token geçerli mi bakıyor, kullanıcının personel olup
 *     olmadığına bakmıyordu. Log satırı "Admin user verified" yazıyordu ama
 *     doğrulanan şey bu değildi.
 *
 * Aşağıdaki yetkilendirme testleri her iki açığın da kapandığını doğrular.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../../platform/db/client.ts';
import { createTestUser, loginAs, request, resetDatabase } from '../../../test/helpers.ts';
import { categories, products } from '../../catalog/infrastructure/schema.ts';
import { serviceRequests } from '../infrastructure/schema.ts';

let categoryId: string;
let customerCookie: string;
let customerId: string;
let staffCookie: string;

function futureDate(daysAhead: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

const movingPayload = {
  contact: { fullName: 'Ayşe Yılmaz', phone: '0507 194 05 50' },
  houseSize: '2+1',
  fromLocation: {
    address: {
      district: 'Buca',
      neighborhood: 'Menderes',
      street: 'Cadde',
      buildingNo: '5',
    },
    floor: 3,
    hasElevator: false,
  },
  toLocation: {
    address: {
      district: 'Bornova',
      neighborhood: 'Kazımdirik',
      street: 'Üniversite Caddesi',
      buildingNo: '12',
    },
    floor: 1,
    hasElevator: true,
  },
  preferredDate: futureDate(10),
  items: [
    { name: 'Buzdolabı', quantity: 1, needsDisassembly: false },
    { name: 'Koltuk Takımı', quantity: 1, needsDisassembly: true },
  ],
  needsPacking: false,
  needsAssembly: true,
  photos: [],
};

const technicalPayload = {
  contact: { fullName: 'Ayşe Yılmaz', phone: '0507 194 05 50' },
  deviceType: 'refrigerator',
  brand: 'Arçelik',
  model: 'NF 5202',
  warrantyStatus: 'out_of_warranty',
  problemCategory: 'not_cooling',
  problemDescription: 'Buzdolabı soğutmuyor, motor çalışıyor ama iç sıcaklık düşmüyor.',
  address: {
    district: 'Buca',
    neighborhood: 'Menderes',
    street: 'Cadde',
    buildingNo: '5',
  },
  preferredDate: futureDate(5),
  photos: [],
  acceptedInspectionFee: true,
};

function sellPayload(catId: string) {
  return {
    contact: { fullName: 'Ayşe Yılmaz', phone: '0507 194 05 50' },
    title: 'Bosch Çamaşır Makinesi 9 Kg',
    categoryId: catId,
    brand: 'Bosch',
    condition: 'good',
    description: 'İki yıl kullanılmış, sorunsuz çalışan çamaşır makinesi. Kutusu mevcut.',
    hasBox: true,
    hasAccessories: false,
    hasWarranty: false,
    pickupAddress: {
      district: 'Buca',
      neighborhood: 'Menderes',
      street: 'Cadde',
      buildingNo: '5',
    },
    photos: [
      { storageKey: 'request_photo/2026/08/00000000-0000-0000-0000-000000000001.webp' },
      { storageKey: 'request_photo/2026/08/00000000-0000-0000-0000-000000000002.webp' },
      { storageKey: 'request_photo/2026/08/00000000-0000-0000-0000-000000000003.webp' },
    ],
  };
}

beforeEach(async () => {
  await resetDatabase();

  const [category] = await db
    .insert(categories)
    .values({ name: 'Beyaz Eşya', slug: 'beyaz-esya' })
    .returning({ id: categories.id });
  if (category === undefined) throw new Error('Kategori oluşturulamadı.');
  categoryId = category.id;

  // Talep oluşturma e-posta doğrulaması gerektirir.
  const customer = await createTestUser({ email: 'musteri@ornek.com', emailVerified: true });
  customerId = customer.id;
  customerCookie = await loginAs(customer.email, customer.password);

  const staff = await createTestUser({
    email: 'personel@ersinspot.com',
    role: 'staff',
    emailVerified: true,
  });
  staffCookie = await loginAs(staff.email, staff.password);
});

async function createMoving(cookie = customerCookie): Promise<string> {
  const response = await request('/api/moving/requests', {
    method: 'POST',
    cookie,
    body: JSON.stringify(movingPayload),
  });
  const payload = (await response.json()) as { request: { requestId: string } };
  return payload.request.requestId;
}

// ═══════════════════════════════════════════════════════════════════════════
// YETKİLENDİRME — eski koddaki en kötü açıklar
// ═══════════════════════════════════════════════════════════════════════════

describe('yönetim uçlarının yetkilendirmesi', () => {
  /**
   * Eski `technical_service.tsx` bu uçlarda Authorization başlığını bile
   * okumuyordu: kimliksiz herkes tüm talepleri müşteri bilgileriyle
   * listeleyebiliyordu.
   */
  it('oturumsuz erişimi reddeder', async () => {
    const endpoints: [string, string][] = [
      ['GET', '/api/admin/requests'],
      ['GET', '/api/admin/appointments?date=2026-09-01'],
    ];

    for (const [method, path] of endpoints) {
      const response = await request(path, { method });
      expect(response.status, `${method} ${path}`).toBe(401);
    }
  });

  /**
   * Eski `moving.tsx` yalnızca `verifyUser()` çağırıyordu: token geçerli mi
   * bakıyor, kullanıcının personel olup olmadığına bakmıyordu. Sıradan bir
   * müşteri hesabıyla teklif verilebiliyor ve durum değiştirilebiliyordu.
   */
  it('müşteri hesabıyla yönetim işlemi yapılamaz', async () => {
    const requestId = await createMoving();

    const attempts: [string, string, unknown][] = [
      ['GET', '/api/admin/requests', undefined],
      [
        'POST',
        `/api/admin/requests/${requestId}/quote`,
        { amount: 100000, validUntil: futureDate(7) },
      ],
      [
        'POST',
        `/api/admin/requests/${requestId}/appointment`,
        { date: futureDate(7), timeSlot: { startTime: '09:00', endTime: '11:00' } },
      ],
      ['PATCH', `/api/admin/requests/${requestId}/status`, { status: 'reviewing' }],
      ['PUT', `/api/admin/requests/${requestId}/staff-note`, { note: 'Gizli not' }],
    ];

    for (const [method, path, payload] of attempts) {
      const response = await request(path, {
        method,
        cookie: customerCookie,
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      });

      expect(response.status, `${method} ${path}`).toBe(403);
    }
  });

  it('personel yetkisiyle erişilebilir', async () => {
    const response = await request('/api/admin/requests', { cookie: staffCookie });
    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Nakliye talebi
// ---------------------------------------------------------------------------

describe('nakliye talebi', () => {
  it('oturum ve doğrulanmış e-posta gerektirir', async () => {
    expect(
      (
        await request('/api/moving/requests', {
          method: 'POST',
          body: JSON.stringify(movingPayload),
        })
      ).status,
    ).toBe(401);

    const unverified = await createTestUser({ email: 'dogrulanmamis@ornek.com' });
    const cookie = await loginAs(unverified.email, unverified.password);

    const response = await request('/api/moving/requests', {
      method: 'POST',
      cookie,
      body: JSON.stringify(movingPayload),
    });

    expect(response.status).toBe(403);
  });

  it('talep oluşturur ve takip numarası üretir', async () => {
    const response = await request('/api/moving/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(movingPayload),
    });

    expect(response.status).toBe(201);

    const payload = (await response.json()) as {
      request: { referenceNumber: string; estimatedTotal: number };
    };

    expect(payload.request.referenceNumber).toMatch(/^NAK-\d{4}-\d{6}$/);
    expect(payload.request.estimatedTotal).toBeGreaterThan(0);
  });

  it('tahmini tutarı sunucuda hesaplar; istemciden kabul etmez', async () => {
    const response = await request('/api/moving/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ ...movingPayload, estimatedTotal: 1, total: 1 }),
    });

    const payload = (await response.json()) as { request: { estimatedTotal: number } };

    // Gönderilen sahte tutar yok sayılmalı.
    expect(payload.request.estimatedTotal).toBeGreaterThan(100_000);
  });

  it('asansörsüz kat için ek ücret uygular', async () => {
    const withoutElevator = await request('/api/moving/estimate', {
      method: 'GET',
    });
    void withoutElevator;

    const high = await request(
      '/api/moving/estimate?houseSize=2%2B1&fromFloor=5&fromHasElevator=false' +
        '&toFloor=0&toHasElevator=false&itemCount=0&needsPacking=false&needsAssembly=false',
    );
    const ground = await request(
      '/api/moving/estimate?houseSize=2%2B1&fromFloor=0&fromHasElevator=false' +
        '&toFloor=0&toHasElevator=false&itemCount=0&needsPacking=false&needsAssembly=false',
    );

    const highTotal = ((await high.json()) as { estimate: { total: number } }).estimate.total;
    const groundTotal = ((await ground.json()) as { estimate: { total: number } }).estimate.total;

    expect(highTotal).toBeGreaterThan(groundTotal);
  });

  it('çıkış ve varış adresi aynıysa reddeder', async () => {
    const response = await request('/api/moving/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({
        ...movingPayload,
        toLocation: { ...movingPayload.fromLocation },
      }),
    });

    expect(response.status).toBe(400);
  });

  it('hizmet verilmeyen ilçeyi reddeder', async () => {
    const response = await request('/api/moving/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({
        ...movingPayload,
        toLocation: {
          ...movingPayload.toLocation,
          address: { ...movingPayload.toLocation.address, district: 'Bergama' },
        },
      }),
    });

    expect(response.status).toBe(400);
  });

  it('eşya listesi boşsa reddeder', async () => {
    const response = await request('/api/moving/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ ...movingPayload, items: [] }),
    });

    expect(response.status).toBe(400);
  });

  it('detayı iki adresle birlikte döner', async () => {
    const requestId = await createMoving();

    const response = await request(`/api/moving/requests/${requestId}`, {
      cookie: customerCookie,
    });

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      request: {
        fromLocation: { address: { district: string }; floor: number; hasElevator: boolean };
        toLocation: { address: { district: string } };
        items: unknown[];
      };
    };

    expect(payload.request.fromLocation.address.district).toBe('Buca');
    expect(payload.request.fromLocation.floor).toBe(3);
    expect(payload.request.fromLocation.hasElevator).toBe(false);
    expect(payload.request.toLocation.address.district).toBe('Bornova');
    expect(payload.request.items).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Teknik servis talebi
// ---------------------------------------------------------------------------

describe('teknik servis talebi', () => {
  it('talep oluşturur ve keşif ücretini sabitler', async () => {
    const response = await request('/api/technical-service/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(technicalPayload),
    });

    expect(response.status).toBe(201);

    const payload = (await response.json()) as {
      request: { referenceNumber: string; inspectionFee: number };
    };

    expect(payload.request.referenceNumber).toMatch(/^TSV-\d{4}-\d{6}$/);
    expect(payload.request.inspectionFee).toBe(75_000);
  });

  it('keşif ücreti onaylanmazsa reddeder', async () => {
    const response = await request('/api/technical-service/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ ...technicalPayload, acceptedInspectionFee: false }),
    });

    expect(response.status).toBe(400);
  });

  it('cihaz türü "diğer" ise açıklama ister', async () => {
    const response = await request('/api/technical-service/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ ...technicalPayload, deviceType: 'other' }),
    });

    expect(response.status).toBe(400);
  });

  it('kısa arıza açıklamasını reddeder', async () => {
    const response = await request('/api/technical-service/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ ...technicalPayload, problemDescription: 'bozuk' }),
    });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Satış talebi
// ---------------------------------------------------------------------------

describe('satış talebi', () => {
  it('talep oluşturur', async () => {
    const response = await request('/api/sell-requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(sellPayload(categoryId)),
    });

    expect(response.status).toBe(201);

    const payload = (await response.json()) as { request: { referenceNumber: string } };
    expect(payload.request.referenceNumber).toMatch(/^SAT-\d{4}-\d{6}$/);
  });

  it('yeterli fotoğraf yoksa reddeder', async () => {
    const response = await request('/api/sell-requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ ...sellPayload(categoryId), photos: [] }),
    });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Ortak yaşam döngüsü
// ---------------------------------------------------------------------------

describe('teklif ve randevu akışı', () => {
  async function quote(requestId: string, amount = 850_000): Promise<Response> {
    return request(`/api/admin/requests/${requestId}/quote`, {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify({ amount, validUntil: futureDate(7), note: 'Teklifimiz' }),
    });
  }

  it('teklif verir ve durumu ilerletir', async () => {
    const requestId = await createMoving();

    const response = await quote(requestId);
    expect(response.status).toBe(201);

    const [row] = await db
      .select({ status: serviceRequests.status })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId));

    expect(row?.status).toBe('quoted');
  });

  /*
    Durum makinesi geçişin SIRASINI belirler, ön koşulunu değil.

    Denetimde `requiresQuote` ve `requiresAppointment` kurallarının yazılmış
    ama hiçbir yerden çağrılmamış olduğu bulundu: personel, teklif satırı
    olmadan talebi "kabul edildi", randevu satırı olmadan "randevu verildi"
    yapabiliyordu. Müşteri o zaman fiyatı olmayan bir kabul veya tarihi olmayan
    bir randevu görürdü.
  */
  it('teklif yokken talep kabul edilmiş sayılamaz', async () => {
    const requestId = await createMoving();

    // Teklif oluşturmadan doğrudan "quoted" durumuna geçir.
    const toQuoted = await request(`/api/admin/requests/${requestId}/status`, {
      method: 'PATCH',
      cookie: staffCookie,
      body: JSON.stringify({ status: 'reviewing' }),
    });
    expect(toQuoted.status).toBe(200);

    await request(`/api/admin/requests/${requestId}/status`, {
      method: 'PATCH',
      cookie: staffCookie,
      body: JSON.stringify({ status: 'quoted' }),
    });

    const response = await request(`/api/admin/requests/${requestId}/status`, {
      method: 'PATCH',
      cookie: staffCookie,
      body: JSON.stringify({ status: 'accepted' }),
    });

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: { message: string } }).error.message).toContain(
      'teklif',
    );

    const [row] = await db
      .select({ status: serviceRequests.status })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId));

    expect(row?.status).not.toBe('accepted');
  });

  it('randevu yokken talep planlanmış sayılamaz', async () => {
    const requestId = await createMoving();
    await quote(requestId);

    await request(`/api/requests/${requestId}/respond`, {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ decision: 'accept' }),
    });

    // Randevu oluşturmadan doğrudan "scheduled" durumuna geçmeye çalış.
    const response = await request(`/api/admin/requests/${requestId}/status`, {
      method: 'PATCH',
      cookie: staffCookie,
      body: JSON.stringify({ status: 'scheduled' }),
    });

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: { message: string } }).error.message).toContain(
      'randevu',
    );

    const [row] = await db
      .select({ status: serviceRequests.status })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId));

    expect(row?.status).toBe('accepted');
  });

  it('müşteri teklifi kabul edebilir', async () => {
    const requestId = await createMoving();
    await quote(requestId);

    const response = await request(`/api/requests/${requestId}/respond`, {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ decision: 'accept' }),
    });

    expect(response.status).toBe(200);

    const [row] = await db
      .select({ status: serviceRequests.status })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId));

    expect(row?.status).toBe('accepted');
  });

  it('müşteri başkasının teklifine yanıt veremez', async () => {
    const requestId = await createMoving();
    await quote(requestId);

    const other = await createTestUser({ email: 'diger@ornek.com', emailVerified: true });
    const otherCookie = await loginAs(other.email, other.password);

    const response = await request(`/api/requests/${requestId}/respond`, {
      method: 'POST',
      cookie: otherCookie,
      body: JSON.stringify({ decision: 'accept' }),
    });

    expect(response.status).toBe(403);
  });

  it('teklif verilmemiş talebe yanıt verilemez', async () => {
    const requestId = await createMoving();

    const response = await request(`/api/requests/${requestId}/respond`, {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ decision: 'accept' }),
    });

    expect(response.status).toBe(400);
  });

  it('süresi dolmuş teklif kabul edilemez', async () => {
    const requestId = await createMoving();
    await quote(requestId);

    // Teklifin geçerliliğini geçmişe çek.
    await db.execute(sql`
      UPDATE request_quotes SET valid_until = current_date - 1
      WHERE request_id = ${requestId}
    `);

    const response = await request(`/api/requests/${requestId}/respond`, {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ decision: 'accept' }),
    });

    expect(response.status).toBe(400);
  });

  it('revize teklif öncekini geçersiz kılar', async () => {
    const requestId = await createMoving();
    await quote(requestId, 800_000);
    await quote(requestId, 900_000);

    const response = await request(`/api/moving/requests/${requestId}`, {
      cookie: customerCookie,
    });
    const payload = (await response.json()) as { request: { quote: { amount: number } } };

    expect(payload.request.quote.amount).toBe(900_000);
  });

  it('kabul edilmiş talebe randevu planlar', async () => {
    const requestId = await createMoving();
    await quote(requestId);
    await request(`/api/requests/${requestId}/respond`, {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ decision: 'accept' }),
    });

    const response = await request(`/api/admin/requests/${requestId}/appointment`, {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify({
        date: futureDate(12),
        timeSlot: { startTime: '09:00', endTime: '13:00' },
      }),
    });

    expect(response.status).toBe(201);

    const [row] = await db
      .select({ status: serviceRequests.status })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId));

    expect(row?.status).toBe('scheduled');
  });

  it('kabul edilmemiş talebe randevu planlanamaz', async () => {
    const requestId = await createMoving();

    const response = await request(`/api/admin/requests/${requestId}/appointment`, {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify({
        date: futureDate(12),
        timeSlot: { startTime: '09:00', endTime: '13:00' },
      }),
    });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Erişim ve gizlilik
// ---------------------------------------------------------------------------

describe('erişim yetkisi', () => {
  it('müşteri başkasının talebini göremez', async () => {
    const requestId = await createMoving();

    const other = await createTestUser({ email: 'diger@ornek.com', emailVerified: true });
    const otherCookie = await loginAs(other.email, other.password);

    const response = await request(`/api/moving/requests/${requestId}`, { cookie: otherCookie });
    expect(response.status).toBe(403);
  });

  it('personel notu müşteri yanıtında görünmez', async () => {
    const requestId = await createMoving();

    await request(`/api/admin/requests/${requestId}/staff-note`, {
      method: 'PUT',
      cookie: staffCookie,
      body: JSON.stringify({ note: 'Müşteri pazarlık yapıyor, gizli not' }),
    });

    const response = await request(`/api/moving/requests/${requestId}`, {
      cookie: customerCookie,
    });
    const text = await response.text();

    expect(text).not.toContain('gizli not');
  });

  it('personel notu yönetim yanıtında görünür', async () => {
    const requestId = await createMoving();

    await request(`/api/admin/requests/${requestId}/staff-note`, {
      method: 'PUT',
      cookie: staffCookie,
      body: JSON.stringify({ note: 'Müşteri pazarlık yapıyor' }),
    });

    const response = await request(`/api/moving/requests/${requestId}`, { cookie: staffCookie });
    const text = await response.text();

    expect(text).toContain('pazarlık');
  });

  it('müşteri yalnızca kendi taleplerini listeler', async () => {
    await createMoving();

    const other = await createTestUser({ email: 'diger@ornek.com', emailVerified: true });
    const otherCookie = await loginAs(other.email, other.password);

    const response = await request('/api/requests', { cookie: otherCookie });
    const payload = (await response.json()) as { totalItems: number };

    expect(payload.totalItems).toBe(0);
  });

  it('üç tür tek listede döner', async () => {
    await createMoving();
    await request('/api/technical-service/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(technicalPayload),
    });
    await request('/api/sell-requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(sellPayload(categoryId)),
    });

    const response = await request('/api/requests', { cookie: customerCookie });
    const payload = (await response.json()) as {
      totalItems: number;
      items: { kind: string }[];
    };

    // Eski kodda bu üç akış ayrı yazıldığı için "taleplerim" ekranı üç ayrı
    // sorgu ve üç ayrı listeydi.
    expect(payload.totalItems).toBe(3);
    expect(new Set(payload.items.map((item) => item.kind))).toEqual(
      new Set(['moving', 'technical_service', 'sell_request']),
    );
  });
});

// ---------------------------------------------------------------------------
// İptal
// ---------------------------------------------------------------------------

describe('iptal', () => {
  it('müşteri kendi talebini iptal edebilir', async () => {
    const requestId = await createMoving();

    const response = await request(`/api/requests/${requestId}/cancel`, {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ reason: 'Vazgeçtim' }),
    });

    expect(response.status).toBe(200);

    const [row] = await db
      .select({ status: serviceRequests.status })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId));

    expect(row?.status).toBe('cancelled');
  });

  it('iptal edilmiş talep tekrar iptal edilemez', async () => {
    const requestId = await createMoving();

    await request(`/api/requests/${requestId}/cancel`, {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({}),
    });

    const second = await request(`/api/requests/${requestId}/cancel`, {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({}),
    });

    expect(second.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Satış talebinin ürüne dönüşmesi
// ---------------------------------------------------------------------------

describe('satış talebinden ürüne dönüşüm', () => {
  async function acceptedSellRequest(): Promise<string> {
    const created = await request('/api/sell-requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(sellPayload(categoryId)),
    });
    const { request: created2 } = (await created.json()) as {
      request: { requestId: string };
    };
    const requestId = created2.requestId;

    await request(`/api/admin/requests/${requestId}/quote`, {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify({ amount: 500_000, validUntil: futureDate(7) }),
    });

    await request(`/api/requests/${requestId}/respond`, {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify({ decision: 'accept' }),
    });

    return requestId;
  }

  it('kabul edilen talebi taslak ürüne dönüştürür', async () => {
    const requestId = await acceptedSellRequest();

    const response = await request(`/api/admin/sell-requests/${requestId}/convert`, {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify({
        title: 'Bosch Çamaşır Makinesi 9 Kg',
        description: 'Teslim alınan, iki yıl kullanılmış çamaşır makinesi.',
        price: 750_000,
        categoryId,
        condition: 'good',
        warrantyMonths: 3,
      }),
    });

    expect(response.status).toBe(201);

    const [product] = await db
      .select({ status: products.status, priceKurus: products.priceKurus })
      .from(products);

    // Ürün TASLAK olarak oluşur: personel gözden geçirmeden vitrine düşmez.
    expect(product?.status).toBe('draft');
    expect(product?.priceKurus).toBe(750_000);
  });

  it('kabul edilmemiş talep dönüştürülemez', async () => {
    const created = await request('/api/sell-requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(sellPayload(categoryId)),
    });
    const { request: req } = (await created.json()) as { request: { requestId: string } };

    const response = await request(`/api/admin/sell-requests/${req.requestId}/convert`, {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify({
        title: 'Ürün',
        description: 'Yeterince uzun bir ürün açıklaması buraya yazılır.',
        price: 750_000,
        categoryId,
        condition: 'good',
      }),
    });

    expect(response.status).toBe(400);
  });

  it('aynı talep iki kez dönüştürülemez', async () => {
    const requestId = await acceptedSellRequest();

    const payload = JSON.stringify({
      title: 'Bosch Çamaşır Makinesi 9 Kg',
      description: 'Teslim alınan, iki yıl kullanılmış çamaşır makinesi.',
      price: 750_000,
      categoryId,
      condition: 'good',
    });

    const first = await request(`/api/admin/sell-requests/${requestId}/convert`, {
      method: 'POST',
      cookie: staffCookie,
      body: payload,
    });
    expect(first.status).toBe(201);

    const second = await request(`/api/admin/sell-requests/${requestId}/convert`, {
      method: 'POST',
      cookie: staffCookie,
      body: payload,
    });
    expect(second.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Kötüye kullanım sınırı
// ---------------------------------------------------------------------------

describe('açık talep sınırı', () => {
  it('sınırı aşan talebi reddeder', async () => {
    // Sınır 10; onuncudan sonrası reddedilmeli.
    for (let index = 0; index < 10; index += 1) {
      const response = await request('/api/moving/requests', {
        method: 'POST',
        cookie: customerCookie,
        body: JSON.stringify(movingPayload),
      });
      expect(response.status, `talep ${index + 1}`).toBe(201);
    }

    const overLimit = await request('/api/moving/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(movingPayload),
    });

    expect(overLimit.status).toBe(400);
  });
});

describe('talep sahipliği', () => {
  it('talebi oturum sahibine bağlar', async () => {
    const requestId = await createMoving();

    const [row] = await db
      .select({ userId: serviceRequests.userId })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId));

    expect(row?.userId).toBe(customerId);
  });
});
