/**
 * Giriş denemesi sınırlama ve hesap kilitleme.
 *
 * Elle yazılmış kimlik doğrulamada en kolay atlanan katman budur; oysa şifre
 * hash'lemenin tek başına değeri sınırlıdır: saldırgan yavaş hash'i çevrimiçi
 * deneyemez ama zayıf bir şifreyi yeterince denemeyle bulabilir.
 *
 * İki katman uygulanır:
 *
 * 1. IP bazlı: aynı adresten gelen deneme sayısı sınırlanır. Bir saldırganın
 *    çok sayıda hesabı taramasını (credential stuffing) yavaşlatır.
 *
 * 2. Hesap bazlı: aynı hesaba yapılan başarısız denemeler sayılır; eşik aşılınca
 *    hesap geçici olarak kilitlenir. Kilit süresi kademeli artar.
 *
 * Hesap kilitleme tek başına bir hizmet reddi vektörüdür (saldırgan kasten yanlış
 * şifre girip kullanıcıyı kilitleyebilir). Bu yüzden kilit süresi kısa tutulur ve
 * IP katmanı asıl yükü taşır.
 */

import { and, count, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { loginAttempts, users } from '../db/schema/index.ts';

/** IP başına, pencere içinde izin verilen başarısız deneme sayısı. */
const IP_MAX_FAILURES = 20;
const IP_WINDOW_MS = 15 * 60 * 1000; // 15 dakika

/** Hesap kilitlenmeden önce izin verilen art arda başarısız deneme sayısı. */
const ACCOUNT_MAX_FAILURES = 8;

/** Kilit süreleri: her eşik aşımında bir sonrakine geçilir. */
const LOCK_DURATIONS_MS = [
  1 * 60 * 1000, // 1 dakika
  5 * 60 * 1000, // 5 dakika
  15 * 60 * 1000, // 15 dakika
  60 * 60 * 1000, // 1 saat
] as const;

export interface RateLimitResult {
  readonly allowed: boolean;
  /** Reddedildiyse kaç saniye sonra tekrar denenebileceği. */
  readonly retryAfterSeconds: number;
}

const ALLOWED: RateLimitResult = { allowed: true, retryAfterSeconds: 0 };

/**
 * IP adresinin giriş denemesi kotasını kontrol eder.
 *
 * IP adresi bilinmiyorsa (ters vekil arkasında başlık yoksa) sınır uygulanmaz;
 * bu durumda hesap bazlı katman devrededir.
 */
export async function checkIpRateLimit(ipAddress: string | null): Promise<RateLimitResult> {
  if (ipAddress === null) return ALLOWED;

  const windowStart = new Date(Date.now() - IP_WINDOW_MS);

  const [row] = await db
    .select({ failures: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ipAddress, ipAddress),
        eq(loginAttempts.succeeded, false),
        gte(loginAttempts.createdAt, windowStart),
      ),
    );

  const failures = row?.failures ?? 0;

  if (failures >= IP_MAX_FAILURES) {
    return { allowed: false, retryAfterSeconds: Math.ceil(IP_WINDOW_MS / 1000) };
  }

  return ALLOWED;
}

/**
 * Hesabın kilitli olup olmadığını kontrol eder.
 *
 * Hesap bulunamadığında da `allowed: true` döner — "bu hesap kilitli" yanıtı
 * hesabın varlığını ele verirdi.
 */
export function checkAccountLock(lockedUntil: Date | null): RateLimitResult {
  if (lockedUntil === null) return ALLOWED;

  const remainingMs = lockedUntil.getTime() - Date.now();
  if (remainingMs <= 0) return ALLOWED;

  return { allowed: false, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
}

/** Başarısız denemeyi kaydeder ve gerekirse hesabı kilitler. */
export async function recordFailedAttempt(
  email: string,
  ipAddress: string | null,
  userId: string | null,
): Promise<void> {
  await db.insert(loginAttempts).values({
    email: email.toLowerCase(),
    ipAddress,
    succeeded: false,
  });

  // Hesap yoksa sayaç tutulacak bir satır da yoktur.
  if (userId === null) return;

  const [updated] = await db
    .update(users)
    .set({ failedLoginCount: sql`${users.failedLoginCount} + 1` })
    .where(eq(users.id, userId))
    .returning({ failedLoginCount: users.failedLoginCount });

  if (updated === undefined) return;

  if (updated.failedLoginCount >= ACCOUNT_MAX_FAILURES) {
    // Eşiği kaçıncı kez aştığına göre kilit süresi seçilir.
    const tier = Math.floor(updated.failedLoginCount / ACCOUNT_MAX_FAILURES) - 1;
    const durationIndex = Math.min(tier, LOCK_DURATIONS_MS.length - 1);
    const duration = LOCK_DURATIONS_MS[durationIndex] ?? LOCK_DURATIONS_MS[0];

    await db
      .update(users)
      .set({ lockedUntil: new Date(Date.now() + duration) })
      .where(eq(users.id, userId));
  }
}

/** Başarılı girişi kaydeder ve hesabın kilit sayaçlarını sıfırlar. */
export async function recordSuccessfulAttempt(
  email: string,
  ipAddress: string | null,
  userId: string,
): Promise<void> {
  await db.insert(loginAttempts).values({
    email: email.toLowerCase(),
    ipAddress,
    succeeded: true,
  });

  await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null })
    .where(eq(users.id, userId));
}

/**
 * Genel amaçlı hız sınırı sayacı.
 *
 * Şifre sıfırlama isteği, iletişim formu ve dosya yükleme gibi kötüye kullanıma
 * açık uçlarda kullanılır. Bellek içi tutulur: tek sunuculu kurulumda yeterlidir,
 * çok sunuculu kuruluma geçildiğinde Redis'e taşınmalıdır.
 */
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);

  if (bucket === undefined || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return ALLOWED;
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return ALLOWED;
}

/**
 * Süresi dolmuş bellek kovalarını temizler. Sızıntıyı önlemek için düzenli çağrılır.
 * Zamanlayıcı `unref` edilir ki süreç kapanışını engellemesin.
 */
const cleanupTimer = setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of memoryBuckets) {
      if (bucket.resetAt <= now) memoryBuckets.delete(key);
    }
  },
  5 * 60 * 1000,
);
cleanupTimer.unref();

/** Testlerde sayaçları sıfırlamak için. */
export function resetMemoryRateLimits(): void {
  memoryBuckets.clear();
}
