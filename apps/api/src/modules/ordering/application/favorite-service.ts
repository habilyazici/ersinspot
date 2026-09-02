/**
 * Favoriler.
 *
 * Müşterinin beğendiği ürünleri işaretlemesi. Vitrindeki "En Çok Favorilenen"
 * sıralaması ve yönetim panelindeki ilgi ölçüsü bu kayıtlara dayanır.
 *
 * Ürün bilgisi `catalog` sözleşmesinden alınır; bu modül `products` tablosuna
 * erişemez.
 */

import type { ProductSummary } from '@ersinspot/shared';
import { catalog } from '../../catalog/index.ts';
import { businessRule } from '../../../platform/errors/index.ts';
import { logger } from '../../../platform/observability/logger.ts';
import { MAX_FAVORITES } from '../domain/order-rules.ts';
import * as repository from '../infrastructure/favorite-repository.ts';

/**
 * Ürünü favorilere ekler veya çıkarır.
 *
 * @returns İşlem sonunda ürün favoride mi? Arayüz kalp simgesini buna göre
 *   çizer; kendi tahminini tutmaz.
 */
export async function toggleFavorite(userId: string, productId: string): Promise<boolean> {
  /*
    Sınır yalnızca EKLEMEDE denetlenir; kaldırmak her zaman serbesttir. Sayım
    önce yapıldığı için eşzamanlı iki ekleme sınırı bir aşabilir — kabul
    edilebilir: bu bir kötüye kullanım freni, kesin bir kota değil.
  */
  if (await repository.isAtLimit(userId, productId)) {
    throw businessRule(
      `En fazla ${MAX_FAVORITES} ürünü favorilerinize ekleyebilirsiniz. ` +
        'Yeni ürün eklemek için listeden birini çıkarın.',
    );
  }

  const isFavorite = await repository.toggle(userId, productId);

  logger.debug('Favori değişti', { userId, productId, isFavorite });

  return isFavorite;
}

/**
 * Kullanıcının favorilerini, en yeniden eskiye döndürür.
 *
 * Artık vitrinde görünmeyen ürünler (satılmış, taslağa çekilmiş, silinmiş)
 * listeye girmez: kullanıcıya açılamayan bir karta yer vermek yerine kayıt
 * sessizce atlanır.
 */
export async function listFavorites(userId: string): Promise<ProductSummary[]> {
  const productIds = await repository.listProductIds(userId, MAX_FAVORITES);
  return catalog.listProductSummaries(productIds);
}

/** Verilen ürünlerden hangileri favoride? Liste ekranları tek sorguda sorar. */
export async function findFavoritedIds(
  userId: string,
  productIds: readonly string[],
): Promise<string[]> {
  const favorited = await repository.filterFavorited(userId, productIds);
  return [...favorited];
}
