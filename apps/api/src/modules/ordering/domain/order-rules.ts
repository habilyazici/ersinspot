/**
 * Sipariş iş kuralları.
 *
 * Saf TypeScript: veritabanı, HTTP ve çerçeve bilmez. Veritabanı olmadan test
 * edilebilir.
 */

import type { OrderStatus, PaymentMethod, UserRole } from '@ersinspot/shared';
import {
  CUSTOMER_CANCELLABLE_ORDER_STATUSES,
  INITIAL_ORDER_STATUS_BY_PAYMENT,
  ORDER_STATUS_TRANSITIONS,
  canTransition,
  hasRoleAtLeast,
} from '@ersinspot/shared';

/** Sipariş durumu geçişi izinli mi? */
export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return canTransition(ORDER_STATUS_TRANSITIONS, from, to);
}

/**
 * Siparişin başlangıç durumu ödeme yöntemine göre belirlenir.
 *
 * Kapıda ödemede tahsilat teslimatta yapılacağı için sipariş doğrudan alınmış
 * sayılır; havalede önce ödeme beklenir.
 */
export function initialOrderStatus(paymentMethod: PaymentMethod): OrderStatus {
  return INITIAL_ORDER_STATUS_BY_PAYMENT[paymentMethod];
}

/**
 * Müşteri kendi siparişini iptal edebilir mi?
 *
 * Yalnızca hazırlığa geçmeden önce. Hazırlanmaya başlamış veya yola çıkmış bir
 * siparişi müşteri tek taraflı iptal edemez; personelle görüşmesi gerekir.
 * Personel her aşamada iptal edebilir.
 */
export function canCancelOrder(status: OrderStatus, role: UserRole): boolean {
  if (hasRoleAtLeast(role, 'staff')) {
    return canTransitionOrder(status, 'cancelled');
  }

  return (CUSTOMER_CANCELLABLE_ORDER_STATUSES as readonly OrderStatus[]).includes(status);
}

/** Bu duruma geçildiğinde ürünler satıldı sayılır. */
export function completesSale(status: OrderStatus): boolean {
  return status === 'delivered';
}

/** Bu duruma geçildiğinde rezervasyon çözülür. */
export function releasesReservation(status: OrderStatus): boolean {
  return status === 'cancelled';
}

/**
 * Sepette en fazla kaç farklı ürün bulunabilir.
 *
 * İkinci el ürünler tekil olduğu için büyük sepetler beklenmez; sınır, hem
 * arayüzü hem sipariş oluşturma işlemini makul tutar.
 */
export const MAX_CART_ITEMS = 20;

/**
 * Bir kullanıcının tutabileceği en fazla favori sayısı.
 *
 * Favori listesi tek seferde döndürülür; sınırsız bırakıldığında hem yanıt
 * boyutu hem sorgu maliyeti kullanıcının insafına kalırdı. Sınır cömerttir:
 * normal kullanımda ulaşılmaz, kötüye kullanımı ise sınırlar.
 */
export const MAX_FAVORITES = 200;
