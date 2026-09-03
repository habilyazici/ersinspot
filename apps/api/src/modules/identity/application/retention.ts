/**
 * Kimlik verisinin saklama süresi.
 *
 * Kimlik modülü üç tür kısa ömürlü kayıt üretir: oturumlar, tek kullanımlık
 * jetonlar ve giriş denemeleri. Üçü de süresi dolduktan sonra hiçbir işe
 * yaramaz ama silinmezlerse sonsuza kadar birikir.
 *
 * Yalnızca oturumların temizliği yazılmıştı; jeton ve deneme tabloları
 * atlanmıştı. İkisi de her kayıt, her şifre sıfırlama ve her giriş denemesinde
 * satır ekler — yani tam olarak en sık yazılan yerler. `login_attempts`
 * üzerindeki hız sınırı sorgusu tablo büyüdükçe yavaşlar; jeton tabloları ise
 * kullanılmış sıfırlama bağlantılarının özetlerini süresiz saklar.
 *
 * Üç temizlik tek bakım görevinde toplanır: hepsi aynı sıklıkta çalışır ve
 * ayrı görevlere bölmek yalnızca `server.ts` içindeki listeyi uzatırdı.
 */

import { lt, or } from 'drizzle-orm';
import { db } from '../../../platform/db/client.ts';
import { emailVerificationTokens, passwordResetTokens } from '../infrastructure/schema.ts';
import { pruneOldLoginAttempts } from './rate-limit.ts';
import { pruneExpiredSessions } from './session.ts';

/**
 * Kullanılmış veya süresi geçmiş jetonların saklanma süresi.
 *
 * Jeton kullanıldıktan sonra da bir süre durur: "bu bağlantıyı daha önce
 * kullandınız" diyebilmek için kaydın var olması gerekir. Bir hafta, bir
 * kullanıcının bağlantıyı ikinci kez denemesi için fazlasıyla yeterlidir.
 */
const TOKEN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Tükenmiş tek kullanımlık jetonları siler.
 *
 * Hem kullanılmış hem süresi geçmiş jetonlar kapsam içindedir; ikisi de artık
 * kabul edilmiyor.
 */
async function pruneSpentTokens(cutoff: Date): Promise<number> {
  const [resets, verifications] = await Promise.all([
    db
      .delete(passwordResetTokens)
      .where(or(lt(passwordResetTokens.usedAt, cutoff), lt(passwordResetTokens.expiresAt, cutoff)))
      .returning({ id: passwordResetTokens.id }),
    db
      .delete(emailVerificationTokens)
      .where(
        or(
          lt(emailVerificationTokens.usedAt, cutoff),
          lt(emailVerificationTokens.expiresAt, cutoff),
        ),
      )
      .returning({ id: emailVerificationTokens.id }),
  ]);

  return resets.length + verifications.length;
}

/**
 * Süresi dolmuş kimlik kayıtlarını temizler. Zamanlanmış bakım görevi çağırır.
 *
 * @returns Silinen toplam satır sayısı.
 */
export async function pruneExpiredAuthRecords(): Promise<number> {
  const cutoff = new Date(Date.now() - TOKEN_RETENTION_MS);

  const [sessions, tokens, attempts] = await Promise.all([
    pruneExpiredSessions(),
    pruneSpentTokens(cutoff),
    pruneOldLoginAttempts(),
  ]);

  return sessions + tokens + attempts;
}
