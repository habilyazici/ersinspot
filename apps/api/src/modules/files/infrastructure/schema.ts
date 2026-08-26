/**
 * Yüklenen dosya kayıtları.
 *
 * Her yükleme burada kayıt altına alınır. İki amacı var:
 *
 * 1. Sahiplik: dosyayı kimin yüklediği bilinir, silme yetkisi denetlenebilir.
 *    Eski kod tabanında yükleme ve silme uçları tamamen korumasızdı.
 *
 * 2. Yetim dosya temizliği: yükleme yapılıp form gönderilmezse dosya bir kayda
 *    bağlanmaz (`attachedAt` boş kalır). Zamanlanmış görev, belirli bir süreden
 *    eski ve bağlanmamış dosyaları depolamadan siler.
 */

import { bigint, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from '../../identity/infrastructure/schema.ts';
import { uploadPurposeEnum } from '../../../platform/db/enums.ts';

export const uploadedFiles = pgTable(
  'uploaded_files',
  {
    id: uuid().primaryKey().defaultRandom(),

    /** Depolama katmanındaki kalıcı anahtar. Benzersizdir. */
    storageKey: text().notNull(),

    purpose: uploadPurposeEnum().notNull(),

    contentType: text().notNull(),
    sizeBytes: bigint({ mode: 'number' }).notNull(),

    /** Dosyanın orijinal adı — yalnızca bilgi amaçlı, yol olarak kullanılmaz. */
    originalName: text(),

    uploadedByUserId: uuid().references(() => users.id, { onDelete: 'set null' }),

    /** Dosya bir kayda bağlandığında dolar. Boşsa yetim adayıdır. */
    attachedAt: timestamp({ withTimezone: true }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uploaded_files_storage_key_unique').on(table.storageKey),
    index('uploaded_files_uploader_idx').on(table.uploadedByUserId),
    // Yetim temizliği görevinin sorgusu.
    index('uploaded_files_orphan_idx').on(table.attachedAt, table.createdAt),
  ],
);
