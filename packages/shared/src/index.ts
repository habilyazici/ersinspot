/**
 * @ersinspot/shared
 *
 * Sunucu ve tarayıcının paylaştığı sözleşme: alan modeli, doğrulama şemaları ve
 * hata biçimi. Modüler monolitin modülleri bu paketteki karşılıklarına dayanır.
 *
 * Bu paket tarayıcıya da gönderilir; içine Node'a özgü kod (dosya sistemi,
 * veritabanı, `process`) konulamaz.
 *
 * Kullanım:
 *   import { money, ORDER_STATUS_LABELS } from '@ersinspot/shared';
 *   import { createOrderSchema } from '@ersinspot/shared/ordering';
 */

export * from './kernel/index.ts';

export * from './modules/identity/index.ts';
export * from './modules/catalog/index.ts';
export * from './modules/ordering/index.ts';
export * from './modules/servicing/index.ts';
export * from './modules/content/index.ts';
