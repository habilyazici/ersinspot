/**
 * Takip numarası üretimi.
 *
 * Numara müşteriye gider, e-postada durur ve destek talebinde okunur; biçimi
 * ve benzersizliği iki ayrı güvencedir.
 *
 * İçindeki YIL, işletmenin saat dilimine göre belirlenir. Sunucu UTC'de
 * çalışıyorsa (kapsayıcılarda olağan olan budur) 31 Aralık 21:00–24:00 arası
 * İstanbul'da yeni yıl başlamıştır; düz `now()` o üç saatte bir önceki yılın
 * numarasını üretir. Sıradan bir test bunu yakalayamaz — yılda üç saat
 * yanlıştır — bu yüzden özelliğin kendisi denetlenir.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from './client.ts';
import { generateReferenceNumber } from './reference-number.ts';
import { resetDatabase } from '../../test/helpers.ts';

beforeEach(async () => {
  await resetDatabase();
});

describe('takip numarası', () => {
  it('beklenen biçimde üretilir', async () => {
    const reference = await generateReferenceNumber('order');

    expect(reference).toMatch(/^SIP-\d{4}-\d{6}$/);
  });

  it('her belge türü kendi ön ekini ve sayacını kullanır', async () => {
    const [order, moving, service, sell] = await Promise.all([
      generateReferenceNumber('order'),
      generateReferenceNumber('moving'),
      generateReferenceNumber('technical_service'),
      generateReferenceNumber('sell_request'),
    ]);

    expect(order.startsWith('SIP-')).toBe(true);
    expect(moving.startsWith('NAK-')).toBe(true);
    expect(service.startsWith('TSV-')).toBe(true);
    expect(sell.startsWith('SAT-')).toBe(true);
  });

  it('aynı anda üretilen numaralar çakışmaz', async () => {
    /*
      Eski kod `Date.now()` kullanıyordu: aynı milisaniyede gelen iki istek
      aynı numarayı alabiliyor ve çakışma ancak yazma anında benzersizlik
      indeksiyle ortaya çıkıyordu.
    */
    const references = await Promise.all(
      Array.from({ length: 20 }, () => generateReferenceNumber('order')),
    );

    expect(new Set(references).size).toBe(20);
  });

  it('yılı İŞLETMENİN saat diliminden alır', async () => {
    /*
      Sunucunun saat dilimine bakılmaz. Aşağıdaki sınır, farkın gerçek
      olduğunu gösterir: 31 Aralık 22:00 UTC, İstanbul'da ertesi yıldır.
    */
    const [row] = await db.execute<{ tanim: string; istanbul: string; utc: string }>(sql`
      select
        pg_get_functiondef('next_reference_number(text, text)'::regprocedure) as tanim,
        to_char(timestamptz '2026-12-31 22:00:00+00' AT TIME ZONE 'Europe/Istanbul', 'YYYY') as istanbul,
        to_char(timestamptz '2026-12-31 22:00:00+00' AT TIME ZONE 'UTC', 'YYYY') as utc`);

    expect(row?.istanbul).toBe('2027');
    expect(row?.utc).toBe('2026');

    // İşlev yılı İstanbul'a çevirerek okumalıdır.
    expect(row?.tanim).toContain("AT TIME ZONE 'Europe/Istanbul'");
  });

  it('işlem geri alınsa da numara tekrar kullanılmaz', async () => {
    /*
      Dizi çağrısı geri alınmaz; bu bilinçli bir tercihtir. Numara boşlukları
      kabul edilebilir, aynı numaranın iki kayda verilmesi kabul edilemez.
    */
    const before = await generateReferenceNumber('order');

    await db
      .transaction(async (tx) => {
        await generateReferenceNumber('order', tx);
        throw new Error('geri al');
      })
      .catch(() => undefined);

    const after = await generateReferenceNumber('order');

    expect(after).not.toBe(before);
    expect(Number(after.split('-')[2])).toBeGreaterThan(Number(before.split('-')[2]) + 1);
  });
});
