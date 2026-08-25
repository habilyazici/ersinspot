/**
 * Zamanlanmış bakım görevleri.
 *
 * Bazı iş kuralları zamanla tetiklenir: süresi dolan oturumlar temizlenmeli,
 * ödenmeyen siparişlerin rezerve ettiği ürünler satışa dönmeli, bir kayda
 * bağlanmamış yüklemeler silinmelidir.
 *
 * Bu işleri yazmak yetmez — bir şeyin onları çağırması gerekir. İlk taslakta
 * fonksiyonlar yazılmış ama çağıran yoktu; gözden geçirmede fark edildi.
 *
 * ÖLÇEKLEME NOTU: görevler sunucu sürecinin içinde çalışır. Tek örnekli
 * dağıtımda doğrudur ve ek altyapı gerektirmez. Birden çok örneğe geçildiğinde
 * her örnek aynı görevi çalıştırır; o noktada ya bir kilit tablosu (advisory
 * lock) eklenmeli ya da görevler ayrı bir zamanlayıcıya taşınmalıdır.
 */

import { logger } from './observability/logger.ts';

export interface MaintenanceTask {
  readonly name: string;
  /** Çalıştırma aralığı (milisaniye). */
  readonly intervalMs: number;
  /** Görev gövdesi. Etkilenen kayıt sayısını döndürür; loglamada kullanılır. */
  run: () => Promise<number>;
}

const timers: NodeJS.Timeout[] = [];

/**
 * Bir görevi güvenle çalıştırır.
 *
 * Görev hata verirse loglanır ama zamanlayıcı durdurulmaz: geçici bir
 * veritabanı hatası, bakım döngüsünü kalıcı olarak sonlandırmamalıdır.
 */
async function runSafely(task: MaintenanceTask): Promise<void> {
  const startedAt = Date.now();

  try {
    const affected = await task.run();

    if (affected > 0) {
      logger.info('Bakım görevi çalıştı', {
        task: task.name,
        affected,
        durationMs: Date.now() - startedAt,
      });
    } else {
      logger.debug('Bakım görevi çalıştı', { task: task.name, affected: 0 });
    }
  } catch (error) {
    logger.error('Bakım görevi başarısız', {
      task: task.name,
      error: error instanceof Error ? error : String(error),
    });
  }
}

/**
 * Görevleri zamanlar.
 *
 * Zamanlayıcılar `unref` edilir: süreç kapanırken bekleyen bir zamanlayıcı
 * yüzünden asılı kalmaz.
 */
export function startMaintenance(tasks: readonly MaintenanceTask[]): void {
  for (const task of tasks) {
    // Açılışta bir kez çalıştır: sunucu uzun süre kapalı kaldıysa birikmiş
    // işler ilk aralığı beklemeden temizlensin.
    void runSafely(task);

    const timer = setInterval(() => void runSafely(task), task.intervalMs);
    timer.unref();
    timers.push(timer);
  }

  logger.info('Bakım görevleri zamanlandı', {
    count: tasks.length,
    tasks: tasks.map((task) => task.name),
  });
}

/** Zamanlayıcıları durdurur. Düzgün kapanışta ve testlerde çağrılır. */
export function stopMaintenance(): void {
  for (const timer of timers) {
    clearInterval(timer);
  }
  timers.length = 0;
}
