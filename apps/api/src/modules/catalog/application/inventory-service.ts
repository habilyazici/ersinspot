/**
 * Envanter işlemleri — `ordering` modülünün kullandığı sözleşme.
 *
 * Bu dosya, "1 TL'ye buzdolabı" açığının yapısal çözümüdür.
 *
 * Eski kod tabanında sipariş toplamı istemcinin gönderdiği fiyatlardan
 * hesaplanıyordu:
 *
 *     const subtotal = items.reduce((sum, item) => sum + item.price, 0);
 *
 * Artık `ordering` modülü `products` tablosuna erişemez (ESLint sınır kuralı) ve
 * fiyatı buradan sormak zorundadır. Fiyat daima veritabanından okunur.
 *
 * İkinci sorumluluk: tekil ürünlerin çift satılmasını engellemek. İkinci el
 * ürünlerin stok adedi 1'dir; iki müşteri aynı anda sipariş vermeye çalışırsa
 * yalnızca biri başarılı olmalıdır.
 */

import type { ProductCondition, ProductStatus } from '@ersinspot/shared';
import type { Transaction } from '../../../platform/db/client.ts';
import { productUnavailable } from '../../../platform/errors/index.ts';
import { canTransitionProduct, isPurchasable } from '../domain/product-rules.ts';
import * as repository from '../infrastructure/product-repository.ts';

/**
 * Rezervasyon süresi.
 *
 * Ürün bir siparişe bağlandığında bu süre kadar kilitli kalır. Havale/EFT ile
 * ödenmeyen siparişler ürünü sonsuza kadar satıştan çıkarmasın diye sınırlıdır.
 *
 * Süre dolduğunda SİPARİŞİ İPTAL ETMEK `ordering` modülünün işidir
 * (`cancelExpiredUnpaidOrders`); iptal, ürünü normal yoldan serbest bırakır.
 * Buradaki `releaseExpiredReservations` yalnızca emniyet ağıdır: siparişi
 * kalmamış ya da elle değiştirilmiş bir rezervasyon takılı kalmasın diye.
 * Değer `ordering` tarafından da okunur; iki yerde ayrı yazıldığında ürün
 * serbest kalırken siparişin açık kalması mümkün olurdu.
 *
 * Üç gün, havale bildiriminin makul bir sürede yapılmasını beklerken müşteriyi
 * de sıkıştırmayan bir aralıktır.
 */
export const RESERVATION_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

export interface PurchasableProduct {
  readonly id: string;
  /** Ürün sayfasının bağlantı adı. Sepet kaleminden ürüne dönmek için. */
  readonly slug: string;
  readonly title: string;
  /** Kuruş cinsinden güncel birim fiyat. Sipariş tutarı bu değerden hesaplanır. */
  readonly unitPrice: number;
  readonly condition: ProductCondition;

  /**
   * Kapak görselinin DEPOLAMA ANAHTARI — URL değil.
   *
   * Sipariş kalemleri bu değeri anlık görüntü olarak saklar. URL yapılandırmadan
   * türetilir; depolama sunucusu değişse kayıtlı URL'ler kırılırdı, anahtar ise
   * sabittir. Görüntüleme adresine çevirme işi okuma tarafında yapılır.
   */
  readonly coverStorageKey: string | null;
  readonly status: ProductStatus;
  /** Ürün şu anda sipariş edilebilir mi? */
  readonly isPurchasable: boolean;
}

/**
 * Sipariş için ürün bilgilerini getirir ve satırları kilitler.
 *
 * `FOR UPDATE` kilidi, iki eşzamanlı siparişin aynı tekil ürünü almasını
 * engeller: ikinci işlem ilki bitene kadar bekler, sonra ürünü `reserved`
 * durumda görüp reddedilir.
 *
 * Bulunamayan ürünler sonuçta yer almaz; çağıran taraf eksikleri fark etmelidir.
 *
 * @param tx Zorunlu. Kilit yalnızca bir işlem içinde anlamlıdır; işlem dışında
 *   çağrılması bir programlama hatasıdır ve tip düzeyinde engellenir.
 */
export async function getPurchasableProducts(
  productIds: readonly string[],
  tx: Transaction,
): Promise<PurchasableProduct[]> {
  const rows = await repository.findPurchasableForUpdate(productIds, tx);

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    unitPrice: row.priceKurus,
    condition: row.condition,
    coverStorageKey: row.coverStorageKey,
    status: row.status,
    isPurchasable: isPurchasable(row.status),
  }));
}

/**
 * Ürünleri rezerve eder: sipariş oluşturulurken çağrılır.
 *
 * Herhangi bir ürün satılabilir durumda değilse istisna fırlatılır ve işlem
 * geri alınır — kısmi rezervasyon oluşmaz.
 */
export async function reserveProducts(
  products: readonly PurchasableProduct[],
  tx: Transaction,
): Promise<void> {
  for (const product of products) {
    if (!canTransitionProduct(product.status, 'reserved')) {
      throw productUnavailable(product.title);
    }
  }

  await repository.updateStatuses(
    products.map((product) => product.id),
    'reserved',
    tx,
    new Date(Date.now() + RESERVATION_DURATION_MS),
  );
}

/**
 * Süresi geçmiş rezervasyonları serbest bırakır.
 *
 * EMNİYET AĞIDIR. Olağan yol, ödemesi gelmeyen siparişin `ordering` tarafından
 * iptal edilmesi ve iptalin ürünü serbest bırakmasıdır; bu görev yalnızca o
 * yoldan kaçmış — siparişi silinmiş ya da elle değiştirilmiş — rezervasyonları
 * toplar. Bakım görevi çağırır.
 */
export async function releaseExpiredReservations(): Promise<number> {
  return repository.releaseExpiredReservations();
}

/**
 * Rezervasyonu kaldırır: sipariş iptal edildiğinde çağrılır.
 *
 * Zaten satılmış ürünler atlanır — teslim edilmiş bir siparişin iptali ürünü
 * satıştan geri getirmemelidir.
 */
export async function releaseProducts(
  productIds: readonly string[],
  tx: Transaction,
): Promise<number> {
  const rows = await repository.findPurchasableForUpdate(productIds, tx);

  const releasable = rows
    .filter((row) => canTransitionProduct(row.status, 'for_sale'))
    .map((row) => row.id);

  await repository.updateStatuses(releasable, 'for_sale', tx);

  return releasable.length;
}

/**
 * Ürünleri satıldı olarak işaretler: sipariş teslim edildiğinde çağrılır.
 *
 * Yalnızca rezerve durumdaki ürünler işaretlenir; durum makinesi doğrudan
 * `for_sale → sold` geçişine izin vermez, çünkü bu, ürünün bir siparişe
 * bağlanmadan satılmış görünmesi demek olurdu.
 */
export async function markProductsAsSold(
  productIds: readonly string[],
  tx: Transaction,
): Promise<number> {
  const rows = await repository.findPurchasableForUpdate(productIds, tx);

  const sellable = rows
    .filter((row) => canTransitionProduct(row.status, 'sold'))
    .map((row) => row.id);

  await repository.updateStatuses(sellable, 'sold', tx);

  return sellable.length;
}
