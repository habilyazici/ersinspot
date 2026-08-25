import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Test yapılandırması.
 *
 * Testler AYRI bir veritabanına karşı çalışır (`ersinspot_test`). Geliştirme
 * veritabanıyla aynı olsaydı, testlerin tablo temizliği yerel verinizi silerdi.
 *
 * `.env` dosyası yüklenir ama `DATABASE_URL` ve `NODE_ENV` test değerleriyle
 * geçersiz kılınır. CI ortamında `.env` yoktur; değerler doğrudan ortamdan gelir.
 */

const repoRoot = path.resolve(import.meta.dirname, '../..');
const envFile = path.join(repoRoot, '.env');

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

// Test ortamı zorunlu geçersiz kılmalar.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/ersinspot_test') ??
  'postgresql://ersinspot:ersinspot_dev@localhost:5432/ersinspot_test';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Testler aynı veritabanını paylaştığı için dosyalar sıralı çalışır.
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
