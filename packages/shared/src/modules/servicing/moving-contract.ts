/**
 * Nakliye talebi şemaları.
 *
 * Nakliye, hizmet talebi tabanına iki adres (çıkış ve varış), ev büyüklüğü,
 * kat/asansör bilgisi ve taşınacak eşya listesi ekler. Kat ve asansör bilgisi
 * fiyatı doğrudan etkilediği için zorunludur.
 */

import { z } from 'zod';
import {
  appointmentDateSchema,
  optionalText,
  requiredText,
  servicedDistrictSchema,
  timeSlotSchema,
  uuidSchema,
} from '../../kernel/validation.ts';
import { HOUSE_SIZES } from '../../kernel/pricing.ts';
import {
  requestContactSchema,
  requestPhotoInputSchema,
  serviceRequestBaseSchema,
} from './request-contract.ts';

// ---------------------------------------------------------------------------
// Adres
// ---------------------------------------------------------------------------

/**
 * Nakliye noktası: adres + bina erişim bilgisi.
 *
 * Kat ve asansör, adresin parçası değil işin zorluğunun parçasıdır — "burası
 * neresi" ile "bu iş ne kadar zahmetli" farklı sorulardır. Veritabanında da
 * ayrı tutulurlar: adres `request_addresses` tablosunda, erişim bilgisi
 * `moving_request_details` sütunlarında.
 */
export const movingLocationSchema = z.object({
  address: z.object({
    district: servicedDistrictSchema,
    neighborhood: requiredText('Mahalle', 2, 100),
    street: requiredText('Sokak/Cadde', 2, 150),
    buildingNo: requiredText('Bina no', 1, 20),
    apartmentNo: optionalText(20),
    directions: optionalText(300),
  }),
  /** Zemin kat için 0, bodrum için negatif değer. */
  floor: z
    .number({
      required_error: 'Kat bilgisi zorunludur.',
      invalid_type_error: 'Kat sayı olmalıdır.',
    })
    .int({ message: 'Kat tam sayı olmalıdır.' })
    .min(-3, { message: 'Geçersiz kat.' })
    .max(50, { message: 'Geçersiz kat.' }),
  hasElevator: z.boolean({ required_error: 'Asansör bilgisi zorunludur.' }),
});

// ---------------------------------------------------------------------------
// Eşya listesi
// ---------------------------------------------------------------------------

/** Formda hazır seçenek olarak sunulan yaygın eşyalar. Serbest giriş de mümkündür. */
export const COMMON_MOVING_ITEMS = [
  'Buzdolabı',
  'Çamaşır Makinesi',
  'Bulaşık Makinesi',
  'Fırın',
  'Ocak',
  'Televizyon',
  'Koltuk Takımı',
  'Yatak Odası Takımı',
  'Tek Kişilik Yatak',
  'Çift Kişilik Yatak',
  'Gardırop',
  'Yemek Masası',
  'Sandalye',
  'Kitaplık',
  'Çalışma Masası',
  'Klima',
  'Halı',
  'Koli / Kutu',
] as const;

export const movingItemSchema = z.object({
  name: requiredText('Eşya adı', 1, 100),
  quantity: z
    .number()
    .int({ message: 'Adet tam sayı olmalıdır.' })
    .min(1, { message: 'Adet en az 1 olmalıdır.' })
    .max(99, { message: 'Adet en fazla 99 olabilir.' })
    .default(1),
  /** Demontaj gerektiren eşyalar ayrıca işaretlenir; fiyatı ve süreyi etkiler. */
  needsDisassembly: z.boolean().default(false),
  note: optionalText(200),
});

// ---------------------------------------------------------------------------
// Talep oluşturma
// ---------------------------------------------------------------------------

export const createMovingRequestSchema = z
  .object({
    contact: requestContactSchema,
    houseSize: z.enum(HOUSE_SIZES, {
      errorMap: () => ({ message: 'Lütfen ev büyüklüğünü seçin.' }),
    }),
    fromLocation: movingLocationSchema,
    toLocation: movingLocationSchema,
    /** Tercih edilen taşınma tarihi. Kesin randevu, teklif onaylandıktan sonra verilir. */
    preferredDate: appointmentDateSchema,
    preferredTimeSlot: timeSlotSchema.optional(),
    items: z
      .array(movingItemSchema)
      .min(1, { message: 'En az bir eşya eklemelisiniz.' })
      .max(100, { message: 'En fazla 100 eşya kalemi ekleyebilirsiniz.' }),
    needsPacking: z.boolean().default(false),
    needsAssembly: z.boolean().default(false),
    photos: z.array(requestPhotoInputSchema).max(10).default([]),
    customerNote: optionalText(1000),
  })
  .refine(
    (data) =>
      data.fromLocation.address.district !== data.toLocation.address.district ||
      data.fromLocation.address.street !== data.toLocation.address.street ||
      data.fromLocation.address.buildingNo !== data.toLocation.address.buildingNo,
    { message: 'Çıkış ve varış adresi aynı olamaz.', path: ['toLocation'] },
  );

export type CreateMovingRequestInput = z.infer<typeof createMovingRequestSchema>;

// ---------------------------------------------------------------------------
// Görünüm
// ---------------------------------------------------------------------------

export const movingRequestSchema = serviceRequestBaseSchema.extend({
  kind: z.literal('moving'),
  houseSize: z.enum(HOUSE_SIZES),
  fromLocation: movingLocationSchema,
  toLocation: movingLocationSchema,
  preferredDate: z.string(),
  preferredTimeSlot: timeSlotSchema.nullable(),
  items: z.array(
    movingItemSchema.extend({
      id: uuidSchema,
    }),
  ),
  needsPacking: z.boolean(),
  needsAssembly: z.boolean(),
  /**
   * Talep oluşturulurken hesaplanan tahmini tutar (kuruş).
   * Bağlayıcı değildir; bağlayıcı tutar `quote` alanındadır.
   */
  estimatedTotal: z.number().int(),
});

export type MovingRequest = z.infer<typeof movingRequestSchema>;
