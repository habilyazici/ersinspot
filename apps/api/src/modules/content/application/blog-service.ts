/**
 * Blog yazıları.
 *
 * Eski kod tabanında blog içeriği kaynak dosyaya gömülüydü
 * (`data/blogDataNew.ts`, 732 satır, dört yazı). Yeni yazı eklemek kod
 * değişikliği ve yeniden dağıtım gerektiriyordu.
 *
 * İçerik Markdown olarak saklanır ve HTML'e çevirme işi tarayıcıda, güvenli bir
 * dönüştürücüyle yapılır. Sunucu ham HTML üretmez; eski kodda blog detayında
 * `dangerouslySetInnerHTML` kullanılıyordu.
 */

import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type {
  BlogListQuery,
  BlogPost,
  BlogPostSummary,
  CreateBlogPostInput,
  Paginated,
  UpdateBlogPostInput,
} from '@ersinspot/shared';
import { paginate } from '@ersinspot/shared';
import { contains } from '../../../platform/db/search.ts';
import { db } from '../../../platform/db/client.ts';
import type { Transaction } from '../../../platform/db/client.ts';
import { alreadyExists, notFound } from '../../../platform/errors/index.ts';
import { logger } from '../../../platform/observability/logger.ts';
import { attachFiles, resolveUrl } from '../../files/index.ts';
import { blogPostTags, blogPosts, tags } from '../infrastructure/schema.ts';
import { estimateReadingMinutes, slugifyTag } from '../domain/content-rules.ts';

// ---------------------------------------------------------------------------
// Okuma
// ---------------------------------------------------------------------------

const summarySelection = {
  id: blogPosts.id,
  slug: blogPosts.slug,
  title: blogPosts.title,
  excerpt: blogPosts.excerpt,
  coverImageStorageKey: blogPosts.coverImageStorageKey,
  category: blogPosts.category,
  authorName: blogPosts.authorName,
  readingMinutes: blogPosts.readingMinutes,
  publishedAt: blogPosts.publishedAt,
} as const;

function toSummary(row: {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageStorageKey: string | null;
  category: BlogPost['category'];
  authorName: string;
  readingMinutes: number;
  publishedAt: Date | null;
}): BlogPostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImageUrl: row.coverImageStorageKey === null ? null : resolveUrl(row.coverImageStorageKey),
    category: row.category,
    authorName: row.authorName,
    readingMinutes: row.readingMinutes,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

/**
 * Yayınlanmış yazıları listeler.
 *
 * `isPublished` filtresi çağıranın kontrolünde değildir: taslak yazılar
 * vitrinde görünmez.
 */
export async function listPublishedPosts(
  query: BlogListQuery,
): Promise<Paginated<BlogPostSummary>> {
  const conditions: SQL[] = [eq(blogPosts.isPublished, true)];

  if (query.category !== undefined) {
    conditions.push(eq(blogPosts.category, query.category));
  }

  if (query.search !== undefined && query.search !== '') {
    const searchCondition = or(
      contains(blogPosts.title, query.search),
      contains(blogPosts.excerpt, query.search),
    );
    if (searchCondition !== undefined) {
      conditions.push(searchCondition);
    }
  }

  // Etiket filtresi için önce etiketin kimliğini bul.
  if (query.tag !== undefined && query.tag !== '') {
    const tagRows = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, slugifyTag(query.tag)))
      .limit(1);

    const tagId = tagRows[0]?.id;

    if (tagId === undefined) {
      // Böyle bir etiket yok; boş sonuç döner.
      return paginate([], 0, query);
    }

    const postIds = await db
      .select({ postId: blogPostTags.postId })
      .from(blogPostTags)
      .where(eq(blogPostTags.tagId, tagId));

    if (postIds.length === 0) {
      return paginate([], 0, query);
    }

    conditions.push(
      inArray(
        blogPosts.id,
        postIds.map((row) => row.postId),
      ),
    );
  }

  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select(summarySelection)
    .from(blogPosts)
    .where(and(...conditions))
    // Kimlik, eşit sıralama anahtarlarını bozan kararlı ikinci anahtardır:
    // eşitlik olduğunda sayfalar arasında kayma olmaz.
    .orderBy(desc(blogPosts.publishedAt), asc(blogPosts.id))
    .limit(query.pageSize)
    .offset(offset);

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(blogPosts)
    .where(and(...conditions));

  return paginate(rows.map(toSummary), countRow?.value ?? 0, query);
}

/**
 * Yönetim paneli listesi. Taslakları da gösterir.
 *
 * Kategori ve arama filtreleri vitrindekiyle AYNI şekilde uygulanır. Önceden
 * yok sayılıyorlardı: panelde filtre seçilebiliyor ama liste değişmiyordu ve
 * kullanıcı filtrenin çalışmadığını ancak sonuçları sayarak anlıyordu.
 */
export async function listAllPosts(query: BlogListQuery): Promise<Paginated<BlogPostSummary>> {
  const conditions: SQL[] = [];

  if (query.category !== undefined) {
    conditions.push(eq(blogPosts.category, query.category));
  }

  if (query.search !== undefined && query.search !== '') {
    const searchCondition = or(
      contains(blogPosts.title, query.search),
      contains(blogPosts.slug, query.search),
      contains(blogPosts.excerpt, query.search),
    );
    if (searchCondition !== undefined) {
      conditions.push(searchCondition);
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select(summarySelection)
    .from(blogPosts)
    .where(where)
    // Kimlik, eşit sıralama anahtarlarını bozan kararlı ikinci anahtardır:
    // eşitlik olduğunda sayfalar arasında kayma olmaz.
    .orderBy(desc(blogPosts.createdAt), asc(blogPosts.id))
    .limit(query.pageSize)
    .offset(offset);

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(blogPosts)
    .where(where);

  return paginate(rows.map(toSummary), countRow?.value ?? 0, query);
}

async function loadTags(postId: string): Promise<string[]> {
  const rows = await db
    .select({ name: tags.name })
    .from(blogPostTags)
    .innerJoin(tags, eq(blogPostTags.tagId, tags.id))
    .where(eq(blogPostTags.postId, postId));

  return rows.map((row) => row.name);
}

/** Satırı tam yazı görünümüne çevirir; etiketler ayrıca okunur. */
async function toPost(row: typeof blogPosts.$inferSelect): Promise<BlogPost> {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    coverImageUrl: row.coverImageStorageKey === null ? null : resolveUrl(row.coverImageStorageKey),
    category: row.category,
    tags: await loadTags(row.id),
    authorName: row.authorName,
    readingMinutes: row.readingMinutes,
    isPublished: row.isPublished,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Vitrin için bağlantı adına göre yazı. YALNIZCA yayınlanmış yazılar döner.
 *
 * Yönetim paneli bu yolu kullanamaz: taslak yazı burada bulunamaz. Panelin
 * kendi okuma yolu `getPostById`.
 */
export async function getPostBySlug(slug: string): Promise<BlogPost> {
  const rows = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)))
    .limit(1);

  const row = rows[0];

  if (row === undefined) {
    throw notFound('Yazı');
  }

  // Görüntülenme sayacı okuma yolunda; hatası sayfayı engellemez.
  void db
    .update(blogPosts)
    .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
    .where(eq(blogPosts.id, row.id))
    .catch((error: unknown) => {
      logger.warn('Blog görüntülenme sayacı güncellenemedi', { error: String(error) });
    });

  return toPost(row);
}

/**
 * Yönetim paneli için kimliğe göre yazı. Taslaklar dahil.
 *
 * Panelin düzenleme formu yazının TAM içeriğine ihtiyaç duyar; liste yalnızca
 * özet döndürür. Form bu içeriği vitrin ucundan (`/api/blog/:slug`) çekiyordu
 * ve o uç yayınlanmamış yazıyı bulamaz: taslağa "düzenle" denince istek 404
 * dönüyor, form da önceki yazının içeriğiyle açık kalıyordu. Kaydet'e
 * basıldığında taslak, o içerikle ÜZERİNE YAZILIYORDU.
 *
 * Katalogdaki ayrımın aynısı: `getProductBySlug` vitrin, `getProductById`
 * panel içindir.
 *
 * Görüntülenme sayacı burada ARTMAZ: personelin kendi yazısını düzenlemek
 * için açması bir okunma değildir.
 */
export async function getPostById(postId: string): Promise<BlogPost> {
  const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, postId)).limit(1);

  const row = rows[0];

  if (row === undefined) {
    throw notFound('Yazı');
  }

  return toPost(row);
}

// ---------------------------------------------------------------------------
// Yazma
// ---------------------------------------------------------------------------

/**
 * Etiketleri oluşturur veya var olanları bulur ve yazıya bağlar.
 *
 * Etiket adları normalleştirilir: "Beyaz Eşya" ve "beyaz eşya" aynı etikettir.
 * Eski kodda etiketler dizi sütununda tutulduğu için bu varyasyonlar çoğalırdı.
 *
 * ÇAĞIRAN İŞLEMİ VERİR. Fonksiyon önce yazının tüm etiket bağlarını siler;
 * araya bir hata girerse yazı etiketlerini kalıcı olarak kaybederdi. Yazı
 * yazma işlemiyle aynı işlemde çalışması bu yüzden zorunludur.
 */
async function syncTags(
  postId: string,
  tagNames: readonly string[],
  tx: Transaction,
): Promise<void> {
  await tx.delete(blogPostTags).where(eq(blogPostTags.postId, postId));

  if (tagNames.length === 0) return;

  const unique = new Map<string, string>();
  for (const name of tagNames) {
    unique.set(slugifyTag(name), name.trim());
  }

  /*
    Tüm etiketler tek ifadede yazılır.

    `set` içinde düz `{ name }` kullanılamaz: çok satırlı bir upsert'te bu, TÜM
    çakışan satırlara aynı adı yazardı. `excluded.name` her satır için o satırın
    kendi değerini gösterir.
  */
  const upserted = await tx
    .insert(tags)
    .values([...unique].map(([slug, name]) => ({ name, slug })))
    .onConflictDoUpdate({ target: tags.slug, set: { name: sql`excluded.name` } })
    .returning({ id: tags.id });

  await tx.insert(blogPostTags).values(upserted.map((tag) => ({ postId, tagId: tag.id })));
}

export async function createPost(
  input: CreateBlogPostInput,
  author: { id: string; fullName: string },
): Promise<{ postId: string }> {
  /*
    Yazı ve etiketleri TEK işlemde yazılır. Ayrı yazıldığında, etiket adımı
    başarısız olursa yazı etiketsiz olarak yayına giriyordu ve bu sessizce
    oluyordu.
  */
  const postId = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, input.slug))
      .limit(1);

    if (existing.length > 0) {
      throw alreadyExists('Bu bağlantı adı başka bir yazıda kullanılıyor.');
    }

    const [created] = await tx
      .insert(blogPosts)
      .values({
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt,
        content: input.content,
        coverImageStorageKey: input.coverImageStorageKey,
        category: input.category,
        authorName: author.fullName,
        authorUserId: author.id,
        readingMinutes: estimateReadingMinutes(input.content),
        isPublished: input.isPublished,
        // Veritabanı kısıtı: yayınlanmış yazının yayın tarihi olmalıdır.
        publishedAt: input.isPublished ? new Date() : null,
      })
      .returning({ id: blogPosts.id });

    if (created === undefined) {
      throw new Error('Blog yazısı oluşturulamadı.');
    }

    await syncTags(created.id, input.tags, tx);

    // Kapak görselini kayda bağla; aksi halde bakım görevi 24 saat sonra siler.
    if (input.coverImageStorageKey !== null && input.coverImageStorageKey !== undefined) {
      await attachFiles([input.coverImageStorageKey], tx, { purpose: 'blog_cover' });
    }

    return created.id;
  });

  logger.info('Blog yazısı oluşturuldu', { postId, slug: input.slug });

  return { postId };
}

export async function updatePost(postId: string, input: UpdateBlogPostInput): Promise<void> {
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ isPublished: blogPosts.isPublished, publishedAt: blogPosts.publishedAt })
      .from(blogPosts)
      .where(eq(blogPosts.id, postId))
      .limit(1);

    const existing = rows[0];

    if (existing === undefined) {
      throw notFound('Yazı');
    }

    // İlk kez yayınlanıyorsa yayın tarihi şimdi; zaten yayındaysa korunur.
    const publishedAt =
      input.isPublished === true && !existing.isPublished
        ? new Date()
        : input.isPublished === false
          ? null
          : existing.publishedAt;

    /*
      Yazılacak sütunlar önce toplanır.

      Kısmi güncellemede istek yalnızca sütun OLMAYAN bir alan taşıyabilir —
      `{ tags: [...] }` gibi. O durumda `set` boş kalır ve Drizzle "No values
      to set" hatası fırlatır: kullanıcı 500 görür. Etiket güncellemesi tam
      olarak böyle çöküyordu.
    */
    const values = {
      ...(input.slug === undefined ? {} : { slug: input.slug }),
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.excerpt === undefined ? {} : { excerpt: input.excerpt }),
      ...(input.content === undefined
        ? {}
        : { content: input.content, readingMinutes: estimateReadingMinutes(input.content) }),
      ...(input.coverImageStorageKey === undefined
        ? {}
        : { coverImageStorageKey: input.coverImageStorageKey }),
      ...(input.category === undefined ? {} : { category: input.category }),
      ...(input.isPublished === undefined ? {} : { isPublished: input.isPublished, publishedAt }),
    };

    if (Object.keys(values).length > 0) {
      await tx.update(blogPosts).set(values).where(eq(blogPosts.id, postId));
    }

    /*
      Etiket eşitleme aynı işlemde: önce mevcut bağlar silinir. Ayrı işlemde
      çalışsaydı araya giren bir hata yazıyı etiketsiz bırakırdı.
    */
    if (input.tags !== undefined) {
      await syncTags(postId, input.tags, tx);
    }

    if (input.coverImageStorageKey !== null && input.coverImageStorageKey !== undefined) {
      await attachFiles([input.coverImageStorageKey], tx, { purpose: 'blog_cover' });
    }
  });

  logger.info('Blog yazısı güncellendi', { postId });
}

export async function deletePost(postId: string): Promise<void> {
  const deleted = await db
    .delete(blogPosts)
    .where(eq(blogPosts.id, postId))
    .returning({ id: blogPosts.id });

  if (deleted.length === 0) {
    throw notFound('Yazı');
  }

  logger.info('Blog yazısı silindi', { postId });
}

/**
 * Kullanılan etiketleri, YAYINLANMIŞ yazı sayısıyla birlikte döndürür.
 *
 * Uç herkese açıktır ve sayım yalnızca vitrinde görünen yazıları kapsamalıdır.
 * Önceden `blog_post_tags` bağları sayılıyor, yazının yayında olup olmadığına
 * hiç bakılmıyordu. İki sonucu vardı:
 *
 *   • Yalnızca taslaklara bağlı bir etiket bulutta görünüyordu ve tıklayan
 *     kullanıcı boş bir listeye düşüyordu — liste `isPublished` süzüyor,
 *     sayım süzmüyordu.
 *   • Henüz yayınlanmamış bir yazının etiketi dışarıya sızıyordu.
 *
 * Sıralama sayıya göredir; eşit sayıda yazıya sahip etiketler ada göre
 * sıralanır, böylece bulut her açılışta aynı görünür.
 */
export async function listTags(): Promise<{ name: string; slug: string; postCount: number }[]> {
  const publishedPostCount = sql<number>`count(${blogPosts.id})::int`;

  const rows = await db
    .select({ name: tags.name, slug: tags.slug, postCount: publishedPostCount })
    .from(tags)
    .leftJoin(blogPostTags, eq(blogPostTags.tagId, tags.id))
    .leftJoin(
      blogPosts,
      and(eq(blogPostTags.postId, blogPosts.id), eq(blogPosts.isPublished, true)),
    )
    .groupBy(tags.id, tags.name, tags.slug)
    .orderBy(desc(publishedPostCount), asc(tags.name));

  return rows.filter((row) => row.postCount > 0);
}
