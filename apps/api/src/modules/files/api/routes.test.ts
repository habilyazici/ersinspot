/**
 * Yerel dosya sunumu testleri.
 *
 * Denetimde `STORAGE_PUBLIC_URL` bir adres üretiyordu ama o adresi karşılayan
 * hiçbir rota yoktu: yerel sürücüyle yüklenen her görsel 404 veriyordu.
 */

import { randomBytes } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../../platform/db/client.ts';
import { createTestUser, loginAs, request, resetDatabase } from '../../../test/helpers.ts';
import { createStorageKey, remove, store } from '../../../platform/storage.ts';
import { uploadedFiles } from '../infrastructure/schema.ts';

// 1x1 saydam PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

let key: string;

beforeAll(async () => {
  const stored = await store('product_image', 'image/png', new Uint8Array(PNG));
  key = stored.key;
});

afterAll(async () => {
  await remove(key);
});

describe('Yerel dosya sunumu', () => {
  it('yüklenen dosyayı doğru içerik türüyle döndürür', async () => {
    const response = await request(`/files/${key}`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');

    const body = new Uint8Array(await response.arrayBuffer());
    expect(body).toEqual(new Uint8Array(PNG));
  });

  it('değişmeyen dosyada uzun önbellek başlığı verir', async () => {
    const response = await request(`/files/${key}`);

    // Genel güvenlik middleware'i no-store yazar; dosya rotası istisnadır.
    expect(response.headers.get('Cache-Control')).toContain('immutable');
    expect(response.headers.get('Cache-Control')).not.toContain('no-store');
  });

  it('yanıt yalnızca dosyanın kendi baytlarını içerir', async () => {
    /*
      `readFile` küçük dosyalarda Node'un PAYLAŞILAN havuz tamponu içinde bir
      görünüm döndürür. Alttaki tamponu doğrudan yanıta koymak, aynı havuzda
      duran ilgisiz verileri (başka dosyalar, istek gövdeleri) sızdırırdı. Bu
      test, yanıt uzunluğunun dosyanın kendi uzunluğu olduğunu doğrular.
    */
    const response = await request(`/files/${key}`);
    const body = new Uint8Array(await response.arrayBuffer());

    expect(body.byteLength).toBe(PNG.byteLength);
  });

  it('yol geçişi denemesini reddeder', async () => {
    for (const attempt of [
      '/files/../../../etc/passwd',
      '/files/product_image/2026/08/../../../../etc/passwd',
      '/files/..%2f..%2fetc%2fpasswd',
    ]) {
      const response = await request(attempt);
      expect(response.status).not.toBe(200);
    }
  });

  it('biçimsiz anahtarı reddeder', async () => {
    const response = await request('/files/rastgele-bir-sey.png');
    expect(response.status).toBe(404);
  });

  it('olmayan dosyada 404 döner', async () => {
    const missing = createStorageKey('product_image', 'image/png');
    const response = await request(`/files/${missing}`);
    expect(response.status).toBe(404);
  });
});

/**
 * Kişisel dosyaların yetkilendirilmesi.
 *
 * Talep fotoğrafları müşterinin evinin içini gösterir; ürün görselleriyle aynı
 * klasörde durmaları onları herkese açık yapmaz. Önceden tüm depolama alanı
 * oturumsuz sunuluyordu: anahtarın rastgele olması "tahmin edilemez" demektir,
 * "yetkisiz erişilemez" demek değildir.
 */
describe('Kişisel dosyalarda erişim denetimi', () => {
  let photoKey: string;
  let ownerCookie: string;
  let otherCookie: string;
  let staffCookie: string;

  beforeAll(async () => {
    await resetDatabase();

    const owner = await createTestUser({ email: 'sahip@ornek.com' });
    const other = await createTestUser({ email: 'baskasi@ornek.com' });
    const staff = await createTestUser({ email: 'personel@ornek.com', role: 'staff' });

    ownerCookie = await loginAs(owner.email, owner.password);
    otherCookie = await loginAs(other.email, other.password);
    staffCookie = await loginAs(staff.email, staff.password);

    const stored = await store('request_photo', 'image/png', new Uint8Array(PNG));
    photoKey = stored.key;

    await db.insert(uploadedFiles).values({
      storageKey: photoKey,
      purpose: 'request_photo',
      contentType: 'image/png',
      sizeBytes: PNG.byteLength,
      uploadedByUserId: owner.id,
    });
  });

  afterAll(async () => {
    await remove(photoKey);
    await resetDatabase();
  });

  it('oturumsuz erişimi reddeder', async () => {
    const response = await request(`/files/${photoKey}`);
    expect(response.status).toBe(401);
  });

  it('başka bir kullanıcıya kapalıdır', async () => {
    const response = await request(`/files/${photoKey}`, { cookie: otherCookie });
    expect(response.status).toBe(404);
  });

  it('yükleyen kişiye açıktır', async () => {
    const response = await request(`/files/${photoKey}`, { cookie: ownerCookie });
    expect(response.status).toBe(200);
  });

  it('personele açıktır', async () => {
    const response = await request(`/files/${photoKey}`, { cookie: staffCookie });
    expect(response.status).toBe(200);
  });

  it('paylaşılan önbelleklere düşmez', async () => {
    const response = await request(`/files/${photoKey}`, { cookie: ownerCookie });

    expect(response.headers.get('Cache-Control')).toContain('private');
    expect(response.headers.get('Cache-Control')).not.toContain('immutable');
  });
});

describe('İstek gövdesi üst sınırı', () => {
  /*
    Sınır yokken herkese açık bir uca yirmi megabaytlık bir JSON gönderilip
    ayrıştırılabiliyordu: doğrulama gövdeyi okuduktan SONRA çalışır, yani
    reddedilen istek de belleği bir kez ödemiş oluyordu.

    Sınır İKİ KADEMELİDİR ve tek middleware'de seçilir. Yol başına ayrı `use`
    çağrılarıyla kurulduğunda Hono ikisini de çalıştırıyor ve 1 MB'lık bir
    görsel metin sınırına takılıyordu; testin asıl işi o ayrımı korumak.
  */
  it('büyük metin gövdesini reddeder', async () => {
    const response = await request('/api/contact', {
      method: 'POST',
      body: JSON.stringify({ message: 'a'.repeat(600 * 1024) }),
    });

    expect(response.status).toBe(413);

    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('request_too_large');
  });

  it('metin sınırından büyük bir görsel yüklenebilir', async () => {
    const staff = await createTestUser({ role: 'staff', emailVerified: true });
    const cookie = await loginAs(staff.email, staff.password);

    // Metin sınırının (512 KB) üstünde, yükleme sınırının (8 MB) altında.
    const form = new FormData();
    form.append('file', new Blob([buyukPng(700)], { type: 'image/png' }), 'buyuk.png');
    form.append('purpose', 'product_image');

    const response = await request('/api/uploads', { method: 'POST', cookie, body: form });

    expect(response.status).toBe(201);
  });
});

/**
 * Sıkışmayan içerikli geçerli bir PNG üretir.
 *
 * Düz renk ya da desenli bir görsel zlib altında birkaç kilobayta iner ve
 * sınırı hiç sınamaz; baytlar rastgele olmalıdır.
 */
function buyukPng(size: number): Uint8Array {
  const raw = Buffer.concat(
    Array.from({ length: size }, () => Buffer.concat([Buffer.from([0]), randomBytes(size * 3)])),
  );

  const chunk = (type: string, data: Buffer): Buffer => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 1 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** PNG parça sağlama toplamı. */
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
