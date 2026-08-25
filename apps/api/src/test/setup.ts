/**
 * Test ortamı hazırlığı.
 *
 * Testler gerçek bir PostgreSQL'e karşı çalışır. Sahte veritabanı kullanmak,
 * denetimde bulunan hataların çoğunu yakalayamazdı: kısıt ihlalleri, tetikleyici
 * davranışı, işlem geri alma ve eşzamanlılık ancak gerçek veritabanında görünür.
 */

import { beforeAll } from 'vitest';
import { sql } from '../platform/db/client.ts';

beforeAll(async () => {
  // Bağlantıyı doğrula; veritabanı ayakta değilse anlaşılır hata ver.
  try {
    await sql`SELECT 1`;
  } catch (error) {
    throw new Error(
      'Test veritabanına bağlanılamadı. Önce `pnpm db:up && pnpm db:migrate` çalıştırın.\n' +
        `Ayrıntı: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});
