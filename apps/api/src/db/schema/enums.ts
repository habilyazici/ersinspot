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
  DELIVERY_METHODS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PRODUCT_CONDITIONS,
  PRODUCT_STATUSES,
  REQUEST_STATUSES,
  SERVICE_KINDS,
  USER_ROLES,
} from '@ersinspot/shared';
import {
  BLOG_CATEGORIES,
  CONTACT_SUBJECTS,
  DEVICE_TYPES,
  PROBLEM_CATEGORIES,
  UPLOAD_PURPOSES,
  WARRANTY_STATUSES,
} from '@ersinspot/shared';
import { HOUSE_SIZES } from '@ersinspot/shared';

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

/** Bir olayı kimin oluşturduğu: müşteri, personel veya otomatik sistem. */
export const actorEnum = pgEnum('event_actor', ['customer', 'staff', 'system'] as const);
