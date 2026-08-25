/**
 * Ürün satış talebi şemaları.
 *
 * Müşteri elindeki ürünü işletmeye satmak ister: ürün bilgisi ve fotoğraflarını
 * gönderir, işletme değerlendirip fiyat teklifi verir. Kabul edilirse ürün teslim
 * alınır ve katalogda satışa çıkarılabilir.
 */

import { z } from 'zod';
import {
  MIN_PRODUCT_IMAGES,
  addressSchema,
  optionalText,
  requiredText,
  servicedDistrictSchema,
  uuidSchema,
} from '../../kernel/validation.ts';
import { PRODUCT_CONDITIONS } from '../../kernel/status.ts';
import {
  requestContactSchema,
  requestPhotoInputSchema,
  serviceRequestBaseSchema,
} from './request-contract.ts';

// ---------------------------------------------------------------------------
// Talep oluşturma
// ---------------------------------------------------------------------------

const pickupAddressSchema = addressSchema.extend({
  district: servicedDistrictSchema,
});

export const createSellRequestSchema = z.object({
  contact: requestContactSchema,
  title: requiredText('Ürün başlığı', 5, 160),
  categoryId: uuidSchema,
  brand: requiredText('Marka', 1, 60),
  model: optionalText(80),
  condition: z.enum(PRODUCT_CONDITIONS, {
    errorMap: () => ({ message: 'Lütfen ürün durumunu seçin.' }),
  }),
  /** Ürünün satın alındığı yıl. Değerlemede kullanılır. */
  purchaseYear: z
    .number()
    .int()
    .min(1980, { message: 'Geçersiz yıl.' })
    .max(new Date().getFullYear(), { message: 'Gelecek bir yıl seçilemez.' })
    .optional(),
  description: requiredText('Ürün açıklaması', 20, 3000),
  hasBox: z.boolean().default(false),
  hasAccessories: z.boolean().default(false),
  hasWarranty: z.boolean().default(false),
  /**
   * Müşterinin aklındaki fiyat (kuruş). İsteğe bağlıdır ve bağlayıcı değildir;
   * işletmenin teklifi ayrıca belirlenir.
   */
  askingPrice: z
    .number()
    .int({ message: 'Tutar kuruş cinsinden tam sayı olmalıdır.' })
    .positive({ message: 'Fiyat sıfırdan büyük olmalıdır.' })
    .optional(),
  pickupAddress: pickupAddressSchema,
  photos: z
    .array(requestPhotoInputSchema)
    .min(MIN_PRODUCT_IMAGES, {
      message: `Değerlendirme yapabilmemiz için en az ${MIN_PRODUCT_IMAGES} fotoğraf gerekiyor.`,
    })
    .max(10, { message: 'En fazla 10 fotoğraf yükleyebilirsiniz.' }),
  customerNote: optionalText(1000),
});

export type CreateSellRequestInput = z.infer<typeof createSellRequestSchema>;

// ---------------------------------------------------------------------------
// Görünüm
// ---------------------------------------------------------------------------

export const sellRequestSchema = serviceRequestBaseSchema.extend({
  kind: z.literal('sell_request'),
  title: z.string(),
  category: z.object({ id: uuidSchema, name: z.string(), slug: z.string() }),
  brand: z.string(),
  model: z.string().nullable(),
  condition: z.enum(PRODUCT_CONDITIONS),
  purchaseYear: z.number().int().nullable(),
  description: z.string(),
  hasBox: z.boolean(),
  hasAccessories: z.boolean(),
  hasWarranty: z.boolean(),
  askingPrice: z.number().int().nullable(),
  pickupAddress: addressSchema,
  /**
   * Talep kabul edilip ürün teslim alındıysa, katalogda oluşturulan ürünün kimliği.
   * Böylece satış talebi ile envanter kaydı arasındaki bağ korunur.
   */
  resultingProductId: uuidSchema.nullable(),
});

export type SellRequest = z.infer<typeof sellRequestSchema>;

// ---------------------------------------------------------------------------
// Yönetim işlemleri
// ---------------------------------------------------------------------------

/**
 * Teslim alınan ürünü katalog kaydına dönüştürür. Fiyat ve durum yönetici
 * tarafından belirlenir; satış talebindeki bilgiler ön dolgu olarak kullanılır.
 */
export const convertToProductSchema = z.object({
  title: requiredText('Ürün başlığı', 5, 160),
  description: requiredText('Ürün açıklaması', 20, 5000),
  price: z
    .number()
    .int({ message: 'Tutar kuruş cinsinden tam sayı olmalıdır.' })
    .positive({ message: 'Satış fiyatı sıfırdan büyük olmalıdır.' }),
  categoryId: uuidSchema,
  brandId: uuidSchema.nullable().default(null),
  condition: z.enum(PRODUCT_CONDITIONS),
  warrantyMonths: z.number().int().min(0).max(60).default(0),
  /** Talep fotoğraflarının ürün görseli olarak kopyalanıp kopyalanmayacağı. */
  copyPhotos: z.boolean().default(true),
});

export type ConvertToProductInput = z.infer<typeof convertToProductSchema>;
