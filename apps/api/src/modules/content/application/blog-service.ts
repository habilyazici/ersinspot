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

import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
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
import { db } from '../../../platform/db/client.ts';
import type { Transaction } from '../../../platform/db/client.ts';
import { alreadyExists, notFound } from '../../../platform/errors/index.ts';
import { logger } from '../../../platform/observability/logger.ts';
import { resolveUrl } from '../../files/index.ts';
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
    const pattern = `%${query.search}%`;
    const searchCondition = or(ilike(blogPosts.title, pattern), ilike(blogPosts.excerpt, pattern));
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
    .orderBy(desc(blogPosts.publishedAt))
    .limit(query.pageSize)
    .offset(offset);

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(blogPosts)
    .where(and(...conditions));

  return paginate(rows.map(toSummary), countRow?.value ?? 0, query);
}

/** Yönetim paneli listesi. Taslakları da gösterir. */
export async function listAllPosts(query: BlogListQuery): Promise<Paginated<BlogPostSummary>> {
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select(summarySelection)
    .from(blogPosts)
    .orderBy(desc(blogPosts.createdAt))
    .limit(query.pageSize)
    .offset(offset);

  const [countRow] = await db.select({ value: sql<number>`count(*)::int` }).from(blogPosts);

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

/** Kullanılan etiketleri, yazı sayısıyla birlikte döndürür. Etiket bulutu için. */
export async function listTags(): Promise<{ name: string; slug: string; postCount: number }[]> {
  const rows = await db
    .select({
      name: tags.name,
      slug: tags.slug,
      postCount: sql<number>`count(${blogPostTags.postId})::int`,
    })
    .from(tags)
    .leftJoin(blogPostTags, eq(blogPostTags.tagId, tags.id))
    .groupBy(tags.id, tags.name, tags.slug)
    .orderBy(desc(sql`count(${blogPostTags.postId})`));

  return rows.filter((row) => row.postCount > 0);
}
