/**
 * Kimlik kayıtlarının saklama süresi.
 *
 * Kimlik modülü üç tür kısa ömürlü kayıt üretir — oturumlar, tek kullanımlık
 * jetonlar, giriş denemeleri — ve üçü de en sık yazılan tablolardır. Temizlik
 * saatte bir çalışan bir bakım göreviyle olur.
 *
 * Görev sessizce durduğunda kimse bildirim almaz. Belirtisi aylar sonra gelir:
 * `login_attempts` üzerindeki hız sınırı sorgusu yavaşlar ve kullanılmış şifre
 * sıfırlama jetonlarının özetleri süresiz durur. Bu yüzden denetlenir.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../../../platform/db/client.ts';
import { createTestUser, resetDatabase } from '../../../test/helpers.ts';
import {
  emailVerificationTokens,
  loginAttempts,
  passwordResetTokens,
  sessions,
} from '../infrastructure/schema.ts';
import { pruneExpiredAuthRecords } from './retention.ts';

const GUN = 24 * 60 * 60 * 1000;

let userId: string;

beforeEach(async () => {
  await resetDatabase();
  userId = (await createTestUser({ email: 'saklama@ornek.com' })).id;
});

async function sayim(): Promise<{
  sessions: number;
  resets: number;
  verifications: number;
  attempts: number;
}> {
  const [row] = await db.execute<{
    sessions: number;
    resets: number;
    verifications: number;
    attempts: number;
  }>(sql`select
    (select count(*) from sessions)::int as sessions,
    (select count(*) from password_reset_tokens)::int as resets,
    (select count(*) from email_verification_tokens)::int as verifications,
    (select count(*) from login_attempts)::int as attempts`);

  return row ?? { sessions: 0, resets: 0, verifications: 0, attempts: 0 };
}

describe('süresi dolmuş kimlik kayıtlarının temizliği', () => {
  it('süresi geçmiş oturumu siler, süren oturuma dokunmaz', async () => {
    await db.insert(sessions).values([
      { userId, tokenHash: 'gecmis', expiresAt: new Date(Date.now() - GUN) },
      { userId, tokenHash: 'suren', expiresAt: new Date(Date.now() + GUN) },
    ]);

    await pruneExpiredAuthRecords();

    expect((await sayim()).sessions).toBe(1);
  });

  it('tükenmiş jetonları siler', async () => {
    /*
      Jeton kullanıldıktan sonra bir hafta durur: "bu bağlantıyı daha önce
      kullandınız" diyebilmek için kaydın var olması gerekir. Süre dolduktan
      sonra hiçbir işe yaramaz.
    */
    const eski = new Date(Date.now() - 30 * GUN);

    await db.insert(passwordResetTokens).values([
      { userId, tokenHash: 'kullanilmis-eski', expiresAt: eski, usedAt: eski },
      { userId, tokenHash: 'suresi-gecmis-eski', expiresAt: eski },
      { userId, tokenHash: 'gecerli', expiresAt: new Date(Date.now() + GUN) },
    ]);

    await db.insert(emailVerificationTokens).values([
      { userId, tokenHash: 'dogrulama-eski', expiresAt: eski },
      { userId, tokenHash: 'dogrulama-gecerli', expiresAt: new Date(Date.now() + GUN) },
    ]);

    await pruneExpiredAuthRecords();

    const kalan = await sayim();
    expect(kalan.resets).toBe(1);
    expect(kalan.verifications).toBe(1);
  });

  it('yeni kullanılmış jetonu hemen silmez', async () => {
    // Kullanıcı bağlantıyı ikinci kez tıklarsa açıklayıcı bir yanıt almalıdır.
    await db.insert(passwordResetTokens).values({
      userId,
      tokenHash: 'dun-kullanilmis',
      expiresAt: new Date(Date.now() - GUN),
      usedAt: new Date(Date.now() - GUN),
    });

    await pruneExpiredAuthRecords();

    expect((await sayim()).resets).toBe(1);
  });

  it('eski giriş denemelerini siler, yenilerini tutar', async () => {
    /*
      Hız sınırı sorgusu bu tabloyu tarar; her giriş denemesi — başarısız
      olanlar dahil, hatta var olmayan hesaplar için bile — satır ekler.
      Temizlenmezse sınır denetimi zamanla yavaşlar.
    */
    await db.insert(loginAttempts).values([
      { email: 'eski@ornek.com', succeeded: false, createdAt: new Date(Date.now() - 60 * GUN) },
      { email: 'yeni@ornek.com', succeeded: false, createdAt: new Date() },
    ]);

    await pruneExpiredAuthRecords();

    expect((await sayim()).attempts).toBe(1);
  });

  it('silinen satır sayısını döndürür', async () => {
    await db
      .insert(sessions)
      .values({ userId, tokenHash: 'gecmis', expiresAt: new Date(Date.now() - GUN) });

    expect(await pruneExpiredAuthRecords()).toBe(1);

    // İkinci tur silecek bir şey bulmaz.
    expect(await pruneExpiredAuthRecords()).toBe(0);
  });
});
