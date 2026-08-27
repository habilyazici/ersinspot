/**
 * PostgreSQL enum tipleri.
 *
 * Değerler `@ersinspot/shared` paketindeki alan modelinden türetilir; böylece
 * veritabanının kabul ettiği küme ile uygulamanın bildiği küme ayrışamaz.
 * Yeni bir durum eklendiğinde önce paylaşılan pakette tanımlanır, sonra migration
 * üretilir — tek yönlü ve izlenebilir bir akış.
 */

import { pgEnum } from 'drizzle-orm/pg-core';
import {
  BLOG_CATEGORIES,
  CONTACT_SUBJECTS,
  DELIVERY_METHODS,
  DEVICE_TYPES,
  FAQ_CATEGORIES,
  HOUSE_SIZES,
  IZMIR_DISTRICTS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PROBLEM_CATEGORIES,
  PRODUCT_CONDITIONS,
  PRODUCT_STATUSES,
  REQUEST_STATUSES,
  SERVICE_KINDS,
  UPLOAD_PURPOSES,
  USER_ROLES,
  WARRANTY_STATUSES,
} from '@ersinspot/shared';

export const userRoleEnum = pgEnum('user_role', USER_ROLES);

export const productStatusEnum = pgEnum('product_status', PRODUCT_STATUSES);
export const productConditionEnum = pgEnum('product_condition', PRODUCT_CONDITIONS);

export const orderStatusEnum = pgEnum('order_status', ORDER_STATUSES);
export const paymentMethodEnum = pgEnum('payment_method', PAYMENT_METHODS);
export const deliveryMethodEnum = pgEnum('delivery_method', DELIVERY_METHODS);

export const serviceKindEnum = pgEnum('service_kind', SERVICE_KINDS);
export const requestStatusEnum = pgEnum('request_status', REQUEST_STATUSES);

export const houseSizeEnum = pgEnum('house_size', HOUSE_SIZES);
export const deviceTypeEnum = pgEnum('device_type', DEVICE_TYPES);
export const problemCategoryEnum = pgEnum('problem_category', PROBLEM_CATEGORIES);
export const warrantyStatusEnum = pgEnum('warranty_status', WARRANTY_STATUSES);

export const contactSubjectEnum = pgEnum('contact_subject', CONTACT_SUBJECTS);
export const blogCategoryEnum = pgEnum('blog_category', BLOG_CATEGORIES);
export const uploadPurposeEnum = pgEnum('upload_purpose', UPLOAD_PURPOSES);

/**
 * İzmir ilçeleri.
 *
 * Adresin ilçe alanı serbest metin değil, kapalı bir kümedir. Eski şemada ilçe
 * `jsonb` içinde metin olarak duruyordu; "Buca" ile "buca" farklı sayıldığı için
 * ücretsiz teslimat kuralı bazen çalışmıyordu.
 */
export const izmirDistrictEnum = pgEnum('izmir_district', IZMIR_DISTRICTS);

/** Bir olayı kimin oluşturduğu: müşteri, personel veya otomatik sistem. */
export const actorEnum = pgEnum('event_actor', ['customer', 'staff', 'system'] as const);

/**
 * Hizmet talebindeki adresin rolü.
 *
 * Nakliyede iki adres vardır (çıkış ve varış); teknik serviste ve satış
 * talebinde tek adres. Rol sütunu, tek tabloda hepsini tutmayı ve "bu talebin
 * çıkış adresi hangisi" sorusunu belirsizlik olmadan yanıtlamayı sağlar.
 */
export const requestAddressRoleEnum = pgEnum('request_address_role', [
  'moving_from',
  'moving_to',
  'service_location',
  'pickup',
] as const);

/**
 * SSS gruplama başlıkları.
 *
 * Serbest metin yerine kapalı küme: "Siparişler" ve "Sipariş" gibi varyasyonlar
 * çoğalıp gruplamayı bozmasın.
 */
export const faqCategoryEnum = pgEnum('faq_category', FAQ_CATEGORIES);

/** Site ayarının değer tipi. Okuma tarafının doğru dönüşümü yapmasını sağlar. */
export const settingValueTypeEnum = pgEnum('setting_value_type', [
  'string',
  'number',
  'boolean',
  'time',
] as const);

/**
 * Ödeme kaydının durumu.
 *
 * Havale/EFT'de ödeme beklenir ve personel gelen parayı elle eşleştirir;
 * kapıda ödemede tahsilat teslimatta yapılır. İkisinde de "para geldi mi"
 * sorusunun kaydı tutulmalıdır.
 */
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'confirmed',
  'refunded',
  'failed',
] as const);
