/**
 * Kimlik ve oturum tabloları.
 *
 * Tasarım kararları:
 *
 * 1. Şifreler argon2id ile hash'lenir ve yalnızca hash saklanır. `passwordHash`
 *    sütunu hiçbir sorgu sonucunda uygulama katmanının dışına çıkmaz.
 *
 * 2. Oturumlar JWT değil, veritabanında tutulan opak jetonlardır. JWT'nin aksine
 *    anında iptal edilebilirler: kullanıcı "tüm cihazlardan çık" dediğinde veya
 *    şifresini değiştirdiğinde satırlar silinir ve jeton o an geçersiz olur.
 *
 * 3. Jetonun kendisi değil, SHA-256 özeti saklanır. Veritabanı okuma yetkisi ele
 *    geçiren bir saldırgan, mevcut oturumları ele geçiremez.
 *
 * 4. Şifre sıfırlama ve e-posta doğrulama jetonları da aynı şekilde özet olarak
 *    saklanır ve tek kullanımlıktır.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  inet,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { userRoleEnum } from '../../../platform/db/enums.ts';
import { addressColumns } from '../../../platform/db/columns.ts';

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),

    /**
     * `citext` uzantısı yerine küçük harfe normalleştirilmiş `text` kullanılır:
     * uygulama katmanı e-postayı daima küçük harfe çevirir, benzersizlik indeksi
     * de küçük harf üzerinden kurulur. Bu, uzantı bağımlılığını ortadan kaldırır.
     */
    email: text().notNull(),

    /** argon2id özeti. Algoritma parametreleri özetin içinde taşınır. */
    passwordHash: text().notNull(),

    fullName: text().notNull(),

    /** E.164 biçiminde: "+905071940550". */
    phone: text().notNull(),

    role: userRoleEnum().notNull().default('customer'),

    /** Doğrulanmamışsa null. Doğrulama zorunluluğu rotaya göre değişir. */
    emailVerifiedAt: timestamp({ withTimezone: true }),

    /**
     * Art arda başarısız giriş denemesi sayısı. Eşiği aşınca `lockedUntil` dolar.
     * Başarılı girişte sıfırlanır.
     */
    failedLoginCount: integer().notNull().default(0),
    lockedUntil: timestamp({ withTimezone: true }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),

    /**
     * Yumuşak silme. Hesap silindiğinde satır kalır ama kişisel alanlar
     * anonimleştirilir; siparişlerin geçmişi bozulmaz.
     */
    deletedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    // Benzersizlik küçük harf üzerinden: "Ali@x.com" ile "ali@x.com" aynı hesaptır.
    uniqueIndex('users_email_unique').on(sql`lower(${table.email})`),
    index('users_role_idx').on(table.role),
    index('users_created_at_idx').on(table.createdAt),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid().primaryKey().defaultRandom(),

    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /**
     * Oturum jetonunun SHA-256 özeti (hex). Jetonun kendisi yalnızca çerezde bulunur
     * ve sunucuda hiçbir yere yazılmaz.
     */
    tokenHash: text().notNull(),

    expiresAt: timestamp({ withTimezone: true }).notNull(),

    /**
     * Kayan yenileme için: her kullanımda güncellenir. Uzun süre kullanılmayan
     * oturumlar temizlik görevinde silinir.
     */
    lastUsedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),

    /** Kullanıcının "aktif oturumlarım" ekranında cihazı tanıyabilmesi için. */
    ipAddress: inet(),
    userAgent: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);

/**
 * Şifre sıfırlama jetonları.
 *
 * Tek kullanımlıktır: kullanıldığında `usedAt` dolar ve jeton bir daha kabul edilmez.
 * Kullanıcı yeni bir sıfırlama isterse eski jetonlar geçersiz kılınır.
 */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),

    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    tokenHash: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),

    /** İsteğin geldiği adres — kötüye kullanım incelemesi için. */
    requestedFromIp: inet(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('password_reset_tokens_hash_unique').on(table.tokenHash),
    index('password_reset_tokens_user_id_idx').on(table.userId),
    index('password_reset_tokens_expires_at_idx').on(table.expiresAt),
  ],
);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),

    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    tokenHash: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('email_verification_tokens_hash_unique').on(table.tokenHash),
    index('email_verification_tokens_user_id_idx').on(table.userId),
  ],
);

/**
 * Giriş denemesi kayıtları.
 *
 * Hem hesap bazlı kilitleme hem IP bazlı hız sınırı için kullanılır. E-posta
 * alanı, var olmayan hesaplar için de doldurulur; böylece saldırgan "bu hesap var mı"
 * bilgisini yanıt süresinden de çıkaramaz.
 */
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid().primaryKey().defaultRandom(),

    /** Denenen e-posta (küçük harf). Hesap var olmasa da kaydedilir. */
    email: text().notNull(),
    ipAddress: inet(),
    succeeded: boolean().notNull(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('login_attempts_email_created_idx').on(table.email, table.createdAt),
    index('login_attempts_ip_created_idx').on(table.ipAddress, table.createdAt),
  ],
);

/**
 * Müşterinin adres defteri.
 *
 * Düzenlenebilir kayıtlardır: kullanıcı adresini değiştirebilir veya silebilir.
 * Sipariş verilirken adres BURADAN KOPYALANIR; siparişin kendi adres kaydı
 * oluşturulur. Böylece müşteri sonradan adresini değiştirse bile geçmiş
 * siparişin teslimat adresi olduğu gibi kalır.
 *
 * Eski kod tabanında adres, müşteri kaydında tek bir metin alanıydı ve sipariş
 * bu alana bakıyordu; müşteri taşındığında eski siparişlerin adresi de değişiyordu.
 */
export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: uuid().primaryKey().defaultRandom(),

    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** Kullanıcının verdiği ad: "Ev", "İş", "Annemler". */
    label: text().notNull(),

    ...addressColumns,

    /** Ödeme adımında ön seçili gelen adres. Kullanıcı başına en fazla bir tane. */
    isDefault: boolean().notNull().default(false),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),

    /** Yumuşak silme: adres silinse bile geçmiş siparişler etkilenmez. */
    deletedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index('customer_addresses_user_idx').on(table.userId),
    index('customer_addresses_district_idx').on(table.district),
  ],
);
