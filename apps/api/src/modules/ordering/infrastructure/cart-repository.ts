/**
 * Sepet veri erişimi.
 *
 * Sepet veritabanında tutulur, tarayıcıda değil. Eski kod tabanında sepet hem
 * `localStorage`'da hem sunucuda tutuluyordu ve ikisi ayrışabiliyordu; kullanıcı
 * başka bir cihazdan girdiğinde sepeti boş görüyordu.
 *
 * Bu katman yalnızca sorgu kurar. Ürün fiyatı ve uygunluğu buradan okunmaz —
 * `catalog` modülünün sözleşmesinden istenir.
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../../platform/db/client.ts';
import type { Transaction } from '../../../platform/db/client.ts';
import { cartItems } from './schema.ts';

type Executor = Transaction | typeof db;

export interface CartItemRow {
  id: string;
  productId: string;
  createdAt: Date;
}

/** Kullanıcının sepetindeki kalemleri döndürür. Ürün bilgisi içermez. */
export async function findByUser(userId: string, executor: Executor = db): Promise<CartItemRow[]> {
  return executor
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      createdAt: cartItems.createdAt,
    })
    .from(cartItems)
    .where(eq(cartItems.userId, userId))
    .orderBy(cartItems.createdAt);
}

export async function countByUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(cartItems)
    .where(eq(cartItems.userId, userId));

  return row?.value ?? 0;
}

/**
 * Ürünü sepete ekler. Zaten sepetteyse hiçbir şey değişmez.
 *
 * İkinci el ürünün stok adedi 1'dir; "bir tane daha ekle" diye bir işlem
 * yoktur. Benzersizlik indeksi (`cart_items_user_product_unique`) aynı ürünün
 * iki satır olmasını engeller, çakışan ekleme sessizce atlanır.
 */
export async function add(userId: string, productId: string): Promise<void> {
  await db
    .insert(cartItems)
    .values({ userId, productId })
    .onConflictDoNothing({
      target: [cartItems.userId, cartItems.productId],
    });
}

export async function remove(userId: string, productId: string): Promise<boolean> {
  const deleted = await db
    .delete(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .returning({ id: cartItems.id });

  return deleted.length > 0;
}

/** Sepeti boşaltır. Sipariş oluşturulduktan sonra işlem içinde çağrılır. */
export async function clear(userId: string, executor: Executor = db): Promise<void> {
  await executor.delete(cartItems).where(eq(cartItems.userId, userId));
}
