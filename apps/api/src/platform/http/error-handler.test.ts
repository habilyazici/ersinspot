/**
 * Veritabanı hatalarının kullanıcıya çevrilmesi.
 *
 * Uygulama, benzersizlik ve yabancı anahtar ihlallerini anlaşılır bir iş
 * kuralı mesajına çevirmeyi amaçlar. Çevrim, hatanın PostgreSQL kodunu
 * bulmasına bağlıdır — ve kod hatanın kendisinde DEĞİLDİR: Drizzle sürücünün
 * hatasını sarar, özgününü `cause` altına koyar.
 *
 * Yalnızca üst düzey `code` okunduğunda eşlemelerin hiçbiri çalışmıyordu ve
 * her veritabanı kısıtı genel 500'e düşüyordu. Kimse fark etmemişti çünkü sık
 * kullanılan yollar (blog bağlantı adı gibi) kısıta gelmeden önce kendileri
 * denetliyor; eşleme, o denetimlerin kapatamadığı YARIŞ durumları için duran
 * emniyet ağıdır.
 */

import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type * as EnvModule from '../config/env.ts';

/*
  Testler ÜRETİM kipinde koşar.

  Beklenmeyen hatalarda geliştirmede yanıta bir `debugMessage` eklenir; asıl
  güvence üretimde hiçbir ayrıntının çıkmamasıdır ve denetlenmesi gereken de
  odur. Varsayılan kiple koşulsaydı test, korumanın kendisini hiç görmezdi.
*/
vi.mock('../config/env.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof EnvModule>();
  return { ...actual, isProduction: true };
});

const { errorHandler } = await import('./error-handler.ts');

/** Drizzle'ın sardığı hatanın şekli: kod `cause` altında. */
function drizzleHatasi(code: string): Error {
  return new Error('sorgu başarısız', { cause: Object.assign(new Error('sürücü'), { code }) });
}

/** Kodu üst düzeyde taşıyan ham sürücü hatası. */
function hamHata(code: string): Error {
  return Object.assign(new Error('sürücü'), { code });
}

async function yanit(error: unknown): Promise<{ status: number; code: string }> {
  const app = new Hono();
  app.onError(errorHandler);
  app.get('/dene', () => {
    throw error;
  });

  const response = await app.request('http://localhost/dene');
  const body = (await response.json()) as { error: { code: string } };

  return { status: response.status, code: body.error.code };
}

describe('veritabanı hatalarının çevrimi', () => {
  it('sarılmış benzersizlik ihlalini tanır', async () => {
    expect(await yanit(drizzleHatasi('23505'))).toEqual({ status: 409, code: 'already_exists' });
  });

  it('ham benzersizlik ihlalini de tanır', async () => {
    expect(await yanit(hamHata('23505'))).toEqual({ status: 409, code: 'already_exists' });
  });

  it('yabancı anahtar ihlalini iş kuralına çevirir', async () => {
    expect(await yanit(drizzleHatasi('23503'))).toMatchObject({
      code: 'business_rule_violated',
    });
  });

  it('kontrol kısıtını iş kuralına çevirir', async () => {
    expect(await yanit(drizzleHatasi('23514'))).toMatchObject({
      code: 'business_rule_violated',
    });
  });

  it('kilitlenmeyi tekrar denenebilir çakışma sayar', async () => {
    expect(await yanit(drizzleHatasi('40P01'))).toMatchObject({ code: 'resource_conflict' });
  });

  it('kilit zaman aşımını da çakışma sayar', async () => {
    /*
      55P03, `lock_timeout` aşıldığında gelir: kilidi tutan işlem takılmıştır.
      Müşteri için sonuç kilitlenmeyle aynıdır, tekrar denemek çözer.
    */
    expect(await yanit(drizzleHatasi('55P03'))).toMatchObject({ code: 'resource_conflict' });
  });

  it('tanınmayan kodu dışarı sızdırmaz', async () => {
    const sonuc = await yanit(drizzleHatasi('XX000'));

    expect(sonuc.status).toBe(500);
    expect(sonuc.code).toBe('internal_error');
  });

  it('üretimde hiçbir ayrıntı sızdırmaz', async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get('/dene', () => {
      throw drizzleHatasi('XX000');
    });

    const response = await app.request('http://localhost/dene');
    const text = await response.text();

    // Tablo ve sütun adları, sorgu metni, hata kodu ve yığın izi yanıtta yer almaz.
    expect(text).not.toContain('sorgu başarısız');
    expect(text).not.toContain('sürücü');
    expect(text).not.toContain('XX000');
    expect(text).not.toContain('debugMessage');

    // Kullanıcıya destek talebinde paylaşabileceği izleme kodu verilir.
    const body = JSON.parse(text) as { error: { traceId?: string } };
    expect(body.error.traceId).toMatch(/^[0-9a-f]{8}$/);
  });
});
