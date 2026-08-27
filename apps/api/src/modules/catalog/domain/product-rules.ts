/**
 * Ürün iş kuralları.
 *
 * Bu dosya saf TypeScript'tir: veritabanı, HTTP ve çerçeve bilmez. Bu yüzden
 * veritabanı olmadan test edilebilir ve kuralların doğruluğu altyapıdan bağımsız
 * olarak doğrulanabilir.
 */

import type { ProductStatus } from '@ersinspot/shared';
import { PUBLICLY_VISIBLE_PRODUCT_STATUSES, PURCHASABLE_PRODUCT_STATUS } from '@ersinspot/shared';

/**
 * İzin verilen ürün durumu geçişleri.
 *
 * İkinci el ürünler tekildir; bir ürünün stok adedi her zaman 1'dir. Bu yüzden
 * yaşam döngüsü bir stok sayacı değil, bir durum makinesidir:
 *
 *   draft → in_storage → for_sale → reserved → sold
 *                            ↑          │
 *                            └──────────┘  (sipariş iptal edilirse geri döner)
 */
const TRANSITIONS: Readonly<Record<ProductStatus, readonly ProductStatus[]>> = {
  draft: ['in_storage', 'for_sale'],
  in_storage: ['for_sale', 'draft'],
  for_sale: ['reserved', 'in_storage'],
  // Rezerve ürün ya satılır ya da sipariş iptal edilince satışa geri döner.
  reserved: ['sold', 'for_sale'],
  // Satılan ürün son durumdur. Bir iade akışı eklenirse burası genişletilir.
  sold: [],
};

export function canTransitionProduct(from: ProductStatus, to: ProductStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedProductTransitions(from: ProductStatus): readonly ProductStatus[] {
  return TRANSITIONS[from];
}

/** Ürün site vitrininde listelenebilir mi? */
export function isPubliclyVisible(status: ProductStatus): boolean {
  return (PUBLICLY_VISIBLE_PRODUCT_STATUSES as readonly ProductStatus[]).includes(status);
}

/** Ürün sepete eklenebilir ve sipariş edilebilir mi? */
export function isPurchasable(status: ProductStatus): boolean {
  return status === PURCHASABLE_PRODUCT_STATUS;
}

// ---------------------------------------------------------------------------
// Bağlantı adı (slug) üretimi
// ---------------------------------------------------------------------------

/**
/**
 * Bağlantı adı üretimi paylaşılan çekirdektedir.
 *
 * Yönetim panelindeki form da aynı fonksiyonu kullanır; iki uygulama ayrı
 * yazılsaydı personelin ekranda gördüğü ile kaydedilen ayrışabilirdi.
 */
export { slugify } from '@ersinspot/shared';

/**
 * Çakışan bağlantı adına ayırt edici ek koyar: "buzdolabi" → "buzdolabi-2".
 *
 * Sıra numarası, rastgele karakterlere tercih edilir: bağlantı okunabilir kalır.
 */
export function withSlugSuffix(baseSlug: string, attempt: number): string {
  if (attempt <= 1) return baseSlug;

  const suffix = `-${attempt}`;
  const maxBaseLength = 80 - suffix.length;

  return `${baseSlug.slice(0, maxBaseLength).replace(/-+$/, '')}${suffix}`;
}

// ---------------------------------------------------------------------------
// Görsel sıralaması
// ---------------------------------------------------------------------------

/**
 * Ürün görsellerini görüntüleme sırasına göre düzenler.
 *
 * İlk görsel kapak görselidir; liste ekranlarında ve paylaşım önizlemelerinde
 * kullanılır. Sıra numaraları boşluklu gelebilir (araya görsel eklenmiş veya
 * silinmiş olabilir), bu yüzden yeniden numaralandırılır.
 */
export function normalizeImageOrder<T extends { displayOrder: number }>(images: readonly T[]): T[] {
  return [...images]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((image, index) => ({ ...image, displayOrder: index }));
}

// ---------------------------------------------------------------------------
// Garanti
// ---------------------------------------------------------------------------

/**
 * Garanti süresini kullanıcıya gösterilecek metne çevirir.
 *
 * Eski kod tabanında bu dönüşüm iki ayrı yönde, elle yazılmış eşleme tablolarıyla
 * yapılıyordu (`warrantyStringToMonths` ve `warrantyMonthsToString`) ve tablolar
 * birbirini tam karşılamıyordu. Tek yön ve hesaplama yeterlidir.
 */
export function formatWarranty(months: number): string {
  if (months <= 0) return 'Garanti Yok';
  if (months < 12) return `${months} Ay Garanti`;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) return `${years} Yıl Garanti`;
  return `${years} Yıl ${remainingMonths} Ay Garanti`;
}
