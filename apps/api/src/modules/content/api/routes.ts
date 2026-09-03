/**
 * İçerik HTTP uçları: blog, SSS, iletişim ve site ayarları.
 *
 * Vitrin uçları oturum gerektirmez; yazma uçları personel yetkisi ister.
 * İletişim formu da oturumsuzdur — henüz üye olmamış bir ziyaretçi de
 * yazabilmelidir — bu yüzden IP bazlı hız sınırı ve bot tuzağı ile korunur.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import {
  blogListQuerySchema,
  contactMessageListQuerySchema,
  createBlogPostSchema,
  createContactMessageSchema,
  createFaqSchema,
  replyToContactMessageSchema,
  updateBlogPostSchema,
  uuidSchema,
} from '@ersinspot/shared';
import type { AuthVariables } from '../../../platform/http/auth.ts';
import {
  attachSession,
  currentUser,
  requireAdmin,
  requireAuth,
  requireStaff,
} from '../../../platform/http/auth.ts';
import type { ValidatedVariables } from '../../../platform/http/validate.ts';
import {
  body,
  params,
  query,
  validateBody,
  validateParams,
  validateQuery,
} from '../../../platform/http/validate.ts';
import { clientIp, rateLimit } from '../../../platform/http/security.ts';
import * as blogService from '../application/blog-service.ts';
import * as contactService from '../application/contact-service.ts';
import * as faqService from '../application/faq-service.ts';
import * as settingsService from '../application/settings-service.ts';

type Variables = AuthVariables & ValidatedVariables;

const idParamSchema = z.object({ id: uuidSchema });
const slugParamSchema = z.object({ slug: z.string().min(1).max(100) });
const settingKeyParamSchema = z.object({ key: z.string().min(1).max(100) });
const updateSettingSchema = z.object({ value: z.string().max(500) });
const updateFaqSchema = createFaqSchema.partial();

export const contentRoutes = new Hono<{ Variables: Variables }>();

// ---------------------------------------------------------------------------
// Blog — herkese açık
// ---------------------------------------------------------------------------

contentRoutes.get('/blog', validateQuery(blogListQuerySchema), async (c) => {
  return c.json(await blogService.listPublishedPosts(query(c, blogListQuerySchema)));
});

contentRoutes.get('/blog/tags', async (c) => {
  return c.json({ tags: await blogService.listTags() });
});

contentRoutes.get('/blog/:slug', validateParams(slugParamSchema), async (c) => {
  const { slug } = params(c, slugParamSchema);
  return c.json({ post: await blogService.getPostBySlug(slug) });
});

// ---------------------------------------------------------------------------
// SSS ve ayarlar — herkese açık
// ---------------------------------------------------------------------------

contentRoutes.get('/faqs', async (c) => {
  return c.json({ faqs: await faqService.listPublishedFaqs() });
});

/** Ayar listesini `{ anahtar: değer }` biçimine indirir. */
function toValueMap(settings: readonly settingsService.Setting[]): Record<string, string> {
  return Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
}

/**
 * Vitrin ayarları — oturum gerektirmez.
 *
 * YALNIZCA `storefront` görünürlüğündeki değerler döner: iletişim bilgisi,
 * çalışma saatleri, duyuru. Hepsi zaten sitenin alt bilgisinde yazar.
 *
 * Önceki hâli `getAllSettings()` çağırıyordu ve bu, adı "tüm ayarlar" olan bir
 * fonksiyonun çıktısını olduğu gibi herkese açıyordu: havale bilgileri sonradan
 * eklendiğinde IBAN ile hesap sahibinin adı da bu uçtan dönmeye başladı ve
 * kimse fark etmedi — belgesi hâlâ "yalnızca vitrinde gösterilen değerler"
 * diyordu. Kararı süzgecin kendisine bağlamak, aynı hatanın bir sonraki ayarda
 * tekrarlanmasını engeller.
 */
contentRoutes.get('/settings', async (c) => {
  return c.json({ settings: toValueMap(await settingsService.getSettingsFor('storefront')) });
});

/**
 * Ödeme bilgileri — oturum gerektirir.
 *
 * Havale/EFT ile sipariş veren müşteri parayı nereye göndereceğini görmelidir;
 * bunun için sipariş detayı sayfası bu ucu çağırır ve o sayfa zaten oturum
 * ister. Vitrin ayarları da birlikte döner: çağıran tek bir harita alır ve
 * hangi değerin hangi uçtan geldiğini bilmek zorunda kalmaz.
 */
contentRoutes.get('/settings/payment', requireAuth, async (c) => {
  return c.json({ settings: toValueMap(await settingsService.getSettingsFor('customer')) });
});

// ---------------------------------------------------------------------------
// İletişim formu — oturumsuz
// ---------------------------------------------------------------------------

contentRoutes.post(
  '/contact',
  // Oturum varsa kullanıcıya bağlanır; yoksa anonim gönderim olarak kaydedilir.
  attachSession,
  rateLimit(5, 60 * 60 * 1000, 'iletisim-formu'),
  validateBody(createContactMessageSchema),
  async (c) => {
    const input = body(c, createContactMessageSchema);

    await contactService.submitMessage(input, {
      userId: c.var.user?.id ?? null,
      ipAddress: clientIp(c),
    });

    return c.json({ success: true }, 201);
  },
);

// ---------------------------------------------------------------------------
// Yönetim: blog
// ---------------------------------------------------------------------------

contentRoutes.get('/admin/blog', requireStaff, validateQuery(blogListQuerySchema), async (c) => {
  return c.json(await blogService.listAllPosts(query(c, blogListQuerySchema)));
});

contentRoutes.post('/admin/blog', requireStaff, validateBody(createBlogPostSchema), async (c) => {
  const user = currentUser(c);
  const result = await blogService.createPost(body(c, createBlogPostSchema), {
    id: user.id,
    fullName: user.fullName,
  });
  return c.json({ post: result }, 201);
});

contentRoutes.put(
  '/admin/blog/:id',
  requireStaff,
  validateParams(idParamSchema),
  validateBody(updateBlogPostSchema),
  async (c) => {
    await blogService.updatePost(params(c, idParamSchema).id, body(c, updateBlogPostSchema));
    return c.json({ success: true });
  },
);

contentRoutes.delete('/admin/blog/:id', requireStaff, validateParams(idParamSchema), async (c) => {
  await blogService.deletePost(params(c, idParamSchema).id);
  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// Yönetim: SSS
// ---------------------------------------------------------------------------

contentRoutes.get('/admin/faqs', requireStaff, async (c) => {
  return c.json({ faqs: await faqService.listAllFaqs() });
});

contentRoutes.post('/admin/faqs', requireStaff, validateBody(createFaqSchema), async (c) => {
  return c.json({ faq: await faqService.createFaq(body(c, createFaqSchema)) }, 201);
});

contentRoutes.put(
  '/admin/faqs/:id',
  requireStaff,
  validateParams(idParamSchema),
  validateBody(updateFaqSchema),
  async (c) => {
    await faqService.updateFaq(params(c, idParamSchema).id, body(c, updateFaqSchema));
    return c.json({ success: true });
  },
);

contentRoutes.delete('/admin/faqs/:id', requireStaff, validateParams(idParamSchema), async (c) => {
  await faqService.deleteFaq(params(c, idParamSchema).id);
  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// Yönetim: iletişim mesajları
// ---------------------------------------------------------------------------

contentRoutes.get(
  '/admin/contact-messages',
  requireStaff,
  validateQuery(contactMessageListQuerySchema),
  async (c) => {
    return c.json(await contactService.listMessages(query(c, contactMessageListQuerySchema)));
  },
);

contentRoutes.get('/admin/contact-messages/unread-count', requireStaff, async (c) => {
  return c.json({ count: await contactService.countUnread() });
});

contentRoutes.post(
  '/admin/contact-messages/:id/read',
  requireStaff,
  validateParams(idParamSchema),
  async (c) => {
    await contactService.markAsRead(params(c, idParamSchema).id, currentUser(c).id);
    return c.json({ success: true });
  },
);

contentRoutes.post(
  '/admin/contact-messages/:id/reply',
  requireStaff,
  validateParams(idParamSchema),
  validateBody(replyToContactMessageSchema),
  async (c) => {
    await contactService.reply(
      params(c, idParamSchema).id,
      body(c, replyToContactMessageSchema),
      currentUser(c).id,
    );
    return c.json({ success: true });
  },
);

// ---------------------------------------------------------------------------
// Yönetim: site ayarları
// ---------------------------------------------------------------------------

/** Ayar listesi açıklamalarıyla birlikte — yalnızca yönetici. */
contentRoutes.get('/admin/settings', requireAdmin, async (c) => {
  return c.json({ settings: await settingsService.getAllSettings() });
});

contentRoutes.put(
  '/admin/settings/:key',
  requireAdmin,
  validateParams(settingKeyParamSchema),
  validateBody(updateSettingSchema),
  async (c) => {
    await settingsService.updateSetting(
      params(c, settingKeyParamSchema).key,
      body(c, updateSettingSchema).value,
      currentUser(c).id,
    );
    return c.json({ success: true });
  },
);
