/**
 * Sunucu giriş noktası.
 *
 * Uygulamayı ayağa kaldırır ve düzgün kapanışı (graceful shutdown) yönetir:
 * SIGTERM alındığında yeni bağlantı kabul edilmez, devam eden istekler
 * tamamlanır, sonra veritabanı havuzu kapatılır. Bu, dağıtım sırasında
 * yarım kalan işlem olmamasını sağlar.
 */

import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { closeDatabase } from './platform/db/client.ts';
import { env } from './platform/config/env.ts';
import { logger } from './platform/observability/logger.ts';
import { closeMailer } from './platform/mailer.ts';
import { startMaintenance, stopMaintenance } from './platform/maintenance.ts';
import { pruneExpiredSessions } from './modules/identity/index.ts';
import { releaseExpiredReservations } from './modules/catalog/index.ts';
import { cancelExpiredUnpaidOrders } from './modules/ordering/index.ts';
import { cleanupOrphanedFiles } from './modules/files/index.ts';

const app = createApp();

/*
 * Zamanla tetiklenen iş kuralları.
 *
 * Her modül kendi bakım görevini genel sözleşmesinden sunar; burada yalnızca
 * zamanlanırlar. Görevlerin ne yaptığı modülün sorumluluğunda, ne zaman
 * çalıştığı sunucunun.
 *
 * Görevler sunucu porta BAĞLANDIKTAN SONRA başlatılır: bağlanma başarısız
 * olursa (port dolu, izin yok) süreç zaten sonlanacaktır ve yarım açılmış bir
 * sunucunun arka planda veritabanına yazması istenmez.
 */
const maintenanceTasks = [
  {
    name: 'sureli-oturumlari-temizle',
    intervalMs: 60 * 60 * 1000,
    run: pruneExpiredSessions,
  },
  {
    /*
      Sıra önemlidir: önce sipariş iptal edilir, ürünler normal yoldan serbest
      kalır; ardından emniyet ağı kalanları toplar.
    */
    name: 'odemesi-gelmeyen-siparisleri-iptal-et',
    intervalMs: 15 * 60 * 1000,
    run: cancelExpiredUnpaidOrders,
  },
  {
    name: 'suresi-gecmis-rezervasyonlari-serbest-birak',
    intervalMs: 15 * 60 * 1000,
    run: releaseExpiredReservations,
  },
  {
    name: 'yetim-dosyalari-temizle',
    intervalMs: 6 * 60 * 60 * 1000,
    run: cleanupOrphanedFiles,
  },
];

const server = serve(
  {
    fetch: app.fetch,
    port: env.API_PORT,
  },
  (info) => {
    logger.info('Sunucu başlatıldı', {
      port: info.port,
      ortam: env.NODE_ENV,
      webAdresi: env.WEB_ORIGIN,
    });

    startMaintenance(maintenanceTasks);
  },
);

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info('Kapanış başlatıldı', { signal });

  stopMaintenance();

  server.close(() => {
    logger.info('HTTP sunucusu kapandı.');
  });

  // Devam eden isteklerin tamamlanması için kısa bir süre tanınır.
  await new Promise((resolve) => setTimeout(resolve, 2_000));

  closeMailer();

  await closeDatabase();
  logger.info('Veritabanı bağlantıları kapandı.');

  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Yakalanmayan hatalar süreci belirsiz durumda bırakır; loglayıp kapanmak
// sessizce bozuk çalışmaya devam etmekten güvenlidir.
process.on('uncaughtException', (error) => {
  logger.error('Yakalanmayan istisna', { error });
  void shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('İşlenmeyen söz reddi', { reason: String(reason) });
});
