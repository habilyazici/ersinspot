/**
 * Oturum yönetimi.
 *
 * Oturum jetonu httpOnly çerezde taşınır. Bu, `localStorage`'a göre iki kazanç sağlar:
 *
 * 1. JavaScript jetona erişemez; bir XSS açığı oturumu doğrudan çalamaz.
 * 2. Tarayıcı çerezi otomatik gönderir; istemci kodunun jeton taşıma sorumluluğu kalmaz.
 *
 * Çerezin otomatik gönderilmesi CSRF riskini doğurur; buna karşı üç katman var:
 *   - `SameSite=Lax`: çapraz siteden gelen POST/PUT/DELETE isteklerinde çerez gönderilmez.
 *   - Origin doğrulaması: durum değiştiren isteklerde `Origin` başlığı kontrol edilir.
 *   - Çerez imzası: jeton, sunucu anahtarıyla imzalanır; uydurma çerez reddedilir.
 *
 * Eski kod tabanında oturum `localStorage`'da düz JSON olarak tutuluyordu ve
 * `refresh_token` saklanmasına rağmen hiç kullanılmıyordu.
 */

import { createHmac } from 'node:crypto';
import { and, desc, eq, gt, lt, ne } from 'drizzle-orm';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { db } from '../../../platform/db/client.ts';
import { sessions, users } from '../infrastructure/schema.ts';
import { env, isProduction } from '../../../platform/config/env.ts';
import { constantTimeEquals } from '../domain/password.ts';
import {
  SESSION_LAST_USED_WRITE_INTERVAL_MS,
  SESSION_REMEMBER_TTL_MS,
  SESSION_TTL_MS,
  createTokenPair,
  expiresIn,
  hashToken,
} from '../domain/tokens.ts';

export const SESSION_COOKIE_NAME = 'ersinspot_session';

/**
 * Çerez değerini imzalar.
 *
 * İmza, jetonun sunucu tarafından üretildiğini kanıtlar. Saldırgan rastgele bir
 * çerez uydurup veritabanında arama yaptıramaz — imza tutmadığı için istek
 * veritabanına hiç ulaşmaz.
 */
function sign(value: string): string {
  const signature = createHmac('sha256', env.SESSION_SECRET).update(value).digest('base64url');
  return `${value}.${signature}`;
}

/** İmzayı doğrular ve jetonu döndürür. İmza geçersizse null. */
function unsign(signedValue: string): string | null {
  const separatorIndex = signedValue.lastIndexOf('.');
  if (separatorIndex <= 0) return null;

  const value = signedValue.slice(0, separatorIndex);
  const signature = signedValue.slice(separatorIndex + 1);

  const expected = createHmac('sha256', env.SESSION_SECRET).update(value).digest('base64url');

  return constantTimeEquals(signature, expected) ? value : null;
}

export interface CreateSessionOptions {
  readonly userId: string;
  readonly rememberMe: boolean;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

/**
 * Yeni oturum oluşturur ve çerezi ayarlar.
 *
 * @returns Oturum kimliği — çağıran taraf loglama için kullanabilir; jetonun
 *   kendisi hiçbir yere yazılmaz.
 */
export async function createSession(c: Context, options: CreateSessionOptions): Promise<string> {
  const { token, tokenHash } = createTokenPair();
  const ttl = options.rememberMe ? SESSION_REMEMBER_TTL_MS : SESSION_TTL_MS;
  const expiresAt = expiresIn(ttl);

  const [session] = await db
    .insert(sessions)
    .values({
      userId: options.userId,
      tokenHash,
      expiresAt,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent?.slice(0, 500) ?? null,
    })
    .returning({ id: sessions.id });

  if (session === undefined) {
    throw new Error('Oturum kaydı oluşturulamadı.');
  }

  setCookie(c, SESSION_COOKIE_NAME, sign(token), {
    httpOnly: true,
    // Üretimde yalnızca HTTPS üzerinden gönderilir.
    secure: isProduction,
    // Çapraz siteden gelen durum değiştiren isteklerde çerez gönderilmez.
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(ttl / 1000),
  });

  return session.id;
}

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly phone: string;
  readonly role: 'customer' | 'staff' | 'admin';
  readonly emailVerified: boolean;
}

export interface SessionContext {
  readonly sessionId: string;
  readonly user: AuthenticatedUser;
}

/**
 * İstekteki çerezden oturumu çözer.
 *
 * Süresi dolmuş oturum bulunursa satır silinir ve null döner; böylece süresi
 * geçmiş kayıtlar birikmez.
 *
 * @returns Geçerli oturum yoksa null. Çağıran taraf buna göre 401 döndürür.
 */
export async function resolveSession(c: Context): Promise<SessionContext | null> {
  const signedToken = getCookie(c, SESSION_COOKIE_NAME);
  if (signedToken === undefined) return null;

  const token = unsign(signedToken);
  if (token === null) return null;

  const tokenHash = hashToken(token);

  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      lastUsedAt: sessions.lastUsedAt,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      deletedAt: users.deletedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (row === undefined) return null;

  // Süresi dolmuşsa temizle.
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }

  // Hesap silinmişse oturum geçersizdir.
  if (row.deletedAt !== null) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }

  /*
    Son kullanım bilgisini tazele.

    Oturumun süresini UZATMAZ; `expiresAt` açılışta belirlenir ve sabittir.
    Eşik yalnızca yazma sıklığını sınırlar.
  */
  if (Date.now() - row.lastUsedAt.getTime() > SESSION_LAST_USED_WRITE_INTERVAL_MS) {
    await db.update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, row.sessionId));
  }

  return {
    sessionId: row.sessionId,
    user: {
      id: row.userId,
      email: row.email,
      fullName: row.fullName,
      phone: row.phone,
      role: row.role,
      emailVerified: row.emailVerifiedAt !== null,
    },
  };
}

/** Tek oturumu sonlandırır ve çerezi siler. */
export async function destroySession(c: Context, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  clearSessionCookie(c);
}

/**
 * Kullanıcının tüm oturumlarını sonlandırır.
 *
 * Şifre değiştirildiğinde ve şifre sıfırlandığında çağrılır: şifreyi ele geçirmiş
 * olabilecek birinin açık oturumu da kapanır.
 *
 * @param exceptSessionId Bu oturum korunur — kullanıcı kendi şifresini değiştirdiğinde
 *   sistemden atılmasın diye.
 */
export async function destroyAllSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<number> {
  const condition =
    exceptSessionId === undefined
      ? eq(sessions.userId, userId)
      : and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId));

  const deleted = await db.delete(sessions).where(condition).returning({ id: sessions.id });

  return deleted.length;
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
    secure: isProduction,
    sameSite: 'Lax',
  });
}

/**
 * Kullanıcının açık oturumlarını listeler. "Aktif cihazlarım" ekranı için.
 *
 * En son kullanılan en üstte: kullanıcının kendi cihazı listenin başında
 * durmalı, tanımadığı bir giriş de en yeni olduğu için hemen görünmelidir.
 */
export async function listUserSessions(userId: string) {
  return db
    .select({
      id: sessions.id,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
      lastUsedAt: sessions.lastUsedAt,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.lastUsedAt));
}

/**
 * Süresi dolmuş oturumları siler. Zamanlanmış bakım görevinden çağrılır.
 *
 * @returns Silinen satır sayısı.
 */
export async function pruneExpiredSessions(): Promise<number> {
  const deleted = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });

  return deleted.length;
}
