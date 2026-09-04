/**
 * Teknik servis talebi şemaları.
 *
 * Cihaz bilgisi, arıza tanımı ve adres alır. Keşif ücreti sabittir ve talep
 * oluşturulurken kullanıcıya bildirilir; onarım kabul edilirse toplam tutardan düşülür.
 */

import { z } from 'zod';
import {
  addressSchema,
  appointmentDateSchema,
  optionalText,
  requiredText,
  servicedDistrictSchema,
  timeSlotSchema,
} from '../../kernel/validation.ts';
import {
  requestContactSchema,
  requestPhotoInputSchema,
  serviceRequestBaseSchema,
} from './request-contract.ts';

// ---------------------------------------------------------------------------
// Cihaz
// ---------------------------------------------------------------------------

export const DEVICE_TYPES = [
  'refrigerator',
  'washing_machine',
  'dishwasher',
  'oven',
  'stove',
  'air_conditioner',
  'television',
  'water_heater',
  'vacuum_cleaner',
  'small_appliance',
  'other',
] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

export const DEVICE_TYPE_LABELS: Readonly<Record<DeviceType, string>> = {
  refrigerator: 'Buzdolabı',
  washing_machine: 'Çamaşır Makinesi',
  dishwasher: 'Bulaşık Makinesi',
  oven: 'Fırın',
  stove: 'Ocak',
  air_conditioner: 'Klima',
  television: 'Televizyon',
  water_heater: 'Şofben / Termosifon',
  vacuum_cleaner: 'Elektrikli Süpürge',
  small_appliance: 'Küçük Ev Aleti',
  other: 'Diğer',
};

/** Sık karşılaşılan arıza kategorileri. Teknisyenin ön hazırlık yapmasını sağlar. */
export const PROBLEM_CATEGORIES = [
  'not_powering_on',
  'not_heating',
  'not_cooling',
  'water_leak',
  'unusual_noise',
  'error_code',
  'not_draining',
  'physical_damage',
  'other',
] as const;

export type ProblemCategory = (typeof PROBLEM_CATEGORIES)[number];

export const PROBLEM_CATEGORY_LABELS: Readonly<Record<ProblemCategory, string>> = {
  not_powering_on: 'Çalışmıyor / Açılmıyor',
  not_heating: 'Isıtmıyor',
  not_cooling: 'Soğutmuyor',
  water_leak: 'Su Kaçırıyor',
  unusual_noise: 'Anormal Ses Çıkarıyor',
  error_code: 'Hata Kodu Veriyor',
  not_draining: 'Suyu Boşaltmıyor',
  physical_damage: 'Fiziksel Hasar',
  other: 'Diğer',
};

export const WARRANTY_STATUSES = ['in_warranty', 'out_of_warranty', 'unknown'] as const;
export type WarrantyStatus = (typeof WARRANTY_STATUSES)[number];

export const WARRANTY_STATUS_LABELS: Readonly<Record<WarrantyStatus, string>> = {
  in_warranty: 'Garanti Kapsamında',
  out_of_warranty: 'Garanti Dışı',
  unknown: 'Bilmiyorum',
};

// ---------------------------------------------------------------------------
// Talep oluşturma
// ---------------------------------------------------------------------------

/** Teknik servis adresi: standart adres, hizmet verilen ilçe zorunluluğuyla. */
const serviceAddressSchema = addressSchema.extend({
  district: servicedDistrictSchema,
});

export const createTechnicalServiceRequestSchema = z
  .object({
    contact: requestContactSchema,
    deviceType: z.enum(DEVICE_TYPES, {
      errorMap: () => ({ message: 'Lütfen cihaz türünü seçin.' }),
    }),
    /** `deviceType` "other" seçildiğinde zorunlu hale gelir. */
    customDeviceType: optionalText(80),
    brand: requiredText('Marka', 1, 60),
    model: optionalText(80),
    warrantyStatus: z.enum(WARRANTY_STATUSES).default('unknown'),
    problemCategory: z.enum(PROBLEM_CATEGORIES, {
      errorMap: () => ({ message: 'Lütfen arıza türünü seçin.' }),
    }),
    problemDescription: requiredText('Arıza açıklaması', 15, 2000),
    address: serviceAddressSchema,
    preferredDate: appointmentDateSchema,
    preferredTimeSlot: timeSlotSchema.optional(),
    photos: z.array(requestPhotoInputSchema).max(10).default([]),
    customerNote: optionalText(1000),
    /**
     * Keşif ücretinin kabul edildiğinin onayı.
     *
     * Literal yerine boolean + kontrol: literal, girdi tipini de `true` yapar
     * ve işaretsiz onay kutusu temsil edilemez.
     */
    acceptedInspectionFee: z.boolean().refine((accepted) => accepted, {
      message: 'Devam etmek için keşif ücretini onaylamalısınız.',
    }),
  })
  .refine(
    (data) => data.deviceType !== 'other' || (data.customDeviceType?.trim().length ?? 0) >= 2,
    { message: 'Lütfen cihaz türünü yazın.', path: ['customDeviceType'] },
  );

export type CreateTechnicalServiceRequestInput = z.infer<
  typeof createTechnicalServiceRequestSchema
>;

// ---------------------------------------------------------------------------
// Görünüm
// ---------------------------------------------------------------------------

export const technicalServiceRequestSchema = serviceRequestBaseSchema.extend({
  kind: z.literal('technical_service'),
  deviceType: z.enum(DEVICE_TYPES),
  customDeviceType: z.string().nullable(),
  brand: z.string(),
  model: z.string().nullable(),
  warrantyStatus: z.enum(WARRANTY_STATUSES),
  problemCategory: z.enum(PROBLEM_CATEGORIES),
  problemDescription: z.string(),
  address: addressSchema,
  preferredDate: z.string(),
  preferredTimeSlot: timeSlotSchema.nullable(),
  /** Keşif ücreti (kuruş). Talep oluşturulduğu andaki tutar sabitlenir. */
  inspectionFee: z.number().int(),
  /** Teknisyenin yerinde yaptığı tespit. Yalnızca keşif sonrası dolar. */
  diagnosis: z.string().nullable(),
});

export type TechnicalServiceRequest = z.infer<typeof technicalServiceRequestSchema>;

/**
 * Teknisyen tespitinin alt sınırı.
 *
 * Dışa aktarılır çünkü yönetim panelindeki kaydet düğmesi de aynı eşiğe bakar:
 * iki sayı ayrıştığında düğme etkinleşir ama sunucu isteği reddeder.
 */
export const MIN_DIAGNOSIS_LENGTH = 10;

/** Teknisyenin keşif sonrası girdiği tespit. */
export const recordDiagnosisSchema = z.object({
  diagnosis: requiredText('Tespit', MIN_DIAGNOSIS_LENGTH, 2000),
});

export type RecordDiagnosisInput = z.infer<typeof recordDiagnosisSchema>;
