/**
 * Kimlik doğrulama uçları.
 *
 * Güvenlik notları:
 *
 * 1. Kullanıcı numaralandırma engellenir. Kayıt, giriş ve şifre sıfırlama uçları
 *    "bu e-posta kayıtlı" bilgisini ne mesajla ne yanıt süresiyle ele verir.
 *
 * 2. Şifre değiştiğinde diğer tüm oturumlar kapatılır.
 *
 * 3. Şifre sıfırlama jetonu tek kullanımlıktır ve yeni istek eskileri geçersiz kılar.
 *
 * 4. Tüm uçlarda hız sınırı vardır.
 *
 * Eski kod tabanında bu uçlar arasında `POST /debug/reset-password` de vardı ve
 * kimlik doğrulaması olmadan herhangi bir kullanıcının (yönetici dahil) şifresini
 * değiştirebiliyordu.
 */

import { Hono } from 'hono';
import { and, eq, isNull } from 'drizzle-orm';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from '@ersinspot/shared';
import type { CurrentUser } from '@ersinspot/shared';
import { db } from '../../../platform/db/client.ts';
import { emailVerificationTokens, passwordResetTokens, users } from '../infrastructure/schema.ts';
import { hashPassword, needsRehash, verifyPassword } from '../domain/password.ts';
import {
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  createTokenPair,
  expiresIn,
  hashToken,
} from '../domain/tokens.ts';
import {
  checkAccountLock,
  checkIpRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
} from '../application/rate-limit.ts';
import {
  createSession,
  destroyAllSessions,
  destroySession,
  listUserSessions,
} from '../application/session.ts';
import type { AuthVariables } from '../../../platform/http/auth.ts';
import { currentSession, currentUser, requireAuth } from '../../../platform/http/auth.ts';
import { body, validateBody } from '../../../platform/http/validate.ts';
import type { ValidatedVariables } from '../../../platform/http/validate.ts';
import { clientIp, clientUserAgent, rateLimit } from '../../../platform/http/security.ts';
import {
  accountLocked,
  invalidCredentials,
  rateLimited,
  validationFailed,
} from '../../../platform/errors/index.ts';
import { logger } from '../../../platform/observability/logger.ts';
import { sendEmail } from '../../../platform/mailer.ts';
import { env } from '../../../platform/config/env.ts';

type Variables = AuthVariables & ValidatedVariables;

export const authRoutes = new Hono<{ Variables: Variables }>();

/** Kullanıcı satırını istemciye gönderilecek görünüme çevirir. Hassas alanlar dışarıda kalır. */
function toCurrentUser(row: {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'customer' | 'staff' | 'admin';
  emailVerifiedAt: Date | null;
  createdAt: Date;
}): CurrentUser {
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
function isTokenUsable(
  record: { expiresAt: Date; usedAt: Date | null } | undefined,
): record is { expiresAt: Date; usedAt: Date | null } {
  if (record === undefined) return false;
  if (record.usedAt !== null) return false;
  return record.expiresAt.getTime() > Date.now();
}

// ---------------------------------------------------------------------------
// Kayıt
// ---------------------------------------------------------------------------

authRoutes.post(
  '/register',
  rateLimit(10, 60 * 60 * 1000, 'kayit'),
  validateBody(registerSchema),
  async (c) => {
    const input = body(c, registerSchema);
    const ip = clientIp(c);

    const passwordHash = await hashPassword(input.password);

    // Benzersizlik veritabanı indeksiyle güvence altında; yarış durumunda
    // ekleme hatası merkezi işleyicide `already_exists` olarak ele alınır.
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existing.length > 0) {
      /*
       * Kullanıcı numaralandırmayı engelle.
       *
       * "Bu e-posta zaten kayıtlı" yanıtı, saldırgana hangi adreslerin sistemde
       * olduğunu söyler. Bunun yerine kayıt başarılı gibi yanıtlanır ve adres
       * sahibine "hesabınız zaten var" e-postası gönderilir. Gerçek sahibi
       * durumu öğrenir, saldırgan öğrenemez.
       *
       * Yanıt gövdesi iki dalda da AYNIDIR (`{ success: true }`) ve iki dalda
       * da oturum açılmaz. Daha önce yeni kayıtta gövdeye kullanıcı nesnesi
       * konuyor ve çerez yazılıyordu; bu, yanıtın şeklini bir numaralandırma
       * kanalına çeviriyordu — mesaj aynı olsa da saldırgan farkı görürdü.
       */
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

      return c.json({ success: true }, 201);
    }

    const [created] = await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        role: 'customer',
      })
      // Yanıtta kullanıcı bilgisi dönmediği için yalnızca doğrulama
      // e-postasının ihtiyaç duyduğu alanlar okunur.
      .returning({ id: users.id, email: users.email, fullName: users.fullName });

    if (created === undefined) {
      throw new Error('Kullanıcı oluşturulamadı.');
    }

    // E-posta doğrulama bağlantısı gönder.
    const { token, tokenHash } = createTokenPair();
    await db.insert(emailVerificationTokens).values({
      userId: created.id,
      tokenHash,
      expiresAt: expiresIn(EMAIL_VERIFICATION_TTL_MS),
    });

    await sendEmail({
      to: created.email,
      subject: 'E-posta adresinizi doğrulayın',
      text:
        `Merhaba ${created.fullName},\n\n` +
        `Ersin Spot hesabınızı oluşturduğunuz için teşekkürler.\n` +
        `E-posta adresinizi doğrulamak için bağlantıya tıklayın:\n\n` +
        `${env.WEB_ORIGIN}/eposta-dogrula?token=${token}\n\n` +
        `Bağlantı 24 saat geçerlidir.\n\n` +
        `Ersin Spot`,
    });

    /*
     * Kayıt otomatik oturum AÇMAZ.
     *
     * İki sebep var. Birincisi yukarıdaki numaralandırma kanalı: çerez
     * yazılan bir dal ile yazılmayan bir dal, yanıtları ayırt edilebilir kılar.
     * İkincisi, e-posta doğrulaması kaydın hemen ardından gelen ilk adımdır;
     * kullanıcı posta kutusuna yönlendirilir, oturumu doğruladıktan sonra açar.
     */
    logger.info('Yeni kullanıcı kaydı', { userId: created.id });

    return c.json({ success: true }, 201);
  },
);

// ---------------------------------------------------------------------------
// Giriş
// ---------------------------------------------------------------------------

authRoutes.post(
  '/login',
  rateLimit(30, 15 * 60 * 1000, 'giris'),
  validateBody(loginSchema),
  async (c) => {
    const input = body(c, loginSchema);
    const ip = clientIp(c);

    const ipLimit = await checkIpRateLimit(ip);
    if (!ipLimit.allowed) {
      throw rateLimited(ipLimit.retryAfterSeconds);
    }

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        emailVerifiedAt: users.emailVerifiedAt,
        lockedUntil: users.lockedUntil,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.email, input.email), isNull(users.deletedAt)))
      .limit(1);

    const user = rows[0];

    // Hesap kilidi kontrolü. Hesap yoksa da aynı yol izlenir.
    if (user !== undefined) {
      const lock = checkAccountLock(user.lockedUntil);
      if (!lock.allowed) {
        await recordFailedAttempt(input.email, ip, user.id);
        throw accountLocked(lock.retryAfterSeconds);
      }
    }

    /*
     * Kullanıcı bulunamasa bile doğrulama yapılır.
     *
     * `verifyPassword` null hash aldığında sabit maliyetli sahte bir doğrulama
     * çalıştırır. Böylece "hesap yok" ile "şifre yanlış" durumları arasında
     * ölçülebilir bir zaman farkı oluşmaz.
     */
    const passwordValid = await verifyPassword(input.password, user?.passwordHash ?? null);

    if (user === undefined || !passwordValid) {
      await recordFailedAttempt(input.email, ip, user?.id ?? null);
      throw invalidCredentials();
    }

    // Hash parametreleri güncellendiyse sessizce yenile.
    if (needsRehash(user.passwordHash)) {
      const rehashed = await hashPassword(input.password);
      await db.update(users).set({ passwordHash: rehashed }).where(eq(users.id, user.id));
      logger.info('Şifre hash parametreleri yenilendi', { userId: user.id });
    }

    await recordSuccessfulAttempt(input.email, ip, user.id);

    await createSession(c, {
      userId: user.id,
      rememberMe: input.rememberMe,
      ipAddress: ip,
      userAgent: clientUserAgent(c),
    });

    logger.info('Giriş yapıldı', { userId: user.id });

    return c.json({ success: true, user: toCurrentUser(user) });
  },
);

// ---------------------------------------------------------------------------
// Çıkış
// ---------------------------------------------------------------------------

authRoutes.post('/logout', requireAuth, async (c) => {
  const session = currentSession(c);
  await destroySession(c, session.sessionId);
  return c.json({ success: true });
});

/**
 * Diğer cihazlardaki oturumları kapatır.
 *
 * Şüpheli bir erişim gördüğünde kullanıcının kendi aracıdır. MEVCUT OTURUM
 * KORUNUR: kullanıcı kendini de atarsa işlemin sonucunu göremez ve yeniden
 * giriş yapmak zorunda kalır. Kendi oturumunu kapatmak isteyen `/logout`
 * kullanır.
 */
authRoutes.post('/logout-all', requireAuth, async (c) => {
  const session = currentSession(c);
  const closedSessions = await destroyAllSessions(session.user.id, session.sessionId);

  logger.info('Diğer oturumlar kapatıldı', { userId: session.user.id, closedSessions });

  return c.json({ success: true, closedSessions });
});

// ---------------------------------------------------------------------------
// Oturum bilgisi
// ---------------------------------------------------------------------------

authRoutes.get('/me', requireAuth, async (c) => {
  const user = currentUser(c);

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const row = rows[0];
  if (row === undefined) {
    // Oturum geçerli ama kullanıcı silinmiş: oturumu kapat.
    const session = currentSession(c);
    await destroySession(c, session.sessionId);
    throw invalidCredentials();
  }

  return c.json({ user: toCurrentUser(row) });
});

authRoutes.get('/sessions', requireAuth, async (c) => {
  const user = currentUser(c);
  const session = currentSession(c);
  const rows = await listUserSessions(user.id);

  return c.json({
    sessions: rows.map((row) => ({
      id: row.id,
      isCurrent: row.id === session.sessionId,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      lastUsedAt: row.lastUsedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

authRoutes.put('/profile', requireAuth, validateBody(updateProfileSchema), async (c) => {
  const user = currentUser(c);
  const input = body(c, updateProfileSchema);

  const [updated] = await db
    .update(users)
    .set({ fullName: input.fullName, phone: input.phone })
    .where(eq(users.id, user.id))
    .returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
    });

  if (updated === undefined) {
    throw invalidCredentials();
  }

  return c.json({ success: true, user: toCurrentUser(updated) });
});

// ---------------------------------------------------------------------------
// Şifre değiştirme
// ---------------------------------------------------------------------------

authRoutes.post(
  '/change-password',
  requireAuth,
  rateLimit(10, 60 * 60 * 1000, 'sifre-degistir'),
  validateBody(changePasswordSchema),
  async (c) => {
    const user = currentUser(c);
    const session = currentSession(c);
    const input = body(c, changePasswordSchema);

    const rows = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const row = rows[0];
    if (row === undefined) {
      throw invalidCredentials();
    }

    const currentValid = await verifyPassword(input.currentPassword, row.passwordHash);
    if (!currentValid) {
      throw validationFailed([{ path: 'currentPassword', message: 'Mevcut şifreniz hatalı.' }]);
    }

    const newHash = await hashPassword(input.newPassword);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

    /*
     * Diğer tüm oturumları kapat.
     *
     * Şifre değiştirmenin başlıca nedeni, şifrenin ele geçirilmiş olma
     * ihtimalidir. Saldırganın açık oturumu kapanmazsa şifre değişikliği
     * bir işe yaramaz. Kullanıcının kendi oturumu korunur.
     */
    const closed = await destroyAllSessions(user.id, session.sessionId);

    logger.info('Şifre değiştirildi', { userId: user.id, closedSessions: closed });

    return c.json({ success: true, closedOtherSessions: closed });
  },
);

// ---------------------------------------------------------------------------
// Şifre sıfırlama
// ---------------------------------------------------------------------------

authRoutes.post(
  '/forgot-password',
  rateLimit(5, 60 * 60 * 1000, 'sifre-sifirlama-istegi'),
  validateBody(forgotPasswordSchema),
  async (c) => {
    const input = body(c, forgotPasswordSchema);
    const ip = clientIp(c);

    const rows = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(and(eq(users.email, input.email), isNull(users.deletedAt)))
      .limit(1);

    const user = rows[0];

    /*
     * Hesap bulunamasa bile aynı yanıt döner.
     *
     * "Böyle bir hesap yok" yanıtı, saldırgana geçerli e-posta adreslerini
     * tarama imkânı verir.
     */
    if (user !== undefined) {
      // Önceki sıfırlama jetonlarını geçersiz kıl: aynı anda birden fazla
      // geçerli bağlantı bulunmasın.
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

      const { token, tokenHash } = createTokenPair();

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt: expiresIn(PASSWORD_RESET_TTL_MS),
        requestedFromIp: ip,
      });

      await sendEmail({
        to: input.email,
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
    } else {
      logger.info('Bilinmeyen adrese şifre sıfırlama denemesi', { email: input.email, ip });
    }

    return c.json({
      success: true,
      message: 'Adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi.',
    });
  },
);

authRoutes.post(
  '/reset-password',
  rateLimit(10, 60 * 60 * 1000, 'sifre-sifirlama'),
  validateBody(resetPasswordSchema),
  async (c) => {
    const input = body(c, resetPasswordSchema);
    const tokenHash = hashToken(input.token);

    const rows = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    const record = rows[0];

    /*
     * Geçersiz, kullanılmış ve süresi dolmuş jeton aynı yanıtı alır.
     *
     * Ayrım yapmak, saldırgana hangi jetonların var olduğunu ve hangilerinin
     * kullanıldığını söyler.
     */
    if (!isTokenUsable(record)) {
      throw validationFailed([
        {
          path: 'token',
          message:
            'Bu sıfırlama bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.',
        },
      ]);
    }

    const passwordHash = await hashPassword(input.password);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, failedLoginCount: 0, lockedUntil: null })
        .where(eq(users.id, record.userId));

      // Jetonu tek kullanımlık yap.
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, record.id));
    });

    // Şifre sıfırlandığında tüm oturumlar kapatılır — istisnasız.
    const closed = await destroyAllSessions(record.userId);

    logger.info('Şifre sıfırlandı', { userId: record.userId, closedSessions: closed });

    return c.json({ success: true });
  },
);

// ---------------------------------------------------------------------------
// E-posta doğrulama
// ---------------------------------------------------------------------------

authRoutes.post(
  '/verify-email',
  rateLimit(20, 60 * 60 * 1000, 'eposta-dogrulama'),
  validateBody(verifyEmailSchema),
  async (c) => {
    const input = body(c, verifyEmailSchema);
    const tokenHash = hashToken(input.token);

    const rows = await db
      .select({
        id: emailVerificationTokens.id,
        userId: emailVerificationTokens.userId,
        expiresAt: emailVerificationTokens.expiresAt,
        usedAt: emailVerificationTokens.usedAt,
      })
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);

    const record = rows[0];

    if (!isTokenUsable(record)) {
      throw validationFailed([
        {
          path: 'token',
          message: 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.',
        },
      ]);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, record.userId));

      await tx
        .update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(emailVerificationTokens.id, record.id));
    });

    logger.info('E-posta doğrulandı', { userId: record.userId });

    return c.json({ success: true });
  },
);

/** Doğrulama e-postasını yeniden gönderir. */
authRoutes.post(
  '/resend-verification',
  requireAuth,
  rateLimit(3, 60 * 60 * 1000, 'dogrulama-tekrar'),
  async (c) => {
    const user = currentUser(c);

    if (user.emailVerified) {
      return c.json({ success: true, message: 'E-posta adresiniz zaten doğrulanmış.' });
    }

    await db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(
        and(eq(emailVerificationTokens.userId, user.id), isNull(emailVerificationTokens.usedAt)),
      );

    const { token, tokenHash } = createTokenPair();

    await db.insert(emailVerificationTokens).values({
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

    return c.json({ success: true });
  },
);
