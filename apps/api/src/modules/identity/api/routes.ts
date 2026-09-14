/**
 * Kimlik doğrulama uçları.
 *
 * Bu dosya HTTP katmanıdır: gövdeyi doğrular, hız sınırını uygular, isteğin
 * IP'sini ve tarayıcı bilgisini okur, oturum çerezini yazar ve yanıtı kurar.
 * Kuralların kendisi `application/auth-service.ts` içindedir.
 *
 * Önceden kurallar da buradaydı ve dosya 672 satırdı; `db` istemcisi ve tablo
 * şeması doğrudan içe aktarılıyor, işlemler burada açılıyordu. Altı modülden
 * yalnızca bu modül öyleydi — kalan beşinin rota dosyasında tek bir veritabanı
 * çağrısı yok. Mimari belgesindeki bağımlılık yönü `api → application →
 * infrastructure`; burada ortadaki adım atlanıyordu.
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
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from '@ersinspot/shared';
import * as authService from '../application/auth-service.ts';
import {
  checkAccountLock,
  checkIpRateLimit,
  recordFailedAttempt,
  recordLockedAttempt,
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
import { accountLocked, invalidCredentials, rateLimited } from '../../../platform/errors/index.ts';
import { logger } from '../../../platform/observability/logger.ts';

type Variables = AuthVariables & ValidatedVariables;

export const authRoutes = new Hono<{ Variables: Variables }>();

// ---------------------------------------------------------------------------
// Kayıt
// ---------------------------------------------------------------------------

authRoutes.post(
  '/register',
  rateLimit(10, 60 * 60 * 1000, 'kayit'),
  validateBody(registerSchema),
  async (c) => {
    await authService.register(body(c, registerSchema), clientIp(c));

    /*
      Yanıt gövdesi İKİ DALDA DA AYNIDIR ve hiçbirinde oturum açılmaz. Daha önce
      yeni kayıtta gövdeye kullanıcı nesnesi konuyor ve çerez yazılıyordu; bu,
      yanıtın şeklini bir numaralandırma kanalına çeviriyordu — mesaj aynı olsa
      da saldırgan farkı görürdü.
    */
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

    const sonuc = await authService.authenticate(input.email, input.password);

    /*
      Kilitli hesaptaki deneme denetim kaydına yazılır ama hesap sayacını
      ARTIRMAZ: şifre hiç denenmedi. Sayacı burada da artırmak, saldırganın
      istek göndermeye devam ederek kilidi süresiz uzatmasına izin veriyordu.
    */
    if (sonuc.outcome === 'locked') {
      await recordLockedAttempt(input.email, ip);
      throw accountLocked(checkAccountLock(sonuc.lockedUntil).retryAfterSeconds);
    }

    if (sonuc.outcome === 'invalid') {
      await recordFailedAttempt(input.email, ip, sonuc.userId);
      throw invalidCredentials();
    }

    await recordSuccessfulAttempt(input.email, ip, sonuc.userId);

    await createSession(c, {
      userId: sonuc.userId,
      rememberMe: input.rememberMe,
      ipAddress: ip,
      userAgent: clientUserAgent(c),
    });

    logger.info('Giriş yapıldı', { userId: sonuc.userId });

    return c.json({ success: true, user: sonuc.user });
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
  const user = await authService.getCurrentUser(currentUser(c).id);

  if (user === null) {
    // Oturum geçerli ama kullanıcı silinmiş: oturumu kapat.
    await destroySession(c, currentSession(c).sessionId);
    throw invalidCredentials();
  }

  return c.json({ user });
});

authRoutes.get('/sessions', requireAuth, async (c) => {
  const session = currentSession(c);
  const rows = await listUserSessions(currentUser(c).id);

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
  const user = await authService.updateProfile(currentUser(c).id, body(c, updateProfileSchema));

  return c.json({ success: true, user });
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
    const closedOtherSessions = await authService.changePassword(
      currentUser(c).id,
      currentSession(c).sessionId,
      body(c, changePasswordSchema),
    );

    return c.json({ success: true, closedOtherSessions });
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
    await authService.requestPasswordReset(body(c, forgotPasswordSchema).email, clientIp(c));

    // Hesap bulunsa da bulunmasa da aynı yanıt döner.
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
    await authService.resetPassword(input.token, input.password);

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
    await authService.verifyEmail(body(c, verifyEmailSchema).token);

    return c.json({ success: true });
  },
);

/** Doğrulama e-postasını yeniden gönderir. */
authRoutes.post(
  '/resend-verification',
  requireAuth,
  rateLimit(3, 60 * 60 * 1000, 'dogrulama-tekrar'),
  async (c) => {
    const sent = await authService.resendVerification(currentUser(c));

    return sent
      ? c.json({ success: true })
      : c.json({ success: true, message: 'E-posta adresiniz zaten doğrulanmış.' });
  },
);
