/**
 * Log maskeleme.
 *
 * Loglar üretimde bir toplayıcıya gider ve orada geliştiriciden başka gözler de
 * görür. Bir şifre, oturum jetonu ya da müşterinin telefon numarası oraya düz
 * metin düştüğünde geri alınamaz: kayıt çoğaltılmış, indekslenmiş ve
 * saklanmıştır.
 *
 * Maskeleme bir güvenlik davranışıdır, biçimlendirme tercihi değil; bu yüzden
 * denetlenir. Alan adları da denetlenir: kural içerme (substring) ile
 * çalıştığı için `passwordHash` ve `sessionToken` gibi türevleri de yakalamak
 * zorundadır.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as EnvModule from '../config/env.ts';

/*
  Testte log seviyesi `silent`: hiçbir satır yazılmaz. Maskelemeyi denetlemek
  için çıktının GERÇEKTEN üretilmesi gerekir, yoksa "gizli değer görünmüyor"
  iddiası boş dizeye bakar ve her zaman doğru çıkar. Yapılandırma modülü taklit
  edilir — ortam değişkenine doğrudan erişim yalnızca ona aittir.
*/
vi.mock('../config/env.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof EnvModule>();
  return { ...actual, isTest: false, isProduction: false };
});

const { logger } = await import('./logger.ts');

let yazilan: string[] = [];

beforeEach(() => {
  yazilan = [];
  for (const kanal of ['log', 'warn', 'error'] as const) {
    vi.spyOn(console, kanal).mockImplementation((satir: unknown) => {
      yazilan.push(String(satir));
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Tek satırda birleştirilmiş çıktı. */
function ciktı(): string {
  return yazilan.join('\n');
}

describe('log maskeleme', () => {
  it('şifreyi ve türevlerini gizler', () => {
    logger.info('deneme', {
      password: 'cok-gizli-sifre',
      passwordHash: '$argon2id$v=19$m=65536',
      confirmPassword: 'cok-gizli-sifre',
    });

    expect(ciktı()).not.toContain('cok-gizli-sifre');
    expect(ciktı()).not.toContain('argon2id');
    expect(ciktı()).toContain('[gizlendi]');
  });

  it('jetonları gizler', () => {
    logger.info('deneme', {
      token: 'ham-jeton-degeri',
      sessionToken: 'oturum-jetonu',
      resetToken: 'sifirlama-jetonu',
      tokenHash: 'ozet',
    });

    for (const gizli of ['ham-jeton-degeri', 'oturum-jetonu', 'sifirlama-jetonu', 'ozet']) {
      expect(ciktı()).not.toContain(gizli);
    }
  });

  it('çerez ve yetkilendirme başlıklarını gizler', () => {
    logger.warn('deneme', {
      cookie: 'oturum=abc123',
      authorization: 'Bearer abc123',
      apiKey: 'anahtar',
    });

    expect(ciktı()).not.toContain('abc123');
    expect(ciktı()).not.toContain('anahtar');
  });

  it('telefonu kısmen maskeler', () => {
    logger.info('deneme', { phone: '+905071940550' });

    // Son dört hane destek için tanınabilir kalır, ortası kapanır.
    expect(ciktı()).not.toContain('+905071940550');
    expect(ciktı()).toContain('0507 *** ** 50');
  });

  it('tanımadığı telefon değerini tamamen gizler', () => {
    logger.info('deneme', { contactPhone: 'telefon-degil' });

    expect(ciktı()).not.toContain('telefon-degil');
  });

  it('e-postayı kısmen maskeler', () => {
    logger.info('deneme', { email: 'musteri@ornek.com' });

    expect(ciktı()).not.toContain('musteri@ornek.com');
    expect(ciktı()).toContain('mu***@ornek.com');
  });

  it('iç içe nesnelerde de maskeler', () => {
    logger.error('deneme', { user: { profile: { phone: '+905071940550' } } });

    expect(ciktı()).not.toContain('+905071940550');
  });

  it('hassas olmayan alanı olduğu gibi bırakır', () => {
    logger.info('deneme', { orderId: 'SIP-2026-000001', itemCount: 3 });

    expect(ciktı()).toContain('SIP-2026-000001');
    expect(ciktı()).toContain('3');
  });

  it('tarihi okunabilir biçimde yazar', () => {
    /*
      `Object.entries` bir `Date` üzerinde boş dizi döndürür; temizlik özel
      durum tanımasaydı log satırında `{}` görünürdü.
    */
    logger.info('deneme', { deliveryDate: new Date('2026-09-10T08:00:00.000Z') });

    expect(ciktı()).toContain('2026-09-10T08:00:00.000Z');
  });
});
