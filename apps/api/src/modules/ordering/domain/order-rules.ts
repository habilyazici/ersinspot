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

/** Bir durumdan gidilebilecek durumlar. Yönetim panelinde seçenek listesi üretmek için. */
export function allowedOrderTransitions(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[from];
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
 * Ödeme bu yöntemde önceden mi bekleniyor?
 *
 * Havale/EFT'de müşteri parayı gönderir, personel eşleştirir. Kapıda ödemede
 * tahsilat teslimatta yapılır ve teslim eden kişi kaydeder.
 */
export function requiresUpfrontPayment(paymentMethod: PaymentMethod): boolean {
  return paymentMethod === 'bank_transfer';
}

/**
 * Sepette en fazla kaç farklı ürün bulunabilir.
 *
 * İkinci el ürünler tekil olduğu için büyük sepetler beklenmez; sınır, hem
 * arayüzü hem sipariş oluşturma işlemini makul tutar.
 */
export const MAX_CART_ITEMS = 20;
