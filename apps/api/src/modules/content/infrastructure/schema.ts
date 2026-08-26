/**
 * İçerik ve destek tabloları: iletişim mesajları, blog, SSS ve yüklenen dosyalar.
 *
 * Blog yazıları eski kod tabanında kaynak dosyaya gömülüydü (732 satır); yeni yazı
 * eklemek kod değişikliği ve yeniden dağıtım gerektiriyordu. Artık veritabanında
 * tutulur ve yönetim panelinden düzenlenir.
 */

import {
  boolean,
  index,
  inet,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../../identity/infrastructure/schema.ts';
import {
  blogCategoryEnum,
  contactSubjectEnum,
  faqCategoryEnum,
  settingValueTypeEnum,
} from '../../../platform/db/enums.ts';

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
    repliedByUserId: uuid().references(() => users.id, { onDelete: 'set null' }),

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

    /**
     * Gruplama başlığı. Serbest metin değil kapalı kümedir: metin olsaydı
     * "Siparişler" ve "Sipariş" gibi varyasyonlar çoğalır, gruplama bozulurdu.
     */
    category: faqCategoryEnum().notNull(),

    displayOrder: integer().notNull().default(0),
    isPublished: boolean().notNull().default(true),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('faqs_category_order_idx').on(table.category, table.displayOrder)],
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

  /**
   * Değer metin olarak saklanır ancak tipi ayrıca bildirilir.
   *
   * Tipsiz bir ayar tablosunda "3" değerinin sayı mı metin mi olduğu belirsizdir
   * ve okuyan her yer kendi ayrıştırmasını yazar. Tip sütunu, okuma tarafının
   * doğru dönüşümü yapmasını ve yanlış değerin yazılmasını engellemeyi sağlar.
   */
  value: text().notNull(),
  valueType: settingValueTypeEnum().notNull().default('string'),

  description: text(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: uuid().references(() => users.id, { onDelete: 'set null' }),
});

/**
 * Etiketler.
 *
 * Dizi sütunu (`text[]`) yerine ayrı tablo kullanılır. Etiketler sayılır
 * ("en çok kullanılan etiketler"), yeniden adlandırılır ve etiket sayfası
 * üretilir; dizi sütunuyla bunların hiçbiri verimli yapılamaz. Ayrıca aynı
 * etiketin farklı yazımları ("beyaz eşya", "Beyaz Eşya") çoğalırdı.
 */
export const tags = pgTable(
  'tags',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    slug: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('tags_slug_unique').on(table.slug)],
);

/** Blog yazısı ile etiket arasındaki çoka çok ilişki. */
export const blogPostTags = pgTable(
  'blog_post_tags',
  {
    postId: uuid()
      .notNull()
      .references(() => blogPosts.id, { onDelete: 'cascade' }),

    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
    index('blog_post_tags_tag_idx').on(table.tagId),
  ],
);
