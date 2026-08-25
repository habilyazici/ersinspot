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
 * Türkçe karakterlerin ASCII karşılıkları.
 *
 * `String.normalize('NFD')` Türkçe'de doğru sonuç vermez: "ı" harfi ayrıştırılamaz
 * ve "İ" küçültüldüğünde birleştirici nokta bırakır. Bu yüzden eşleme elle yapılır.
 */
const TURKISH_TO_ASCII: Readonly<Record<string, string>> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  i: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

/**
 * Başlıktan SEO dostu bağlantı adı üretir.
 *
 *   "Arçelik 9 Kg Çamaşır Makinesi"  →  "arcelik-9-kg-camasir-makinesi"
 *
 * Benzersizlik burada sağlanmaz; çağıran taraf çakışma durumunda sonuna ayırt
 * edici bir ek koyar (bkz. `withSlugSuffix`).
 */
export function slugify(title: string): string {
  const transliterated = [...title]
    .map((character) => TURKISH_TO_ASCII[character] ?? character)
    .join('');

  return (
    transliterated
      .toLowerCase()
      .normalize('NFD')
      // Latin harflerdeki aksanları kaldır (é → e).
      .replace(/[̀-ͯ]/g, '')
      // Harf ve rakam dışındaki her şey ayırıcı olur.
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      // Aşırı uzun bağlantı adları hem çirkin hem de indeks boyutunu büyütür.
      .slice(0, 80)
      .replace(/-+$/, '')
  );
}

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
