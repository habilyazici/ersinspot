/**
 * Test veritabanına migration uygular.
 *
 * Geliştirme veritabanından ayrı çalışır: testlerin tablo temizliği yerel
 * geliştirme verisini silmemelidir.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../../../../..');
const envFile = path.join(repoRoot, '.env');

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/ersinspot_test') ??
  'postgresql://ersinspot:ersinspot_dev@localhost:5432/ersinspot_test';

console.log(`Test veritabanı: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

await import('./migrate.ts');
