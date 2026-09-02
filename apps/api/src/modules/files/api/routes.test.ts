/**
 * Yerel dosya sunumu testleri.
 *
 * Denetimde `STORAGE_PUBLIC_URL` bir adres üretiyordu ama o adresi karşılayan
 * hiçbir rota yoktu: yerel sürücüyle yüklenen her görsel 404 veriyordu.
 */

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
