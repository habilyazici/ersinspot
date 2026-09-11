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

import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { MAX_IMAGE_BYTES } from '@ersinspot/shared';
import { requestTooLarge } from './platform/errors/index.ts';
import type { MiddlewareHandler } from 'hono';
import type { AuthVariables } from './platform/http/auth.ts';
import type { ValidatedVariables } from './platform/http/validate.ts';
import { errorHandler, notFoundHandler } from './platform/http/error-handler.ts';
import { db } from './platform/db/client.ts';
import { env } from './platform/config/env.ts';
import { logger } from './platform/observability/logger.ts';
import {
  corsMiddleware,
  csrfProtection,
  rateLimit,
  securityHeaders,
} from './platform/http/security.ts';
import { authRoutes } from './modules/identity/index.ts';
import { catalogRoutes } from './modules/catalog/index.ts';
import { orderingRoutes } from './modules/ordering/index.ts';
import { servicingRoutes } from './modules/servicing/index.ts';
import { contentRoutes } from './modules/content/index.ts';
import { filesRoutes, localFileRoutes } from './modules/files/index.ts';

export type AppVariables = AuthVariables & ValidatedVariables;

/** Metin gövdeleri için üst sınır. Yükleme ucu kendi sınırını kullanır. */
const MAX_TEXT_BODY_BYTES = 512 * 1024;

/**
 * Yola göre gövde sınırı.
 *
 * Yükleme ucu görselin kendisini taşır; geri kalan her şey metindir. En büyük
 * meşru metin gövdesi blog yazısıdır (50.000 karakter) ve 512 KB onun birkaç
 * katıdır.
 */
const bodyLimitForPath: MiddlewareHandler = async (c, next) => {
  const maxSize = c.req.path === '/api/uploads' ? MAX_IMAGE_BYTES + 64 * 1024 : MAX_TEXT_BODY_BYTES;

  return bodyLimit({
    maxSize,
    onError: () => {
      throw requestTooLarge(maxSize);
    },
  })(c, next);
};

export function createApp() {
  const app = new Hono<{ Variables: AppVariables }>();

  // -------------------------------------------------------------------------
  // Küresel middleware
  // -------------------------------------------------------------------------

  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  /*
    İstek gövdesi ÜST SINIRI.

    Sınır yokken herkese açık bir uca (iletişim formu gibi) yirmi megabaytlık
    bir JSON gönderilebiliyor ve sunucu onu tamponlayıp ayrıştırıyordu:
    doğrulama gövdeyi okuduktan SONRA çalışır, dolayısıyla reddedilen istek de
    belleği bir kez ödemiş oluyordu. Birkaç eşzamanlı istek yeter.

    Vekil sunucunun `client_max_body_size` ayarına güvenilmez — dosya
    yüklemesine izin vermek için o değer zaten yükseltilmek zorunda ve
    yükseltildiğinde JSON uçları da aynı sınırı devralır. Savunma katmanları
    birbirine güvenmez.

    Sınır TEK middleware'de seçilir, yol başına iki ayrı `use` ile değil: Hono
    eşleşen middleware'lerin HEPSİNİ çalıştırır, dolayısıyla `/api/uploads`
    hem kendi sınırından hem küresel sınırdan geçiyor ve 1 MB'lık bir görsel
    metin sınırına takılıyordu.
  */
  app.use('*', bodyLimitForPath);

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
   * CANLILIK: süreç ayakta mı?
   *
   * Süreç yöneticisinin (systemd, pm2) yeniden başlatma kararı buna bakar ve
   * bu yüzden BAĞIMLILIKLARA BAKMAZ. Veritabanı erişilemez olduğunda API'yi
   * yeniden başlatmak veritabanını geri getirmez; yalnızca bir yeniden
   * başlatma döngüsü üretir ve gerçek arızayı gizler.
   *
   * Bilinçli olarak hiçbir sistem bilgisi (sürüm, ortam) döndürmez — bu
   * bilgiler saldırgana yardımcı olur ve dışarıya açık bir uçta yeri yoktur.
   */
  app.get('/health', (c) => c.json({ status: 'ok' }));

  /**
   * HAZIRLIK: istek karşılayabilir mi?
   *
   * İzleme ve trafik yönlendirme buna bakmalıdır. `/health` tek başına
   * yeterliydi sanılıyordu ama veritabanı düştüğünde de 200 döndürüyor: site
   * her isteğe 500 verirken izleme yemyeşil görünüyor ve arızayı ilk fark eden
   * müşteri oluyordu.
   *
   * Sorgu en ucuz olanıdır (`select 1`) ve sonucu yalnızca "hazır / değil"
   * olarak bildirilir; hata metni, sürücü ayrıntısı ya da bağlantı bilgisi
   * dışarı çıkmaz.
   */
  app.get('/ready', async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ status: 'ready' });
    } catch (error) {
      logger.error('Hazırlık denetimi başarısız', {
        error: error instanceof Error ? error : String(error),
      });

      return c.json({ status: 'unavailable' }, 503);
    }
  });

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

  // -------------------------------------------------------------------------
  // Sepet ve sipariş
  // -------------------------------------------------------------------------
  // Sepet ve sipariş uçlarının tamamı oturum gerektirir; tek istisna takip
  // numarasıyla sipariş durumu sorgulamadır. Yetki modülün rota tanımlarında.

  app.route('/api', orderingRoutes);

  // -------------------------------------------------------------------------
  // Hizmet talepleri
  // -------------------------------------------------------------------------
  // Nakliye, teknik servis ve satış talebi. Talep oluşturma oturum ve e-posta
  // doğrulaması gerektirir; /admin/* uçları personel yetkisi ister.
  // Tek istisna nakliye fiyat tahmini: üye olmamış ziyaretçi de sorabilir.

  app.route('/api', servicingRoutes);

  // -------------------------------------------------------------------------
  // İçerik ve dosyalar
  // -------------------------------------------------------------------------
  // Blog, SSS ve site ayarları vitrinde herkese açık; yazma uçları personel
  // yetkisi ister. İletişim formu oturumsuzdur ve hız sınırıyla korunur.
  // Dosya yükleme oturum gerektirir ve amaç bazında yetki denetlenir.

  app.route('/api', contentRoutes);
  app.route('/api', filesRoutes);

  /*
    Yerel depolamada dosyaları sunan rota.

    Adres `STORAGE_PUBLIC_URL`'den türetilir; iki yerde ayrı ayrı yazılsaydı
    biri değiştiğinde diğeri sessizce kopardı — denetimde bulunan sorun tam
    olarak buydu (adres üretiliyordu ama karşılayan rota yoktu).

    S3 sürücüsünde dosyalar CDN'den sunulur, bu rota hiç bağlanmaz.
  */
  if (env.STORAGE_DRIVER === 'local') {
    const publicPath = new URL(env.STORAGE_PUBLIC_URL).pathname.replace(/\/$/, '');

    if (publicPath !== '') {
      app.route(publicPath, localFileRoutes);
    }
  }

  return app;
}

export type App = ReturnType<typeof createApp>;
