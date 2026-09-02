/**
 * Favori veri erişimi.
 *
 * Bu katman yalnızca sorgu kurar. Ürün bilgisi buradan okunmaz — `catalog`
 * modülünün sözleşmesinden istenir.
 *
 * `products.favorite_count` sütunu UYGULAMADAN GÜNCELLENMEZ: veritabanı
 * tetikleyicisi (`favorites_sync_count`) ekleme ve silmede sayacı kendisi
 * ayarlar. Sayacı iki yerden yönetmek, ikisinin ayrışması demektir.
 */

import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../../platform/db/client.ts';
import { MAX_FAVORITES } from '../domain/order-rules.ts';
import { favorites } from './schema.ts';

/**
 * Favoriye ekler; zaten favorideyse çıkarır.
 *
 * @returns İşlem sonunda ürün favoride mi?
 */
export async function toggle(userId: string, productId: string): Promise<boolean> {
  const removed = await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)))
    .returning({ id: favorites.id });

  if (removed.length > 0) return false;

  /*
    Benzersizlik indeksi (`favorites_user_product_unique`) aynı ürünün iki kez
    eklenmesini engeller. İki istek aynı anda gelirse ikincisi çakışır ve
    sessizce atlanır: sonuç yine "favoride" olur.
  */
  await db.insert(favorites).values({ userId, productId }).onConflictDoNothing();

  return true;
}

/** Kullanıcının favorilerindeki ürün kimlikleri, en yeniden eskiye. */
export async function listProductIds(userId: string, limit: number): Promise<string[]> {
  const rows = await db
    .select({ productId: favorites.productId })
    .from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt))
    .limit(limit);

  return rows.map((row) => row.productId);
}

/**
 * Kullanıcı favori sınırına ulaştı mı?
 *
 * Zaten favoride olan bir ürün sınır dışıdır: o çağrı ekleme değil KALDIRMA
 * ile sonuçlanır ve engellenirse kullanıcı listesini küçültemez hâle gelirdi.
 */
export async function isAtLimit(userId: string, productId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)))
    .limit(1);

  if (existing !== undefined) return false;

  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(favorites)
    .where(eq(favorites.userId, userId));

  return (row?.value ?? 0) >= MAX_FAVORITES;
}

/**
 * Verilen ürünlerden hangilerinin favoride olduğunu döndürür.
 *
 * Liste ekranlarında ürün başına ayrı sorgu çalıştırmamak için tek sorguda
 * toplanır.
 */
export async function filterFavorited(
  userId: string,
  productIds: readonly string[],
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();

  const rows = await db
    .select({ productId: favorites.productId })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), inArray(favorites.productId, [...productIds])));

  return new Set(rows.map((row) => row.productId));
}
