/**
 * İletişim mesajları ve blog içerikleri.
 *
 * Eski kod tabanında blog yazıları kaynak dosyaya gömülüydü (732 satır); yeni yazı
 * eklemek kod değişikliği ve yeniden dağıtım gerektiriyordu. Burada içerik
 * veritabanında tutulur ve yönetim panelinden düzenlenir.
 */

import { z } from 'zod';
import {
  emailSchema,
  fullNameSchema,
  optionalText,
  paginationSchema,
  phoneSchema,
  requiredText,
  uuidSchema,
} from '../../kernel/validation.ts';
import { slugSchema } from '../catalog/contract.ts';

// ---------------------------------------------------------------------------
// İletişim
// ---------------------------------------------------------------------------

export const CONTACT_SUBJECTS = [
  'general',
  'product_inquiry',
  'order_issue',
  'technical_service',
  'moving',
  'sell_product',
  'complaint',
  'suggestion',
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export const CONTACT_SUBJECT_LABELS: Readonly<Record<ContactSubject, string>> = {
  general: 'Genel Bilgi',
  product_inquiry: 'Ürün Hakkında',
  order_issue: 'Sipariş Sorunu',
  technical_service: 'Teknik Servis',
  moving: 'Nakliye',
  sell_product: 'Ürün Satmak İstiyorum',
  complaint: 'Şikayet',
  suggestion: 'Öneri',
};

/**
 * İletişim formu. Giriş yapmamış kullanıcılar da gönderebilir; bu yüzden
 * sunucu tarafında IP bazlı hız sınırı uygulanır.
 */
export const createContactMessageSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  subject: z.enum(CONTACT_SUBJECTS, {
    errorMap: () => ({ message: 'Lütfen bir konu seçin.' }),
  }),
  message: requiredText('Mesaj', 20, 3000),
  /**
   * Bot tuzağı: gerçek kullanıcıya görünmeyen alan. Doldurulmuşsa istek sessizce
   * başarılı gibi yanıtlanır ama kaydedilmez.
   */
  website: z.string().max(0).optional(),
});

export type CreateContactMessageInput = z.infer<typeof createContactMessageSchema>;

export const contactMessageSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  subject: z.enum(CONTACT_SUBJECTS),
  message: z.string(),
  isRead: z.boolean(),
  readAt: z.string().datetime().nullable(),
  /** Personelin bu mesaja verdiği yanıt notu. Müşteriye e-posta ile iletilir. */
  replyNote: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type ContactMessage = z.infer<typeof contactMessageSchema>;

export const replyToContactMessageSchema = z.object({
  replyNote: requiredText('Yanıt', 5, 3000),
});

export type ReplyToContactMessageInput = z.infer<typeof replyToContactMessageSchema>;

export const contactMessageListQuerySchema = paginationSchema.extend({
  subject: z.enum(CONTACT_SUBJECTS).optional(),
  isRead: z.coerce.boolean().optional(),
});

export type ContactMessageListQuery = z.infer<typeof contactMessageListQuerySchema>;

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export const BLOG_CATEGORIES = [
  'buying_guide',
  'maintenance',
  'moving_tips',
  'second_hand',
  'news',
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY_LABELS: Readonly<Record<BlogCategory, string>> = {
  buying_guide: 'Satın Alma Rehberi',
  maintenance: 'Bakım ve Kullanım',
  moving_tips: 'Taşınma İpuçları',
  second_hand: 'İkinci El Dünyası',
  news: 'Haberler',
};

export const blogPostSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  title: z.string(),
  excerpt: z.string(),
  /**
   * Markdown biçiminde içerik. Arayüzde güvenli bir dönüştürücüden geçirilir;
   * ham HTML olarak basılmaz.
   */
  content: z.string(),
  coverImageUrl: z.string().url().nullable(),
  category: z.enum(BLOG_CATEGORIES),
  tags: z.array(z.string()),
  authorName: z.string(),
  /** Okuma süresi (dakika). İçerikten otomatik hesaplanır. */
  readingMinutes: z.number().int().positive(),
  isPublished: z.boolean(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BlogPost = z.infer<typeof blogPostSchema>;

export const blogPostSummarySchema = blogPostSchema.pick({
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  category: true,
  authorName: true,
  readingMinutes: true,
  publishedAt: true,
});

export type BlogPostSummary = z.infer<typeof blogPostSummarySchema>;

export const createBlogPostSchema = z.object({
  slug: slugSchema,
  title: requiredText('Başlık', 5, 160),
  excerpt: requiredText('Özet', 20, 400),
  content: requiredText('İçerik', 100, 50_000),
  coverImageUrl: z.string().url().nullable().default(null),
  category: z.enum(BLOG_CATEGORIES),
  tags: z
    .array(requiredText('Etiket', 1, 40))
    .max(10)
    .default([]),
  isPublished: z.boolean().default(false),
});

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;

export const updateBlogPostSchema = createBlogPostSchema.partial();

export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;

export const blogListQuerySchema = paginationSchema.extend({
  category: z.enum(BLOG_CATEGORIES).optional(),
  tag: z.string().trim().max(40).optional(),
  search: z.string().trim().max(120).optional(),
});

export type BlogListQuery = z.infer<typeof blogListQuerySchema>;

// ---------------------------------------------------------------------------
// Sıkça sorulan sorular
// ---------------------------------------------------------------------------

export const faqSchema = z.object({
  id: uuidSchema,
  question: z.string(),
  answer: z.string(),
  category: z.string(),
  displayOrder: z.number().int(),
});

export type Faq = z.infer<typeof faqSchema>;

export const createFaqSchema = z.object({
  question: requiredText('Soru', 5, 300),
  answer: requiredText('Cevap', 10, 3000),
  category: requiredText('Kategori', 2, 60),
  displayOrder: z.number().int().min(0).default(0),
});

export type CreateFaqInput = z.infer<typeof createFaqSchema>;

// ---------------------------------------------------------------------------
// Dosya yükleme
// ---------------------------------------------------------------------------

/** Yükleme ucunun döndürdüğü kayıt. `storageKey` daha sonra ilgili kayda bağlanır. */
export const uploadedFileSchema = z.object({
  storageKey: z.string(),
  url: z.string().url(),
  contentType: z.string(),
  sizeBytes: z.number().int().positive(),
});

export type UploadedFile = z.infer<typeof uploadedFileSchema>;

/** Yükleme amacı: depolama yolunu ve boyut sınırını belirler. */
export const UPLOAD_PURPOSES = ['product_image', 'request_photo', 'blog_cover', 'avatar'] as const;

export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export const uploadRequestSchema = z.object({
  purpose: z.enum(UPLOAD_PURPOSES),
});

export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;

export const optionalContactNote = optionalText(500);
