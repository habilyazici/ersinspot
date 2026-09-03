/**
 * Sepet işlemleri.
 *
 * Sepet, ürün fiyatını SAKLAMAZ. Kalemler yalnızca ürün kimliği taşır; fiyat
 * her okumada `catalog` modülünden alınır. Böylece sepette duran bir ürünün
 * fiyatı değiştiğinde kullanıcı güncel fiyatı görür ve eski fiyatla sipariş
 * verilemez.
 *
 * Adet yoktur: ikinci el ürün tekildir, bir üründen bir tane satılır.
 *
 * Eski kod tabanında sepet hem tarayıcıda hem sunucuda tutuluyordu ve fiyat
 * kopyalanıyordu; iki kaynak ayrışabiliyordu.
 */

import type { Cart, CartItem } from '@ersinspot/shared';
import { money } from '@ersinspot/shared';
import { catalog } from '../../catalog/index.ts';
import { businessRule, notFound } from '../../../platform/errors/index.ts';
import { resolveStorageUrl } from '../../../platform/storage.ts';
import { MAX_CART_ITEMS } from '../domain/order-rules.ts';
import * as repository from '../infrastructure/cart-repository.ts';

/**
 * Sepeti güncel fiyatlarla döndürür.
 *
 * Ürün bilgisi katalog modülünden alınır; bu modül `products` tablosunu okuyamaz.
 */
export async function getCart(userId: string): Promise<Cart> {
  const rows = await repository.findByUser(userId);

  if (rows.length === 0) {
    return { items: [], subtotal: 0, hasUnavailableItems: false };
  }

  /*
   * KİLİTSİZ okuma.
   *
   * Sepeti görüntülemek bir okuma işidir; ürün satırlarını kilitlemez.
   * Önceden burada `getPurchasableProducts` çağrılıyordu — o fonksiyon sipariş
   * akışı için `SELECT ... FOR UPDATE` yapar. Sepete bakan her ziyaretçi
   * ürünleri kilitliyor, aynı ürüne bakan ikinci kişi ve o sırada sipariş veren
   * müşteri kilidin çözülmesini bekliyordu. Sepet, sitenin en sık açılan
   * sayfalarından biridir; kilit orada değil, sipariş anında gerekir.
   */
  const products = await catalog.getProductsForDisplay(rows.map((row) => row.productId));

  const productsById = new Map(products.map((product) => [product.id, product]));

  const items: CartItem[] = [];
  let subtotal = money.ZERO;
  let hasUnavailableItems = false;

  for (const row of rows) {
    const product = productsById.get(row.productId);

    // Ürün silinmişse kalem gösterilmez; sepette hayalet satır bırakmak yerine
    // sessizce atlanır ve bir sonraki temizlikte kaldırılır.
    if (product === undefined) {
      hasUnavailableItems = true;
      continue;
    }

    const price = money.fromKurus(product.price);

    if (product.isPurchasable) {
      subtotal = money.add(subtotal, price);
    } else {
      hasUnavailableItems = true;
    }

    items.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      coverImageUrl:
        product.coverStorageKey === null ? null : resolveStorageUrl(product.coverStorageKey),
      condition: product.condition,
      price,
      isAvailable: product.isPurchasable,
    });
  }

  return { items, subtotal, hasUnavailableItems };
}

/**
 * Ürünü sepete ekler.
 *
 * Ürünün satın alınabilir olduğu eklerken de doğrulanır; sipariş anında yeniden
 * doğrulanır. Sepete eklemek bir rezervasyon değildir — ürün başkası tarafından
 * satın alınabilir.
 */
export async function addToCart(userId: string, productId: string): Promise<Cart> {
  const [product] = await catalog.getProductsForDisplay([productId]);

  if (product === undefined) {
    throw notFound('Ürün');
  }

  if (!product.isPurchasable) {
    throw businessRule(`"${product.title}" şu anda satışta değil.`);
  }

  const rows = await repository.findByUser(userId);
  const alreadyInCart = rows.some((row) => row.productId === productId);

  if (!alreadyInCart && rows.length >= MAX_CART_ITEMS) {
    throw businessRule(`Sepetinizde en fazla ${MAX_CART_ITEMS} farklı ürün bulunabilir.`);
  }

  await repository.add(userId, productId);

  return getCart(userId);
}

export async function removeFromCart(userId: string, productId: string): Promise<Cart> {
  const removed = await repository.remove(userId, productId);

  if (!removed) {
    throw notFound('Sepet kalemi');
  }

  return getCart(userId);
}

export async function clearCart(userId: string): Promise<Cart> {
  await repository.clear(userId);
  return { items: [], subtotal: 0, hasUnavailableItems: false };
}

/** Sepetteki kalem sayısı. Başlıktaki rozet için; tam sepeti çekmeye gerek yok. */
export async function getCartCount(userId: string): Promise<number> {
  return repository.countByUser(userId);
}
