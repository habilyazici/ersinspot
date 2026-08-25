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

// Diğer modüllerin kullanıcı bilgisine erişimi bu fonksiyon üzerinden olur;
// users tablosuna doğrudan sorgu yapılmaz.
export { getUserSummary, getUserSummaries } from './application/user-directory.ts';
export type { UserSummary } from './application/user-directory.ts';
