/**
 * Hizmet talebi iş kuralları.
 *
 * Nakliye, teknik servis ve ürün satış talebi aynı yaşam döngüsünü paylaşır:
 * talep gelir, incelenir, teklif verilir, müşteri yanıtlar, randevu planlanır,
 * iş tamamlanır. Kurallar bir kez burada yazılır; üç tür de aynı davranır.
 *
 * Eski kod tabanında bu üç akış birbirinden bağımsız yazılmıştı ve durum
 * listeleri ayrışmıştı: nakliye yönetiminde `status === 'pending'` karşılaştırması
 * yedi ayrı yerde hiçbir zaman doğru olamıyordu, çünkü o birleşimde 'pending'
 * bulunmuyordu.
 */

import type { RequestStatus, UserRole } from '@ersinspot/shared';
import {
  CUSTOMER_CANCELLABLE_REQUEST_STATUSES,
  REQUEST_STATUS_TRANSITIONS,
  RESPONDABLE_REQUEST_STATUS,
  canTransition,
  hasRoleAtLeast,
} from '@ersinspot/shared';

export function canTransitionRequest(from: RequestStatus, to: RequestStatus): boolean {
  return canTransition(REQUEST_STATUS_TRANSITIONS, from, to);
}

/**
 * Müşteri talebini iptal edebilir mi?
 *
 * Tamamlanmış, reddedilmiş veya zaten iptal edilmiş talep iptal edilemez.
 * Personel, durum makinesinin izin verdiği her yerde iptal edebilir.
 */
export function canCancelRequest(status: RequestStatus, role: UserRole): boolean {
  if (hasRoleAtLeast(role, 'staff')) {
    return canTransitionRequest(status, 'cancelled');
  }

  return (CUSTOMER_CANCELLABLE_REQUEST_STATUSES as readonly RequestStatus[]).includes(status);
}

/**
 * Müşteri teklife yanıt verebilir mi?
 *
 * Yalnızca teklif verilmiş durumdaki talepler yanıtlanabilir. Teklif henüz
 * verilmemişse veya müşteri zaten yanıtlamışsa işlem reddedilir.
 */
export function canRespondToQuote(status: RequestStatus): boolean {
  return status === RESPONDABLE_REQUEST_STATUS;
}

/** Bu duruma geçmek için geçerli bir teklifin bulunması gerekir. */
export function requiresQuote(status: RequestStatus): boolean {
  return status === 'accepted' || status === 'rejected';
}

/** Bu duruma geçmek için planlanmış bir randevunun bulunması gerekir. */
export function requiresAppointment(status: RequestStatus): boolean {
  return status === 'scheduled';
}

/**
 * Teklifin geçerlilik süresi dolmuş mu?
 *
 * Süresi dolmuş bir teklif kabul edilemez; işletme fiyatı yeniden
 * değerlendirmelidir.
 *
 * Uygulama PAYLAŞILAN PAKETTEDİR: arayüz de aynı kuralı bilmek zorunda, aksi
 * halde müşteriye süresi geçmiş bir teklif için kabul düğmesi gösterilir ve
 * karşılığında yalnızca bir hata mesajı alır. Buradan yeniden dışa aktarılır
 * ki uygulama katmanı kuralları tek yerden içe aktarmayı sürdürsün — katalog
 * modülü `slugify` için aynı yolu izliyor.
 */
export { isQuoteExpired } from '@ersinspot/shared';

/**
 * Bir müşterinin aynı anda açık tutabileceği talep sayısı.
 *
 * Kötüye kullanımı sınırlar: bir kişi yüzlerce talep açıp iş kuyruğunu
 * dolduramaz. Sınır cömerttir; normal kullanımda ulaşılmaz.
 */
export const MAX_ACTIVE_REQUESTS_PER_CUSTOMER = 10;
