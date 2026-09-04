/**
 * İstemci adresinin çıkarılması.
 *
 * Adres `inet` sütunlarına yazılıyor (giriş denemeleri, oturumlar, şifre
 * sıfırlama, iletişim mesajları) ve hız sınırı sayacının anahtarını üretiyor.
 * Başlıktan okunan değer doğrulanmadığında iki şey oluyordu:
 *
 *   • `X-Forwarded-For: bu-bir-ip-degil` gönderen biri, PostgreSQL'in
 *     reddettiği bir değerin yazılmasına yol açıyor ve giriş 500 dönüyordu.
 *   • Her istekte farklı bir uydurma değer, her seferinde yeni bir sayaç
 *     kovası açıyordu.
 *
 * Vekil başlıkları yalnızca `TRUST_PROXY=true` iken okunur; test yapılandırmayı
 * `process.env` ile değil, modülü taklit ederek değiştirir — ortam değişkenine
 * doğrudan erişim yalnızca yapılandırma modülüne aittir.
 */

import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type * as EnvModule from '../config/env.ts';

vi.mock('../config/env.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof EnvModule>();
  return { ...actual, env: { ...actual.env, TRUST_PROXY: true } };
});

const { clientIp } = await import('./security.ts');

/** Başlıklarla istek atar ve çıkarılan adresi döndürür. */
async function resolveIp(headers: Record<string, string>): Promise<string | null> {
  const app = new Hono();
  app.get('/', (c) => c.json({ ip: clientIp(c) }));

  const response = await app.request('http://localhost/', { headers });
  const body = (await response.json()) as { ip: string | null };

  return body.ip;
}

describe('istemci adresi', () => {
  it('geçerli X-Real-IP değerini okur', async () => {
    expect(await resolveIp({ 'X-Real-IP': '203.0.113.7' })).toBe('203.0.113.7');
  });

  it('IPv6 adresini kabul eder', async () => {
    expect(await resolveIp({ 'X-Real-IP': '2001:db8::1' })).toBe('2001:db8::1');
  });

  it('biçimsiz değeri yok sayar', async () => {
    /*
      Asıl hata buydu: doğrulanmayan değer `inet` sütununa gidiyor ve sorgu
      hata veriyordu. Soket adresi test ortamında bulunmadığı için null döner.
    */
    expect(await resolveIp({ 'X-Real-IP': 'bu-bir-ip-degil' })).toBeNull();
    expect(await resolveIp({ 'X-Forwarded-For': 'bu-bir-ip-degil' })).toBeNull();
  });

  it('vekilin yazdığı X-Real-IP, zincirin ilk halkasına tercih edilir', async () => {
    /*
      `X-Forwarded-For` yaygın vekil yapılandırmasında istemcinin değerini
      ezmez, sonuna ekler; ilk halka istemcinin denetimindedir. Vekilin tek
      değerli başlığı öncelikli okunmalıdır.
    */
    const ip = await resolveIp({
      'X-Forwarded-For': '198.51.100.9, 203.0.113.7',
      'X-Real-IP': '203.0.113.7',
    });

    expect(ip).toBe('203.0.113.7');
  });

  it('X-Real-IP yoksa zincirin ilk halkasına düşer', async () => {
    expect(await resolveIp({ 'X-Forwarded-For': '198.51.100.9, 203.0.113.7' })).toBe(
      '198.51.100.9',
    );
  });
});
