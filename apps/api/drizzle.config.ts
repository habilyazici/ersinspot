import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit yapılandırması.
 *
 * Migration dosyaları SQL olarak üretilir ve depoya işlenir; böylece şema değişikliği
 * kod incelemesinde görünür olur. Eski kod tabanında iki farklı `complete_database_schema.sql`
 * dosyası vardı ve hangisinin geçerli olduğu belirsizdi.
 */
export default defineConfig({
  schema: './src/platform/db/schema.ts',
  out: './src/platform/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ?? 'postgresql://ersinspot:ersinspot_dev@localhost:5432/ersinspot',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
