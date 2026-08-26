/**
 * Migration çalıştırıcı.
 *
 * `pnpm db:migrate` ile çalışır. Uygulanan migration'lar
 * `drizzle.__drizzle_migrations` tablosunda tutulur; aynı migration iki kez
 * uygulanmaz.
 *
 * KAYIT DIŞI DOSYA DENETİMİ: Drizzle yalnızca `meta/_journal.json` içinde
 * kayıtlı dosyaları çalıştırır. Klasöre elle bir .sql eklendiğinde — ki
 * `drizzle-kit generate` ile üretilemeyen indeks, tetikleyici ve kısıt
 * eklemelerinde bu olur — dosya journal'a yazılmadıysa migration SESSİZCE
 * atlanır ve "tamamlandı" mesajı yanıltıcı olur. Bu tam olarak bir kez başımıza
 * geldi; artık böyle bir dosya varsa çalıştırıcı hata verip durur.
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { closeDatabase, db } from './client.ts';

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

interface Journal {
  readonly entries: readonly { readonly tag: string }[];
}

/** Journal'a kaydedilmemiş .sql dosyalarını bulur. */
function findUnregisteredMigrations(): readonly string[] {
  const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal;
  const registered = new Set(journal.entries.map((entry) => entry.tag));

  return readdirSync(migrationsFolder)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => name.replace(/\.sql$/, ''))
    .filter((tag) => !registered.has(tag))
    .sort();
}

async function main(): Promise<void> {
  const unregistered = findUnregisteredMigrations();

  if (unregistered.length > 0) {
    throw new Error(
      `Şu migration dosyaları meta/_journal.json içinde kayıtlı değil ve ` +
        `çalıştırılmayacaktı: ${unregistered.join(', ')}. ` +
        `Journal'a "entries" dizisine sıradaki idx ile ekleyin.`,
    );
  }

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
