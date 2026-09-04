/**
 * Teklif geçerliliği.
 *
 * Kural hem sunucuda (süresi geçmiş teklifin kabulü reddedilir) hem arayüzde
 * (kabul düğmesi çizilmez) uygulanır; bu yüzden paylaşılan pakettedir. İki
 * yerde ayrı yazıldığında müşteri düğmeyi görüyor, basıyor ve sınırı ancak
 * hata mesajından öğreniyordu.
 *
 * Sınır İŞLETMENİN saat dilimindedir: teklif, geçerlilik gününün sonuna kadar
 * kabul edilir ve o gün Türkiye'de biter, UTC'de değil.
 */

import { describe, expect, it } from 'vitest';
import { isQuoteExpired } from './request-contract.ts';

/** Geçerlilik günü: 15 Mart 2026. Türkiye'de 16 Mart 00:00'da biter (UTC 21:00). */
const VALID_UNTIL = '2026-03-15';

describe('teklif geçerliliği', () => {
  it('geçerlilik gününün son anına kadar kabul edilir', () => {
    expect(isQuoteExpired(VALID_UNTIL, new Date('2026-03-15T20:59:59Z'))).toBe(false);
  });

  it('işletme saat diliminde gün bitince süresi dolar', () => {
    // UTC 21:00 = Türkiye'de 16 Mart 00:00.
    expect(isQuoteExpired(VALID_UNTIL, new Date('2026-03-15T21:00:00Z'))).toBe(true);
  });

  it('UTC gece yarısını beklemez', () => {
    /*
      Sınır UTC'den alınsaydı teklif, Türkiye'de 16 Mart sabahı 03:00'e kadar
      kabul edilmeye devam ederdi — müşteriye bildirilen son gün ile uygulanan
      sınır ayrışırdı.
    */
    expect(isQuoteExpired(VALID_UNTIL, new Date('2026-03-15T23:00:00Z'))).toBe(true);
  });

  it('geçerlilik gününden önce süresi dolmaz', () => {
    expect(isQuoteExpired(VALID_UNTIL, new Date('2026-03-10T12:00:00Z'))).toBe(false);
  });
});
