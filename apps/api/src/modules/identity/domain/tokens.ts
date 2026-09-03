/**
 * Jeton üretimi ve saklanması.
 *
 * Üç yerde kullanılır: oturum jetonu, şifre sıfırlama jetonu, e-posta doğrulama
 * jetonu. Üçü de aynı kurallara uyar:
 *
 * 1. Jeton, kriptografik olarak güvenli rastgele 32 bayttan üretilir (256 bit
 *    entropi). `Math.random()` asla kullanılmaz — tahmin edilebilir.
 *
 * 2. Veritabanına jetonun kendisi değil, SHA-256 özeti yazılır. Veritabanı okuma
 *    yetkisi ele geçiren bir saldırgan mevcut oturumları veya sıfırlama
 *    bağlantılarını kullanamaz.
 *
 * 3. Doğrulama, özet üzerinden indeks araması ile yapılır. Özet uzunluğu sabit
 *    olduğu için ayrıca sabit süreli karşılaştırmaya gerek kalmaz; yine de
 *    kritik yollarda `constantTimeEquals` kullanılır.
 */

import { createHash, randomBytes } from 'node:crypto';

/** Jeton uzunluğu (bayt). 32 bayt = 256 bit entropi. */
const TOKEN_BYTES = 32;

/** Oturum süresi: "beni hatırla" seçilmediğinde. */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 gün

/** Oturum süresi: "beni hatırla" seçildiğinde. */
export const SESSION_REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

/**
 * "Son kullanım" bilgisinin ne sıklıkla tazeleneceği.
 *
 * Oturum SÜRESİ UZAMAZ: `expiresAt` oturum açılırken bir kez belirlenir ve
 * sabit kalır. Bu eşik yalnızca bir yazma frenidir — `lastUsedAt` her istekte
 * güncellenseydi, her sayfa görüntülemesi bir `UPDATE` demek olurdu. Alan,
 * hesap sayfasındaki "açık oturumlar" listesinde cihazı tanımaya yarar.
 */
export const SESSION_LAST_USED_WRITE_INTERVAL_MS = 60 * 60 * 1000; // 1 saat

/** Şifre sıfırlama bağlantısının geçerlilik süresi. Kısa tutulur. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 saat

/** E-posta doğrulama bağlantısının geçerlilik süresi. */
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 1 gün

/**
 * Yeni bir jeton üretir. Yalnızca `createTokenPair` üzerinden kullanılır;
 * özetlenmemiş bir jetonun tek başına dolaşması istenmez.
 *
 * URL-güvenli base64 kullanılır: jeton e-posta bağlantısında ve çerezde
 * kodlama gerektirmeden taşınabilir.
 */
function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Jetonun veritabanında saklanacak özetini üretir.
 *
 * Şifre hash'lemenin aksine burada tuz veya yavaş algoritma gerekmez: jeton
 * zaten 256 bit rastgeledir, sözlük saldırısına konu olamaz. Hızlı bir özet
 * fonksiyonu doğru tercihtir.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Jeton ve özetini birlikte üretir. Jeton kullanıcıya, özet veritabanına gider. */
export function createTokenPair(): { token: string; tokenHash: string } {
  const token = generateToken();
  return { token, tokenHash: hashToken(token) };
}

/** Verilen süre kadar ileride bir son kullanma zamanı üretir. */
export function expiresIn(milliseconds: number): Date {
  return new Date(Date.now() + milliseconds);
}
