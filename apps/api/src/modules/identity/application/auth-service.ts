/**
 * Kimlik doğrulama kullanım senaryoları.
 *
 * Kayıt, giriş, şifre değiştirme, şifre sıfırlama ve e-posta doğrulama. Hepsi
 * `api/routes.ts` içinde yazılıydı; rota dosyası 672 satırdı ve veritabanı
 * işlemlerini kendisi açıyordu. Kuralların HTTP'yi bilen bir dosyada durması
 * iki şeyi zorlaştırır: kuralı HTTP kurmadan okumak ve aynı kuralı başka bir
 * girişten (bir bakım betiği, ileride bir yönetim aracı) çağırmak.
 *
 * OTURUM ÇEREZİ BURADA YAZILMAZ. `createSession` Hono bağlamına ihtiyaç duyar
 * ve çerez yazmak HTTP işidir; bu katman kimin doğrulandığını söyler, çerezi
 * rota koyar. Oturum KAPATMA ise bağlam istemez (kullanıcı kimliğiyle çalışır)
 * ve kuralın parçasıdır: şifre değişince diğer oturumlar kapanmalıdır.
 */

import type { CurrentUser } from '@ersinspot/shared';
import { env } from '../../../platform/config/env.ts';
import { invalidCredentials, validationFailed } from '../../../platform/errors/index.ts';
import { sendEmail } from '../../../platform/mailer.ts';
import { logger } from '../../../platform/observability/logger.ts';
import { hashPassword, needsRehash, verifyPassword } from '../domain/password.ts';
import {
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  createTokenPair,
  expiresIn,
  hashToken,
} from '../domain/tokens.ts';
import * as repository from '../infrastructure/user-repository.ts';
import type { PublicUserRow, TokenRow } from '../infrastructure/user-repository.ts';
import { destroyAllSessions } from './session.ts';

/** Kullanıcı satırını istemciye gönderilecek görünüme çevirir. Hassas alanlar dışarıda kalır. */
export function toCurrentUser(row: PublicUserRow): CurrentUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    role: row.role,
    emailVerified: row.emailVerifiedAt !== null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Tek kullanımlık jetonun hâlâ kullanılabilir olup olmadığını söyler.
 *
 * Üç ret nedeni (kayıt yok, daha önce kullanılmış, süresi dolmuş) tek bir
 * fonksiyonda toplanır ki çağıran taraf hepsine aynı yanıtı versin.
 */
function isTokenUsable(record: TokenRow | undefined): record is TokenRow {
  if (record === undefined) return false;
  if (record.usedAt !== null) return false;
  return record.expiresAt.getTime() > Date.now();
}

// ---------------------------------------------------------------------------
// Kayıt
// ---------------------------------------------------------------------------

/**
 * Yeni hesap oluşturur ve doğrulama e-postası gönderir.
 *
 * Adres zaten kayıtlıysa hesap oluşturulmaz ama çağıran taraf bunu ANLAYAMAZ:
 * iki dal da aynı şeyi döndürür ve ikisinde de bir e-posta gider. "Bu e-posta
 * zaten kayıtlı" yanıtı, saldırgana hangi adreslerin sistemde olduğunu
 * söylerdi; bunun yerine adresin gerçek sahibi durumu postasından öğrenir.
 */
export async function register(
  input: { email: string; password: string; fullName: string; phone: string },
  ip: string | null,
): Promise<void> {
  const passwordHash = await hashPassword(input.password);

  // Benzersizlik veritabanı indeksiyle güvence altında; yarış durumunda
  // ekleme hatası merkezi işleyicide `already_exists` olarak ele alınır.
  if (await repository.existsByEmail(input.email)) {
    logger.info('Var olan adrese kayıt denemesi', { email: input.email, ip });

    await sendEmail({
      to: input.email,
      subject: 'Ersin Spot hesabınız zaten mevcut',
      text:
        `Merhaba,\n\n` +
        `Bu e-posta adresiyle kayıt olma denemesi yapıldı, ancak hesabınız zaten mevcut.\n` +
        `Şifrenizi hatırlamıyorsanız şifre sıfırlama bağlantısını kullanabilirsiniz:\n` +
        `${env.WEB_ORIGIN}/sifremi-unuttum\n\n` +
        `Bu denemeyi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.\n\n` +
        `Ersin Spot`,
    });

    return;
  }

  const created = await repository.insertUser({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    phone: input.phone,
  });

  if (created === undefined) {
    throw new Error('Kullanıcı oluşturulamadı.');
  }

  await sendVerificationEmail(created);

  /*
   * Kayıt otomatik oturum AÇMAZ.
   *
   * İki sebep var. Birincisi yukarıdaki numaralandırma kanalı: çerez yazılan
   * bir dal ile yazılmayan bir dal, yanıtları ayırt edilebilir kılar. İkincisi,
   * e-posta doğrulaması kaydın hemen ardından gelen ilk adımdır; kullanıcı
   * posta kutusuna yönlendirilir, oturumu doğruladıktan sonra açar.
   */
  logger.info('Yeni kullanıcı kaydı', { userId: created.id });
}

/** Doğrulama jetonu üretir, bekleyenleri geçersiz kılar ve bağlantıyı gönderir. */
async function sendVerificationEmail(user: {
  id: string;
  email: string;
  fullName: string;
}): Promise<void> {
  await repository.supersedeEmailVerificationTokens(user.id);

  const { token, tokenHash } = createTokenPair();

  await repository.insertEmailVerificationToken({
    userId: user.id,
    tokenHash,
    expiresAt: expiresIn(EMAIL_VERIFICATION_TTL_MS),
  });

  await sendEmail({
    to: user.email,
    subject: 'E-posta adresinizi doğrulayın',
    text:
      `Merhaba ${user.fullName},\n\n` +
      `E-posta adresinizi doğrulamak için bağlantıya tıklayın:\n\n` +
      `${env.WEB_ORIGIN}/eposta-dogrula?token=${token}\n\n` +
      `Bağlantı 24 saat geçerlidir.\n\n` +
      `Ersin Spot`,
  });
}

// ---------------------------------------------------------------------------
// Giriş
// ---------------------------------------------------------------------------

/**
 * Giriş denemesinin sonucu.
 *
 * Üç dal TEK BİR OKUMADAN çıkar. Kilidi ayrı bir fonksiyonda sormak, her
 * girişte kullanıcı satırını iki kez okumak demekti; refaktörün ilk hâlinde
 * öyle yapmıştım.
 */
export type LoginOutcome =
  | { outcome: 'locked'; userId: string; lockedUntil: Date }
  | { outcome: 'invalid'; userId: string | null }
  | { outcome: 'ok'; userId: string; user: CurrentUser };

/**
 * Kimlik bilgilerini doğrular.
 *
 * Hesap bulunamasa bile şifre doğrulaması ÇALIŞTIRILIR: `verifyPassword` null
 * özet aldığında sabit maliyetli sahte bir doğrulama yapar, böylece "hesap yok"
 * ile "şifre yanlış" arasında ölçülebilir bir zaman farkı oluşmaz.
 *
 * KİLİTLİ hesapta şifre hiç denenmez ve sonuç `locked` döner; çağıran taraf
 * denemeyi kaydeder ama hesap sayacını artırmaz. Deneme kaydı çağıranın işidir:
 * isteğin IP'sine bağlıdır ve o bilgi yalnızca HTTP katmanında vardır.
 */
export async function authenticate(email: string, password: string): Promise<LoginOutcome> {
  const row = await repository.findCredentialsByEmail(email);

  if (row !== undefined && row.lockedUntil !== null && row.lockedUntil.getTime() > Date.now()) {
    return { outcome: 'locked', userId: row.id, lockedUntil: row.lockedUntil };
  }

  const passwordValid = await verifyPassword(password, row?.passwordHash ?? null);

  if (row === undefined || !passwordValid) {
    return { outcome: 'invalid', userId: row?.id ?? null };
  }

  // Hash parametreleri güncellendiyse sessizce yenile.
  if (needsRehash(row.passwordHash)) {
    await repository.updatePasswordHash(row.id, await hashPassword(password));
    logger.info('Şifre hash parametreleri yenilendi', { userId: row.id });
  }

  return { outcome: 'ok', userId: row.id, user: toCurrentUser(row) };
}

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

export async function getCurrentUser(userId: string): Promise<CurrentUser | null> {
  const row = await repository.findPublicById(userId);
  return row === undefined ? null : toCurrentUser(row);
}

export async function updateProfile(
  userId: string,
  input: { fullName: string; phone: string },
): Promise<CurrentUser> {
  const updated = await repository.updateProfile(userId, input);

  if (updated === undefined) {
    throw invalidCredentials();
  }

  return toCurrentUser(updated);
}

// ---------------------------------------------------------------------------
// Şifre değiştirme
// ---------------------------------------------------------------------------

/**
 * Oturum açıkken şifreyi değiştirir ve DİĞER oturumları kapatır.
 *
 * Şifre değiştirmenin başlıca nedeni, şifrenin ele geçirilmiş olma ihtimalidir.
 * Saldırganın açık oturumu kapanmazsa şifre değişikliği bir işe yaramaz.
 * Kullanıcının kendi oturumu korunur.
 *
 * @returns Kapatılan diğer oturum sayısı.
 */
export async function changePassword(
  userId: string,
  currentSessionId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<number> {
  const passwordHash = await repository.findPasswordHash(userId);

  if (passwordHash === undefined) {
    throw invalidCredentials();
  }

  if (!(await verifyPassword(input.currentPassword, passwordHash))) {
    throw validationFailed([{ path: 'currentPassword', message: 'Mevcut şifreniz hatalı.' }]);
  }

  await repository.updatePasswordHash(userId, await hashPassword(input.newPassword));

  const closed = await destroyAllSessions(userId, currentSessionId);

  logger.info('Şifre değiştirildi', { userId, closedSessions: closed });

  return closed;
}

// ---------------------------------------------------------------------------
// Şifre sıfırlama
// ---------------------------------------------------------------------------

/**
 * Sıfırlama bağlantısı gönderir.
 *
 * Hesap bulunamazsa hiçbir şey yapılmaz ve çağıran taraf farkı göremez:
 * "böyle bir hesap yok" yanıtı, saldırgana geçerli adresleri tarama imkânı
 * verir.
 */
export async function requestPasswordReset(email: string, ip: string | null): Promise<void> {
  const user = await repository.findActiveByEmail(email);

  if (user === undefined) {
    logger.info('Bilinmeyen adrese şifre sıfırlama denemesi', { email, ip });
    return;
  }

  // Önceki sıfırlama jetonlarını geçersiz kıl: aynı anda birden fazla geçerli
  // bağlantı bulunmasın.
  await repository.supersedePasswordResetTokens(user.id);

  const { token, tokenHash } = createTokenPair();

  await repository.insertPasswordResetToken({
    userId: user.id,
    tokenHash,
    expiresAt: expiresIn(PASSWORD_RESET_TTL_MS),
    requestedFromIp: ip,
  });

  await sendEmail({
    to: email,
    subject: 'Şifre sıfırlama isteği',
    text:
      `Merhaba ${user.fullName},\n\n` +
      `Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:\n\n` +
      `${env.WEB_ORIGIN}/sifre-sifirla?token=${token}\n\n` +
      `Bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir.\n\n` +
      `Bu isteği siz yapmadıysanız bu e-postayı yok sayın; şifreniz değişmeyecektir.\n\n` +
      `Ersin Spot`,
  });

  logger.info('Şifre sıfırlama bağlantısı gönderildi', { userId: user.id, ip });
}

/**
 * Jetonu tüketip şifreyi değiştirir ve TÜM oturumları kapatır — istisnasız.
 *
 * Geçersiz, kullanılmış ve süresi dolmuş jeton aynı yanıtı alır: ayrım yapmak,
 * saldırgana hangi jetonların var olduğunu ve hangilerinin kullanıldığını
 * söyler.
 */
export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await repository.findPasswordResetToken(hashToken(token));

  if (!isTokenUsable(record)) {
    throw validationFailed([
      {
        path: 'token',
        message: 'Bu sıfırlama bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.',
      },
    ]);
  }

  const passwordHash = await hashPassword(password);

  await repository.transaction(async (tx) => {
    await repository.resetPasswordAndUnlock(record.userId, passwordHash, tx);
    await repository.consumePasswordResetToken(record.id, tx);
  });

  const closed = await destroyAllSessions(record.userId);

  logger.info('Şifre sıfırlandı', { userId: record.userId, closedSessions: closed });
}

// ---------------------------------------------------------------------------
// E-posta doğrulama
// ---------------------------------------------------------------------------

export async function verifyEmail(token: string): Promise<void> {
  const record = await repository.findEmailVerificationToken(hashToken(token));

  if (!isTokenUsable(record)) {
    throw validationFailed([
      { path: 'token', message: 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.' },
    ]);
  }

  await repository.transaction(async (tx) => {
    await repository.markEmailVerified(record.userId, tx);
    await repository.consumeEmailVerificationToken(record.id, tx);
  });

  logger.info('E-posta doğrulandı', { userId: record.userId });
}

/** Doğrulama e-postasını yeniden gönderir. Adres zaten doğrulanmışsa hiçbir şey yapmaz. */
export async function resendVerification(user: {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
}): Promise<boolean> {
  if (user.emailVerified) return false;

  await sendVerificationEmail(user);

  return true;
}
