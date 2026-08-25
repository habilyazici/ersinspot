/**
 * Migration çalıştırıcı.
 *
 * `pnpm db:migrate` ile çalışır. Uygulanan migration'lar `drizzle.__drizzle_migrations`
 * tablosunda tutulur; aynı migration iki kez uygulanmaz.
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { closeDatabase, db } from './client.ts';

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

async function main(): Promise<void> {
  console.log('Migration uygulanıyor...');
  console.log(`Klasör: ${migrationsFolder}`);

  await migrate(db, { migrationsFolder });

  console.log('Migration tamamlandı.');
  await closeDatabase();
}

main().catch((error: unknown) => {
  console.error('Migration başarısız:', error);
  process.exitCode = 1;
  void closeDatabase();
});
