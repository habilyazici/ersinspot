/**
 * İçerik ve destek tabloları: iletişim mesajları, blog, SSS ve yüklenen dosyalar.
 *
 * Blog yazıları eski kod tabanında kaynak dosyaya gömülüydü (732 satır); yeni yazı
 * eklemek kod değişikliği ve yeniden dağıtım gerektiriyordu. Artık veritabanında
 * tutulur ve yönetim panelinden düzenlenir.
 */

import {
  bigint,
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
import { users } from './auth.ts';
import { blogCategoryEnum, contactSubjectEnum, uploadPurposeEnum } from './enums.ts';

// ---------------------------------------------------------------------------
// İletişim
// ---------------------------------------------------------------------------

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid().primaryKey().defaultRandom(),

    fullName: text().notNull(),
    email: text().notNull(),
    phone: text(),

    subject: contactSubjectEnum().notNull(),
    message: text().notNull(),

    /** Giriş yapmış kullanıcı gönderdiyse dolar; anonim gönderimlerde null. */
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),

    /** Kötüye kullanım incelemesi ve hız sınırı için. */
    submittedFromIp: inet(),

    isRead: boolean().notNull().default(false),
    readAt: timestamp({ withTimezone: true }),
    readByUserId: uuid().references(() => users.id, { onDelete: 'set null' }),

    /** Personelin yanıtı. Müşteriye e-posta ile iletilir. */
    replyNote: text(),
    repliedAt: timestamp({ withTimezone: true }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Yönetim panelinin ana sorgusu: okunmamışlar önce, en yeniden eskiye.
    index('contact_messages_read_created_idx').on(table.isRead, table.createdAt),
    index('contact_messages_created_idx').on(table.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid().primaryKey().defaultRandom(),

    slug: text().notNull(),
    title: text().notNull(),
    excerpt: text().notNull(),

    /**
     * Markdown biçiminde içerik. Arayüzde güvenli bir dönüştürücüden geçirilir;
     * ham HTML olarak sayfaya basılmaz.
     */
    content: text().notNull(),

    coverImageStorageKey: text(),

    category: blogCategoryEnum().notNull(),

    /** Etiketler. Postgres metin dizisi olarak saklanır. */
    tags: text().array().notNull().default([]),

    authorName: text().notNull(),
    authorUserId: uuid().references(() => users.id, { onDelete: 'set null' }),

    /** Okuma süresi (dakika). İçerikten otomatik hesaplanır. */
    readingMinutes: integer().notNull().default(1),

    viewCount: integer().notNull().default(0),

    isPublished: boolean().notNull().default(false),
    publishedAt: timestamp({ withTimezone: true }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('blog_posts_slug_unique').on(table.slug),
    // Vitrin sorgusu: yayınlananlar, en yeniden eskiye.
    index('blog_posts_published_idx').on(table.isPublished, table.publishedAt),
    index('blog_posts_category_idx').on(table.category),
  ],
);

// ---------------------------------------------------------------------------
// Sıkça sorulan sorular
// ---------------------------------------------------------------------------

export const faqs = pgTable(
  'faqs',
  {
    id: uuid().primaryKey().defaultRandom(),

    question: text().notNull(),
    answer: text().notNull(),

    /** Gruplama başlığı: "Siparişler", "Teknik Servis" gibi. */
    category: text().notNull(),

    displayOrder: integer().notNull().default(0),
    isPublished: boolean().notNull().default(true),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('faqs_category_order_idx').on(table.category, table.displayOrder)],
);

// ---------------------------------------------------------------------------
// Yüklenen dosyalar
// ---------------------------------------------------------------------------

/**
 * Yüklenen her dosya burada kayıt altına alınır.
 *
 * İki amacı var:
 *
 * 1. Sahiplik: dosyayı kimin yüklediği bilinir, böylece silme yetkisi denetlenebilir.
 *    Eski kodda yükleme ve silme uçları tamamen korumasızdı.
 *
 * 2. Yetim dosya temizliği: yükleme yapılıp form gönderilmezse dosya bir kayda
 *    bağlanmaz (`attachedAt` boş kalır). Zamanlanmış görev, belirli bir süreden
 *    eski ve bağlanmamış dosyaları depolamadan siler.
 */
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

// ---------------------------------------------------------------------------
// Site ayarları
// ---------------------------------------------------------------------------

/**
 * Yönetim panelinden düzenlenebilen site ayarları: iletişim bilgileri, çalışma
 * saatleri, banner metni gibi. Eski kodda bunlar kaynak dosyada sabitti
 * (`BACKEND_CONSTANTS.ts`), değiştirmek yeniden dağıtım gerektiriyordu.
 */
export const siteSettings = pgTable('site_settings', {
  key: text().primaryKey(),
  value: text().notNull(),
  description: text(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: uuid().references(() => users.id, { onDelete: 'set null' }),
});
