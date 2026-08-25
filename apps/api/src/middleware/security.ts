/**
 * Güvenlik middleware'leri: CORS, CSRF ve güvenlik başlıkları.
 *
 * Eski kod tabanında CORS `origin: "*"` ile açıktı ve `Authorization` başlığına
 * izin veriliyordu; herhangi bir site kendi sayfasından API'yi çağırabiliyordu.
 * Burada izin verilen kaynak açıkça listelenir.
 */

import type { Context, MiddlewareHandler, Next } from 'hono';
import { cors } from 'hono/cors';
import { env, isProduction } from '../lib/env.ts';
import { forbidden, rateLimited } from '../lib/errors.ts';
import { checkMemoryRateLimit } from '../auth/rate-limit.ts';

/**
 * İzin verilen kaynaklar.
 *
 * Yalnızca yapılandırmada bildirilen tarayıcı uygulaması. Joker karakter
 * kullanılmaz — kimlik bilgisi taşıyan isteklerde joker zaten tarayıcı tarafından
 * reddedilir, ama açık liste niyeti de belgeler.
 */
const allowedOrigins = [env.WEB_ORIGIN];

export const corsMiddleware = cors({
  origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  exposeHeaders: ['Retry-After'],
  // Oturum çerezinin çapraz kaynaklı isteklerde gönderilebilmesi için zorunlu.
  credentials: true,
  maxAge: 600,
});

/**
 * CSRF koruması: durum değiştiren isteklerde kaynak doğrulaması.
 *
 * `SameSite=Lax` çerez ayarı çapraz siteden gelen POST isteklerinde çerezin
 * gönderilmesini zaten engeller. Bu middleware ikinci katmandır: `Origin`
 * başlığı beklenen değerlerden biri değilse istek reddedilir.
 *
 * GET/HEAD/OPTIONS istekleri durum değiştirmediği için muaftır.
 */
export const csrfProtection: MiddlewareHandler = async (c: Context, next: Next) => {
  const method = c.req.method;

  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    await next();
    return;
  }

  const origin = c.req.header('Origin');

  // Origin başlığı olmayan istekler tarayıcı dışından gelir (curl, mobil istemci).
  // Bunlarda çerez tabanlı oturum kullanılmadığı sürece CSRF riski yoktur; ancak
  // çerez varsa reddedilir.
  if (origin === undefined) {
    const hasCookie = c.req.header('Cookie') !== undefined;
    if (hasCookie) {
      throw forbidden('İstek kaynağı doğrulanamadı.');
    }
    await next();
    return;
  }

  if (!allowedOrigins.includes(origin)) {
    throw forbidden('İstek kaynağı doğrulanamadı.');
  }

  await next();
};

/**
 * Güvenlik başlıkları.
 *
 * API yalnızca JSON döndürdüğü için içerik güvenliği politikası minimaldir;
 * asıl CSP tarayıcı uygulamasının sunucusunda tanımlanır. Buradaki başlıklar
 * API yanıtlarının yanlış yorumlanmasını engeller.
 */
export const securityHeaders: MiddlewareHandler = async (c: Context, next: Next) => {
  await next();

  // Tarayıcı, sunucunun bildirdiği içerik türünü tahminle değiştirmesin.
  c.header('X-Content-Type-Options', 'nosniff');

  // API yanıtları hiçbir zaman çerçeve içinde gösterilmemeli.
  c.header('X-Frame-Options', 'DENY');

  // Yönlendirmelerde tam adres sızmasın.
  c.header('Referrer-Policy', 'no-referrer');

  // API yanıtları önbelleğe alınmamalı: kişisel veri içerebilir.
  c.header('Cache-Control', 'no-store');

  if (isProduction) {
    // HTTPS zorunluluğu. Yalnızca üretimde; yerelde http kullanıldığı için eklenmez.
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
};

/**
 * İstek başına genel hız sınırı.
 *
 * Kimlik doğrulama uçlarının kendi, daha sıkı sınırları vardır. Bu, tüm API için
 * kaba bir üst sınırdır ve otomatik tarama araçlarını yavaşlatır.
 *
 * @param maxRequests Pencere içinde izin verilen istek sayısı.
 * @param windowMs Pencere süresi.
 * @param keyPrefix Farklı uç grupları için ayrı sayaç tutmak üzere.
 */
export function rateLimit(
  maxRequests: number,
  windowMs: number,
  keyPrefix = 'genel',
): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const ip = clientIp(c) ?? 'bilinmiyor';
    const result = checkMemoryRateLimit(`${keyPrefix}:${ip}`, maxRequests, windowMs);

    if (!result.allowed) {
      throw rateLimited(result.retryAfterSeconds);
    }

    await next();
  };
}

/**
 * İstemcinin IP adresini çıkarır.
 *
 * Ters vekil arkasında çalışırken `X-Forwarded-For` başlığının ilk değeri kullanılır.
 * Bu başlık istemci tarafından uydurulabilir; bu yüzden yalnızca hız sınırı ve
 * denetim kaydı için kullanılır, yetkilendirme kararında ASLA kullanılmaz.
 */
export function clientIp(c: Context): string | null {
  const forwarded = c.req.header('X-Forwarded-For');
  if (forwarded !== undefined) {
    const first = forwarded.split(',')[0]?.trim();
    if (first !== undefined && first !== '') return first;
  }

  const realIp = c.req.header('X-Real-IP');
  if (realIp !== undefined && realIp !== '') return realIp;

  return null;
}

/** İstemcinin tarayıcı bilgisini döndürür. Oturum listesinde cihaz tanımak için. */
export function clientUserAgent(c: Context): string | null {
  return c.req.header('User-Agent') ?? null;
}
