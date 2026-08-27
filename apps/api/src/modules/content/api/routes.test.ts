/**
 * İçerik uçlarının testleri.
 *
 * Bu modülün 20 ucu vardı ve HİÇ testi yoktu — denetimde bulundu. Blog
 * yazısının etiketleriyle birlikte tek işlemde yazılması da bu oturumda
 * düzeltilmişti; kapsayan bir test olmadan o düzeltmenin doğruluğu
 * varsayımdan ibaretti.
 *
 * Üç şey doğrulanır:
 *
 * 1. Görünürlük: yayınlanmamış yazı vitrinde görünmez. Taslak bir yazının
 *    herkese açık uçtan okunabilmesi, henüz duyurulmamış bir içeriğin
 *    sızması demektir.
 *
 * 2. Yetkilendirme: yazma uçları personel ister.
 *
 * 3. Etiket eşitlemesi: etiketler normalleştirilir, çoğaltılmaz ve
 *    güncellemede doğru şekilde değiştirilir.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { blogPostSchema, blogPostSummarySchema, faqSchema } from '@ersinspot/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../../platform/db/client.ts';
import { createTestUser, loginAs, request, resetDatabase } from '../../../test/helpers.ts';
import { blogPostTags, blogPosts, faqs, tags } from '../infrastructure/schema.ts';

let staffCookie: string;
let customerCookie: string;

/** Geçerli bir blog yazısı gövdesi. Alan sınırları şemadan gelir. */
function postBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    slug: 'buzdolabi-secerken',
    title: 'Buzdolabı Seçerken Nelere Dikkat Edilmeli',
    excerpt: 'İkinci el buzdolabı alırken bakılması gereken temel noktalar bu yazıda.',
    content:
      'İkinci el bir buzdolabı alırken önce soğutma performansına bakılır. '.repeat(4) +
      'Kompresör sesi, kapak contası ve iç aydınlatma da kontrol edilmelidir.',
    category: 'buying_guide',
    tags: ['Beyaz Eşya', 'Buzdolabı'],
    isPublished: true,
    ...overrides,
  };
}

beforeEach(async () => {
  await resetDatabase();

  const staff = await createTestUser({
    email: 'personel@ersinspot.com',
    role: 'staff',
    emailVerified: true,
  });
  staffCookie = await loginAs(staff.email, staff.password);

  const customer = await createTestUser({
    email: 'musteri@ersinspot.com',
    phone: '+905321112233',
    emailVerified: true,
  });
  customerCookie = await loginAs(customer.email, customer.password);
});

describe('Blog yazma yetkisi', () => {
  it('oturumsuz kullanıcı yazı oluşturamaz', async () => {
    const response = await request('/api/admin/blog', {
      method: 'POST',
      body: JSON.stringify(postBody()),
    });

    expect(response.status).toBe(401);
  });

  it('müşteri yazı oluşturamaz', async () => {
    const response = await request('/api/admin/blog', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(postBody()),
    });

    expect(response.status).toBe(403);
  });

  it('personel yazı oluşturur', async () => {
    const response = await request('/api/admin/blog', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(postBody()),
    });

    expect(response.status).toBe(201);
  });

  it('aynı bağlantı adı ikinci kez kullanılamaz', async () => {
    await request('/api/admin/blog', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(postBody()),
    });

    const response = await request('/api/admin/blog', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(postBody({ title: 'Başka Bir Başlık Ama Aynı Bağlantı' })),
    });

    expect(response.status).toBe(409);
  });
});

describe('Blog görünürlüğü', () => {
  it('yayınlanmamış yazı vitrinde listelenmez', async () => {
    await request('/api/admin/blog', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(postBody({ isPublished: false })),
    });

    const response = await request('/api/blog');
    const body = (await response.json()) as { items: unknown[] };

    expect(response.status).toBe(200);
    expect(body.items).toEqual([]);
  });

  it('yayınlanmamış yazı bağlantı adıyla da okunamaz', async () => {
    await request('/api/admin/blog', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(postBody({ isPublished: false })),
    });

    const response = await request('/api/blog/buzdolabi-secerken');

    expect(response.status).toBe(404);
  });

  it('yayınlanan yazı sözleşmeye uyar', async () => {
    await request('/api/admin/blog', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(postBody()),
    });

    const response = await request('/api/blog/buzdolabi-secerken');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => z.object({ post: blogPostSchema }).parse(body)).not.toThrow();
  });

  it('liste sözleşmeye uyar', async () => {
    await request('/api/admin/blog', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(postBody()),
    });

    const response = await request('/api/blog');
    const body = await response.json();

    expect(() =>
      z
        .object({ items: z.array(blogPostSummarySchema) })
        .passthrough()
        .parse(body),
    ).not.toThrow();
  });

  it('yayına alınan yazıya yayın tarihi yazılır', async () => {
    await request('/api/admin/blog', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(postBody({ isPublished: false })),
    });

    const [before] = await db
      .select({ publishedAt: blogPosts.publishedAt, id: blogPosts.id })
      .from(blogPosts);

    expect(before?.publishedAt).toBeNull();

    await request(`/api/admin/blog/${before?.id ?? ''}`, {
      method: 'PUT',
      cookie: staffCookie,
      body: JSON.stringify({ isPublished: true }),
    });

    const [after] = await db.select({ publishedAt: blogPosts.publishedAt }).from(blogPosts);

    expect(after?.publishedAt).not.toBeNull();
  });
});

describe('Etiket eşitlemesi', () => {
  /** Yazının etiket adlarını okur. */
  async function tagsOf(postId: string): Promise<string[]> {
    const rows = await db
      .select({ name: tags.name })
      .from(blogPostTags)
      .innerJoin(tags, eq(blogPostTags.tagId, tags.id))
      .where(eq(blogPostTags.postId, postId));

    return rows.map((row) => row.name).sort();
  }

  async function createPost(body: Record<string, unknown>): Promise<string> {
    const response = await request('/api/admin/blog', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(body),
    });

    const parsed = (await response.json()) as { post?: { postId: string } };
    const postId = parsed.post?.postId;

    if (postId === undefined) throw new Error(`Yazı oluşturulamadı: ${response.status}`);
    return postId;
  }

  it('etiketler yazıya bağlanır', async () => {
    const postId = await createPost(postBody({ tags: ['Beyaz Eşya', 'Buzdolabı'] }));

    expect(await tagsOf(postId)).toEqual(['Beyaz Eşya', 'Buzdolabı']);
  });

  it('aynı etiket iki yazıda tek satır olarak durur', async () => {
    await createPost(postBody({ tags: ['Beyaz Eşya'] }));
    await createPost(postBody({ slug: 'ikinci-yazi', tags: ['Beyaz Eşya'] }));

    const rows = await db.select({ id: tags.id }).from(tags);

    expect(rows).toHaveLength(1);
  });

  it('büyük/küçük harf farkı yeni etiket üretmez', async () => {
    /*
      Etiket adı normalleştirilerek eşleştirilir: "Beyaz Eşya" ile "beyaz eşya"
      aynı etikettir. Eski kodda etiketler dizi sütununda tutulduğu için bu
      varyasyonlar çoğalıyordu.
    */
    await createPost(postBody({ tags: ['Beyaz Eşya'] }));
    await createPost(postBody({ slug: 'ikinci-yazi', tags: ['beyaz eşya'] }));

    const rows = await db.select({ id: tags.id }).from(tags);

    expect(rows).toHaveLength(1);
  });

  it('çok etiketli yazıda her etiket kendi adını korur', async () => {
    /*
      Etiketler tek ifadede yazılır. Çakışma çözümünde `set: { name }` gibi
      sabit bir değer kullanılsaydı çakışan TÜM satırlara aynı ad yazılırdı;
      `excluded.name` her satıra kendi değerini verir. Bu test o farkı yakalar:
      üç etiketten biri zaten varken üçü de doğru adla durmalıdır.
    */
    await createPost(postBody({ tags: ['Buzdolabı'] }));

    const postId = await createPost(
      postBody({
        slug: 'ikinci-yazi',
        tags: ['Buzdolabı', 'Çamaşır Makinesi', 'Bulaşık Makinesi'],
      }),
    );

    expect(await tagsOf(postId)).toEqual(['Bulaşık Makinesi', 'Buzdolabı', 'Çamaşır Makinesi']);
  });

  it('güncelleme etiketleri değiştirir, eklemez', async () => {
    const postId = await createPost(postBody({ tags: ['Beyaz Eşya', 'Buzdolabı'] }));

    await request(`/api/admin/blog/${postId}`, {
      method: 'PUT',
      cookie: staffCookie,
      body: JSON.stringify({ tags: ['Nakliye'] }),
    });

    expect(await tagsOf(postId)).toEqual(['Nakliye']);
  });

  it('yalnızca etiket gönderen güncelleme çöker değil, çalışır', async () => {
    /*
      Kısmi güncellemede istek yalnızca sütun OLMAYAN bir alan taşıyabilir.
      `updatePost` koşullu bir `set` nesnesi kuruyordu; `tags` bir sütun
      olmadığı için nesne boş kalıyor ve Drizzle "No values to set" hatası
      fırlatıyordu — istemci 500 görüyordu. Denetimde bulundu.
    */
    const postId = await createPost(postBody({ tags: ['Beyaz Eşya'] }));

    const response = await request(`/api/admin/blog/${postId}`, {
      method: 'PUT',
      cookie: staffCookie,
      body: JSON.stringify({ tags: ['Nakliye'] }),
    });

    expect(response.status).toBe(200);
  });

  it('geçersiz güncelleme etiketleri silmez', async () => {
    /*
      `syncTags` önce yazının tüm etiket bağlarını siler. Yazı güncellemesiyle
      aynı işlemde çalışmasaydı, araya giren bir hata yazıyı etiketsiz
      bırakırdı. Burada güncelleme kasten reddedilir; etiketler yerinde
      kalmalıdır.
    */
    const postId = await createPost(postBody({ tags: ['Beyaz Eşya', 'Buzdolabı'] }));

    const response = await request(`/api/admin/blog/${postId}`, {
      method: 'PUT',
      cookie: staffCookie,
      // Başlık en az 5 karakter olmalı; doğrulama bu isteği reddeder.
      body: JSON.stringify({ title: 'kısa', tags: ['Nakliye'] }),
    });

    expect(response.status).toBe(400);
    expect(await tagsOf(postId)).toEqual(['Beyaz Eşya', 'Buzdolabı']);
  });

  it('etiket bulutu yalnızca kullanılan etiketleri döndürür', async () => {
    const postId = await createPost(postBody({ tags: ['Beyaz Eşya', 'Buzdolabı'] }));

    await request(`/api/admin/blog/${postId}`, {
      method: 'PUT',
      cookie: staffCookie,
      body: JSON.stringify({ tags: ['Beyaz Eşya'] }),
    });

    const response = await request('/api/blog/tags');
    const body = (await response.json()) as { tags: { name: string }[] };

    expect(body.tags.map((tag) => tag.name)).toEqual(['Beyaz Eşya']);
  });
});

describe('Sıkça sorulan sorular', () => {
  const faqBody = {
    question: 'Ürünlerde garanti var mı?',
    answer: 'Satılan tüm ürünlerimizde en az üç ay mağaza garantisi bulunmaktadır.',
    category: 'products',
    displayOrder: 1,
    isPublished: true,
  };

  it('müşteri soru ekleyemez', async () => {
    const response = await request('/api/admin/faqs', {
      method: 'POST',
      cookie: customerCookie,
      body: JSON.stringify(faqBody),
    });

    expect(response.status).toBe(403);
  });

  it('personel soru ekler ve vitrinde görünür', async () => {
    const created = await request('/api/admin/faqs', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(faqBody),
    });

    expect(created.status).toBe(201);

    const response = await request('/api/faqs');
    const body = await response.json();

    expect(() => z.object({ faqs: z.array(faqSchema) }).parse(body)).not.toThrow();
    expect((body as { faqs: unknown[] }).faqs).toHaveLength(1);
  });

  it('yayınlanmamış soru vitrinde görünmez', async () => {
    await request('/api/admin/faqs', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify({ ...faqBody, isPublished: false }),
    });

    const response = await request('/api/faqs');
    const body = (await response.json()) as { faqs: unknown[] };

    expect(body.faqs).toEqual([]);
  });

  it('yalnızca yayın durumu değiştiren güncelleme çalışır', async () => {
    await request('/api/admin/faqs', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(faqBody),
    });

    const [row] = await db.select({ id: faqs.id }).from(faqs);

    const response = await request(`/api/admin/faqs/${row?.id ?? ''}`, {
      method: 'PUT',
      cookie: staffCookie,
      body: JSON.stringify({ isPublished: false }),
    });

    expect(response.status).toBe(200);

    const list = await request('/api/faqs');
    expect(((await list.json()) as { faqs: unknown[] }).faqs).toEqual([]);
  });

  it('taslak olarak oluşturulan soru vitrinde görünmez', async () => {
    /*
      `isPublished` sütunu vardı ve okuma yolu onu süzüyordu, ama yazma yolunda
      hiç yoktu: SSS kaydı oluşturulunca daima yayına giriyor ve yayından
      çıkarılamıyordu. Blog yazısında alan üç yerde de mevcuttu; aynı modülde
      iki içerik türü farklı davranıyordu.
    */
    await request('/api/admin/faqs', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify({ ...faqBody, isPublished: false }),
    });

    const response = await request('/api/faqs');
    expect(((await response.json()) as { faqs: unknown[] }).faqs).toEqual([]);

    const asStaff = await request('/api/admin/faqs', { cookie: staffCookie });
    expect(((await asStaff.json()) as { faqs: unknown[] }).faqs).toHaveLength(1);
  });

  it('silinen soru vitrinden kalkar', async () => {
    await request('/api/admin/faqs', {
      method: 'POST',
      cookie: staffCookie,
      body: JSON.stringify(faqBody),
    });

    const [row] = await db.select({ id: faqs.id }).from(faqs);

    await request(`/api/admin/faqs/${row?.id ?? ''}`, {
      method: 'DELETE',
      cookie: staffCookie,
    });

    const response = await request('/api/faqs');
    const body = (await response.json()) as { faqs: unknown[] };

    expect(body.faqs).toEqual([]);
  });
});

describe('İletişim formu', () => {
  const message = {
    fullName: 'Ayşe Yılmaz',
    email: 'ayse@ornek.com',
    phone: '05071940550',
    subject: 'general',
    message: 'Mağazanızın hafta sonu çalışma saatlerini öğrenebilir miyim?',
  };

  it('oturumsuz gönderilebilir', async () => {
    const response = await request('/api/contact', {
      method: 'POST',
      body: JSON.stringify(message),
    });

    expect(response.status).toBe(201);
  });

  it('mesajları yalnızca personel okur', async () => {
    await request('/api/contact', { method: 'POST', body: JSON.stringify(message) });

    const asCustomer = await request('/api/admin/contact-messages', { cookie: customerCookie });
    expect(asCustomer.status).toBe(403);

    const asStaff = await request('/api/admin/contact-messages', { cookie: staffCookie });
    expect(asStaff.status).toBe(200);
  });

  it('okunmamış sayacı personel için doğru döner', async () => {
    await request('/api/contact', { method: 'POST', body: JSON.stringify(message) });
    await request('/api/contact', {
      method: 'POST',
      body: JSON.stringify({ ...message, email: 'baska@ornek.com' }),
    });

    const response = await request('/api/admin/contact-messages/unread-count', {
      cookie: staffCookie,
    });
    const body = (await response.json()) as { count: number };

    expect(body.count).toBe(2);
  });
});

describe('Site ayarları', () => {
  it('herkese açık uçtan okunur', async () => {
    const response = await request('/api/settings');

    expect(response.status).toBe(200);
  });

  it('yalnızca yönetici değiştirebilir', async () => {
    const asStaff = await request('/api/admin/settings/store_phone', {
      method: 'PUT',
      cookie: staffCookie,
      body: JSON.stringify({ value: '05071940550' }),
    });

    // Ayarlar personel değil YÖNETİCİ yetkisi ister.
    expect(asStaff.status).toBe(403);
  });
});
