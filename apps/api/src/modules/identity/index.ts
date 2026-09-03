/**
 * identity modülü — genel sözleşme.
 *
 * Bu dosya, diğer modüllerin `identity` hakkında görebildiği TEK yüzeydir.
 * Tablolar, repository'ler ve iç yardımcılar bilinçli olarak dışa aktarılmaz.
 *
 * Sahip olduğu tablolar:
 *   users, sessions, password_reset_tokens, email_verification_tokens, login_attempts
 */

// HTTP yönlendiricisi — app.ts tarafından bağlanır.
export { authRoutes } from './api/routes.ts';

// Oturum çözümleme — platform/http/auth.ts middleware'i tarafından kullanılır.
export { resolveSession } from './application/session.ts';
export type { AuthenticatedUser, SessionContext } from './application/session.ts';

/*
  Diğer modüller kullanıcı adına ve iletişim bilgisine İHTİYAÇ DUYMAZ.

  Sipariş ve talep kayıtları iletişim bilgisini kendi satırlarında anlık
  görüntü olarak taşır: müşteri sonradan adını değiştirse bile geçmiş sipariş,
  teslimatın yapıldığı ada bakar. Buraya bir okuma yüzeyi (`getUserSummary`)
  yazılmıştı ama hiçbir modül çağırmıyordu — sözleşmede duran, çağıranı
  olmayan bir yüzey ilk ihtiyaçta yanlış yere bağlanmayı davet eder.
  Gerçekten gerektiğinde eklemek kolaydır.
*/

// Bakım görevi: süresi dolmuş oturumları, tükenmiş jetonları ve saklama
// süresi geçmiş giriş denemelerini temizler.
export { pruneExpiredAuthRecords } from './application/retention.ts';
