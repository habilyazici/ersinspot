/**
 * Uygulama birleştirme noktası.
 *
 * Bu dosya, projenin güvenlik haritasıdır: hangi uçların herkese açık, hangilerinin
 * oturum, hangilerinin personel yetkisi gerektirdiği tek bakışta görülür.
 *
 * Eski kod tabanında böyle bir harita yoktu; 98 rota 8.153 satırlık tek dosyaya
 * dağılmıştı ve her birinin yetki durumu ancak gövdesi okunarak anlaşılabiliyordu.
 * Denetimde 58'inin korumasız olduğu bu yüzden ancak sonradan fark edildi.
 *
 * Kural: yeni bir yönlendirici eklerken hangi gruba ait olduğuna karar verilir.
 * `publicApi` grubuna eklemek bilinçli bir tercihtir; unutmakla olmaz.
 */

import { Hono } from 'hono';
import type { AuthVariables } from './platform/http/auth.ts';
import type { ValidatedVariables } from './platform/http/validate.ts';
import { errorHandler, notFoundHandler } from './platform/http/error-handler.ts';
import {
  corsMiddleware,
  csrfProtection,
  rateLimit,
  securityHeaders,
} from './platform/http/security.ts';
import { authRoutes } from './modules/identity/index.ts';
import { catalogRoutes } from './modules/catalog/index.ts';

export type AppVariables = AuthVariables & ValidatedVariables;

export function createApp() {
  const app = new Hono<{ Variables: AppVariables }>();

  // -------------------------------------------------------------------------
  // Küresel middleware
  // -------------------------------------------------------------------------

  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  app.use('*', securityHeaders);
  app.use('*', corsMiddleware);
  app.use('*', csrfProtection);

  // Kaba üst sınır: otomatik tarama araçlarını yavaşlatır.
  // Kimlik doğrulama uçlarının kendi, çok daha sıkı sınırları vardır.
  app.use('*', rateLimit(600, 60 * 1000, 'kuresel'));

  // -------------------------------------------------------------------------
  // Sağlık kontrolü
  // -------------------------------------------------------------------------

  /**
   * Yük dengeleyici ve izleme için. Bilinçli olarak hiçbir sistem bilgisi
   * (sürüm, veritabanı durumu, ortam) döndürmez — bu bilgiler saldırgana
   * yardımcı olur ve dışarıya açık bir uçta yeri yoktur.
   */
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // -------------------------------------------------------------------------
  // Kimlik doğrulama
  // -------------------------------------------------------------------------
  // Yetkilendirme uç bazında yapılır: /login herkese açık, /me oturum gerektirir.

  app.route('/api/auth', authRoutes);

  // -------------------------------------------------------------------------
  // Katalog
  // -------------------------------------------------------------------------
  // Ürün vitrini herkese açık; /admin/* uçları personel yetkisi gerektirir.
  // Yetki, modülün rota tanımlarında bildirilir.

  app.route('/api', catalogRoutes);

  return app;
}

export type App = ReturnType<typeof createApp>;
