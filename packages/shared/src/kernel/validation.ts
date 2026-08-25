/**
 * Ortak doğrulama parçaları.
 *
 * Bu şemalar hem sunucuda (gelen isteği doğrulamak için) hem tarayıcıda
 * (formu doğrulamak için) kullanılır. Tek kaynak olduğu için, sunucunun kabul ettiği
 * ile formun izin verdiği hiçbir zaman ayrışamaz.
 *
 * Hata mesajları doğrudan kullanıcıya gösterilecek şekilde Türkçe yazılır.
 */

import { z } from 'zod';
import { IZMIR_DISTRICTS, SERVICED_DISTRICTS } from './locations.ts';
import { normalize as normalizePhone } from './phone.ts';

// ---------------------------------------------------------------------------
// Kimlikler
// ---------------------------------------------------------------------------

export const uuidSchema = z.string().uuid({ message: 'Geçersiz kayıt kimliği.' });

/**
 * İnsan tarafından okunabilen belge numarası: "SIP-2026-0001" gibi.
 * Ön ek, yıl ve sıra numarasından oluşur.
 */
export const referenceNumberSchema = z
  .string()
  .regex(/^[A-Z]{2,4}-\d{4}-\d{4,6}$/, { message: 'Geçersiz takip numarası.' });

// ---------------------------------------------------------------------------
// Metin
// ---------------------------------------------------------------------------

/**
 * Görünmez karakterler.
 *
 * C0/C1 kontrol karakterleri, sıfır genişlikli birleştiriciler ve yön değiştirme
 * işaretleri. Ekranda görünmedikleri için doğrulamayı atlatmak, arama sonuçlarını
 * bozmak veya metni ters çevirmek amacıyla kullanılabilirler.
 *
 * Kontrol karakterlerinin desende bulunması kasıtlıdır; kural bu blok için
 * bilinçli olarak kapatılıyor.
 */
/* eslint-disable no-control-regex */
const INVISIBLE_CHARACTERS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\u202A-\u202E\uFEFF]/g;
/* eslint-enable no-control-regex */

/**
 * Kullanıcıdan gelen tüm serbest metinlerde kullanılır: baştaki ve sondaki
 * boşlukları kırpar, görünmez karakterleri temizler.
 */
const cleanText = (value: string): string => value.trim().replace(INVISIBLE_CHARACTERS, '');

export const trimmedString = z.string().transform(cleanText);

export function requiredText(field: string, min = 1, max = 500) {
  return z
    .string({
      required_error: `${field} zorunludur.`,
      invalid_type_error: `${field} metin olmalıdır.`,
    })
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(min, { message: `${field} en az ${min} karakter olmalıdır.` })
        .max(max, { message: `${field} en fazla ${max} karakter olabilir.` }),
    );
}

export function optionalText(max = 500) {
  return z
    .string()
    .transform(cleanText)
    .pipe(z.string().max(max, { message: `En fazla ${max} karakter girebilirsiniz.` }))
    .optional()
    .or(z.literal('').transform(() => undefined));
}

// ---------------------------------------------------------------------------
// Kişisel bilgiler
// ---------------------------------------------------------------------------

export const emailSchema = z
  .string({ required_error: 'E-posta adresi zorunludur.' })
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(1, { message: 'E-posta adresi zorunludur.' })
      .email({ message: 'Geçerli bir e-posta adresi girin.' })
      .max(254, { message: 'E-posta adresi çok uzun.' }),
  );

export const fullNameSchema = z
  .string({ required_error: 'Ad soyad zorunludur.' })
  .transform((value) => cleanText(value).replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(3, { message: 'Ad soyad en az 3 karakter olmalıdır.' })
      .max(120, { message: 'Ad soyad en fazla 120 karakter olabilir.' })
      .regex(/^[\p{L}\s'.-]+$/u, { message: 'Ad soyad yalnızca harf içerebilir.' }),
  );

/**
 * Telefon numarasını kanonik E.164 biçimine çevirir. Şemadan çıkan değer daima
 * "+905XXXXXXXXX" biçimindedir; veritabanına bu biçimde yazılır.
 */
export const phoneSchema = z
  .string({ required_error: 'Telefon numarası zorunludur.' })
  .transform((value, ctx) => {
    const normalized = normalizePhone(value);
    if (normalized === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Geçerli bir cep telefonu numarası girin (05XX XXX XX XX).',
      });
      return z.NEVER;
    }
    return normalized;
  });

/**
 * Şifre kuralları.
 *
 * Uzunluk, karmaşıklık kurallarından daha etkili olduğu için asgari uzunluk
 * yüksek tutulur ve karakter türü zorunluluğu dayatılmaz. Bu, NIST SP 800-63B
 * tavsiyeleriyle uyumludur: kullanıcıyı "P@ssw0rd!" gibi tahmin edilebilir
 * kalıplara zorlamak yerine daha uzun parola seçmeye teşvik eder.
 */
export const passwordSchema = z
  .string({ required_error: 'Şifre zorunludur.' })
  .min(10, { message: 'Şifre en az 10 karakter olmalıdır.' })
  // bcrypt/argon2 girdisinin makul üst sınırı; hizmet reddi saldırısını da engeller
  .max(200, { message: 'Şifre en fazla 200 karakter olabilir.' })
  .refine((value) => value.trim().length > 0, { message: 'Şifre yalnızca boşluk olamaz.' });

// ---------------------------------------------------------------------------
// Adres
// ---------------------------------------------------------------------------

export const districtSchema = z.enum(IZMIR_DISTRICTS, {
  errorMap: () => ({ message: 'Lütfen listeden bir ilçe seçin.' }),
});

/** Nakliye ve teknik servis taleplerinde kullanılır: hizmet verilmeyen ilçeleri reddeder. */
export const servicedDistrictSchema = districtSchema.refine(
  (district) => SERVICED_DISTRICTS.includes(district),
  { message: 'Bu ilçede henüz hizmet vermiyoruz.' },
);

export const addressSchema = z.object({
  district: districtSchema,
  neighborhood: requiredText('Mahalle', 2, 100),
  street: requiredText('Sokak/Cadde', 2, 150),
  buildingNo: requiredText('Bina no', 1, 20),
  apartmentNo: optionalText(20),
  /** Kurye için ek tarif: "market karşısı, yeşil kapı" gibi. */
  directions: optionalText(300),
});

export type AddressInput = z.infer<typeof addressSchema>;

// ---------------------------------------------------------------------------
// Para
// ---------------------------------------------------------------------------

/**
 * API sınırında para değeri daima kuruş cinsinden tam sayı olarak taşınır.
 * Ondalıklı sayı gönderilmesi bilinçli olarak reddedilir; bu, birim karışıklığını
 * (lira mı kuruş mu?) sınırda yakalar.
 */
export const kurusSchema = z
  .number({ required_error: 'Tutar zorunludur.', invalid_type_error: 'Tutar sayı olmalıdır.' })
  .int({ message: 'Tutar kuruş cinsinden tam sayı olmalıdır.' })
  .min(0, { message: 'Tutar negatif olamaz.' })
  .max(Number.MAX_SAFE_INTEGER, { message: 'Tutar çok büyük.' });

/** Sıfırdan büyük olması gereken tutarlar için (ürün fiyatı, teklif tutarı). */
export const positiveKurusSchema = kurusSchema.refine((value) => value > 0, {
  message: 'Tutar sıfırdan büyük olmalıdır.',
});

// ---------------------------------------------------------------------------
// Tarih ve saat
// ---------------------------------------------------------------------------

/** "2026-03-15" biçiminde takvim günü. Saat dilimi taşımaz. */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tarih GG.AA.YYYY biçiminde olmalıdır.' })
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    },
    { message: 'Geçersiz tarih.' },
  );

/** Günün saati: "09:00" biçiminde, 24 saatlik. */
export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Saat SS:DD biçiminde olmalıdır.' });

/**
 * Randevu saat aralığı.
 *
 * Başlangıç ve bitiş ayrı alanlardır. Tek metin ("09:00-11:00") olarak
 * taşındığında aralıklar karşılaştırılamaz, sıralanamaz ve çakışma kontrolü
 * yapılamaz; veritabanında da iki ayrı `time` sütununda tutulur.
 */
export const timeSlotSchema = z
  .object({
    startTime: timeOfDaySchema,
    endTime: timeOfDaySchema,
  })
  .refine((slot) => slot.startTime < slot.endTime, {
    message: 'Bitiş saati başlangıçtan sonra olmalıdır.',
    path: ['endTime'],
  });

export type TimeSlot = z.infer<typeof timeSlotSchema>;

/** Saat aralığını kullanıcıya gösterilecek metne çevirir: "09:00 - 11:00". */
export function formatTimeSlot(slot: TimeSlot): string {
  return `${slot.startTime} - ${slot.endTime}`;
}

/**
 * Randevu tarihini doğrular: geçmiş bir gün seçilemez ve en fazla 60 gün
 * ileriye randevu alınabilir.
 */
export const appointmentDateSchema = dateOnlySchema.superRefine((value, ctx) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const selected = new Date(`${value}T00:00:00Z`);
  const maxDate = new Date(today);
  maxDate.setUTCDate(maxDate.getUTCDate() + 60);

  if (selected < today) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Geçmiş bir tarih seçilemez.' });
  }
  if (selected > maxDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'En fazla 60 gün sonrasına randevu alabilirsiniz.',
    });
  }
});

// ---------------------------------------------------------------------------
// Sayfalama ve sıralama
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

/**
 * Sayfalama parametreleri. Sorgu dizesinden geldiği için değerler metin olabilir;
 * `coerce` ile sayıya çevrilir. Üst sınır, tek istekle tüm tablonun çekilmesini engeller.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/** Sayfalı yanıtların ortak zarfı. Tüm liste uçları bu biçimi döndürür. */
export interface Paginated<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export function paginate<T>(
  items: readonly T[],
  totalItems: number,
  { page, pageSize }: PaginationInput,
): Paginated<T> {
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

// ---------------------------------------------------------------------------
// Dosya yükleme
// ---------------------------------------------------------------------------

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_IMAGES_PER_REQUEST = 10;

/** Ürün ilanı için istenen asgari fotoğraf sayısı. */
export const MIN_PRODUCT_IMAGES = 3;

export function isAllowedImageType(mimeType: string): mimeType is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}
