/**
 * Kaynak sahipliği kuralları.
 *
 * IDOR (dolaylı nesne referansı) açıklarına karşı TEK kontrol noktası. Eski
 * kodda `/orders/customer/:email` gibi uçlar, URL'deki kimliğin oturum sahibine
 * ait olup olmadığını hiç kontrol etmiyordu.
 *
 * Kural HTTP'den bağımsızdır — bu yüzden `http/` altında değil: uygulama
 * katmanındaki servisler de aynı kontrolü kullanır. Middleware katmanı
 * "kim giriş yapmış" sorusunu yanıtlar; burası "bu kayda dokunabilir mi"
 * sorusunu.
 */

import { hasRoleAtLeast } from '@ersinspot/shared';
import type { UserRole } from '@ersinspot/shared';
import { forbidden } from './errors/index.ts';

/** Kaydın sahibi olmasa da tüm kayıtlara erişebilen aktör. */
export interface Actor {
  readonly id: string;
  readonly role: UserRole;
}

/**
 * Personel veya yönetici mi?
 *
 * Rol karşılaştırması tek yerde yapılır. Servislerde `role === 'staff' ||
 * role === 'admin'` biçiminde üç ayrı kopya vardı; yeni bir rol eklendiğinde
 * hepsinin bulunup güncellenmesi gerekiyordu.
 */
export function isStaff(role: UserRole): boolean {
  return hasRoleAtLeast(role, 'staff');
}

/**
 * Kaynağın sahibi mi, yoksa personel mi?
 *
 * @param actor Oturum açmış kullanıcı.
 * @param ownerId Kaynağın sahibi olan kullanıcının kimliği. Kayıt sahipsizse null.
 */
export function assertCanAccess(actor: Actor, ownerId: string | null): void {
  // Personel ve yöneticiler tüm kayıtlara erişebilir.
  if (isStaff(actor.role)) return;

  if (ownerId === null || ownerId !== actor.id) {
    /*
      Kaynağın var olduğunu ele vermemek için 403 yerine 404 döndürmek de bir
      seçenek; burada 403 tercih edildi çünkü kimliği doğrulanmış bir kullanıcı
      için "yetkiniz yok" mesajı daha anlaşılır ve numaralandırma riski düşüktür.
    */
    throw forbidden();
  }
}
