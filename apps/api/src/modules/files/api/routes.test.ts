/**
 * Yerel dosya sunumu testleri.
 *
 * Denetimde `STORAGE_PUBLIC_URL` bir adres üretiyordu ama o adresi karşılayan
 * hiçbir rota yoktu: yerel sürücüyle yüklenen her görsel 404 veriyordu.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { request } from '../../../test/helpers.ts';
import { createStorageKey, remove, store } from '../../../platform/storage.ts';

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
