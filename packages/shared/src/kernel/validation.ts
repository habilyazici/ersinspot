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

/**
 * İsteğe bağlı serbest metin.
 *
 * Temizlikten sonra boş kalan değer `undefined` olur — boş dizge DEĞİL. Form
 * dokunulmamış bir alanı `''` olarak gönderir; bunu olduğu gibi kaydetmek
 * "not yok" ile "not boş bırakıldı" ayrımını veritabanında kaybettirir ve
 * çağıranın her yerde `?? null` yanında bir de `=== ''` kontrolü yazmasını
 * gerektirir.
 *
 * Boşaltma bir DÖNÜŞÜMDÜR, birleşim kolu değil. Önceki hâli
 * `.optional().or(z.literal('').transform(() => undefined))` biçimindeydi ve
 * ikinci kola hiç ulaşılmıyordu: ilk kol `''` değerini zaten geçerli sayıp
 * döndürüyor, birleşim ilk başarılı kolda duruyordu. Sonuç, `undefined`
 * beklenen her yerde sessizce boş dizgeydi.
 */
export function optionalText(max = 500) {
  return z
    .string()
    .transform(cleanText)
    .pipe(z.string().max(max, { message: `En fazla ${max} karakter girebilirsiniz.` }))
    .transform((value) => (value === '' ? undefined : value))
    .optional();
}

/**
 * Sorgu dizesinden gelen mantıksal değer.
 *
 * `z.coerce.boolean()` KULLANILAMAZ: `Boolean('false')` değeri `true`'dur, yani
 * `?okundu=false` süzgeci "okunmuşları getir" anlamına gelirdi. Sorgu
 * parametreleri daima metindir; dönüşüm açıkça yazılır.
 */
export const booleanQuerySchema = z
  .enum(['true', 'false', '1', '0'], {
    errorMap: () => ({ message: 'Değer true veya false olmalıdır.' }),
  })
  .transform((value) => value === 'true' || value === '1');

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

/**
 * Teslimat ve randevu için sunulan saat aralıkları.
 *
 * Mağazanın çalışma düzeninden gelen bir İŞ SABİTİDİR, arayüz ayrıntısı
 * değil: sipariş teslimatı, mağazadan alım ve hizmet randevusu aynı aralıkları
 * kullanır. Üç ekranda ayrı ayrı yazıldığında bir aralık değiştiğinde
 * diğerlerinin unutulması kaçınılmazdı — nitekim üç kopya oluşmuştu.
 *
 * Aralıklar iki saatliktir: müşteriye dar bir pencere vermek ekibin trafik ve
 * iş süresi değişkenliğiyle baş edememesine yol açar.
 */
export const APPOINTMENT_TIME_SLOTS = [
  { startTime: '09:00', endTime: '11:00' },
  { startTime: '11:00', endTime: '13:00' },
  { startTime: '13:00', endTime: '15:00' },
  { startTime: '15:00', endTime: '17:00' },
  { startTime: '17:00', endTime: '19:00' },
] as const satisfies readonly TimeSlot[];

/**
 * Randevu ve teslimat için asgari hazırlık süreleri (gün).
 *
 * Mağazanın işleyişinden gelir: ürün hazırlanmalı, ekip planlanmalı, nakliyede
 * araç ve personel ayrılmalıdır. Süreler farklıdır çünkü işler farklıdır.
 *
 * SUNUCU BU SÜRELERİ ZORUNLU KILMAZ; `appointmentDateSchema` yalnızca "geçmiş
 * olamaz" ve "en fazla 60 gün sonra" kurallarını uygular. Buradakiler
 * arayüzün önerdiği en erken gündür: aynı gün için ısrar eden bir müşteriyle
 * personel telefonda anlaşabilmelidir. Yine de tek yerde tanımlıdır — beş
 * ekranda ayrı ayrı yazıldığında biri değişince diğerleri unutulurdu.
 */
export const LEAD_TIME_DAYS = {
  /** Sipariş teslimatı ve mağazadan alım. */
  delivery: 2,
  /** Teknik servis keşfi. */
  technicalService: 2,
  /** Nakliye: araç ve ekip planlaması daha uzun sürer. */
  moving: 3,
  /** Personelin verdiği randevu. */
  appointment: 2,
} as const;

/** Tekliflerin varsayılan geçerlilik süresi (gün). */
export const QUOTE_VALIDITY_DAYS = 7;

/**
 * İşletmenin saat dilimi.
 *
 * "Bugün" tek bir yerde tanımlanmalıdır. UTC kullanıldığında Türkiye'de gece
 * yarısı ile 03:00 arası bir önceki güne düşülür: yönetim panelindeki
 * "bugünün randevuları" dün olanları gösterir, randevu formunun en erken günü
 * bir gün geri kayar. Mağaza tek bir şehirde çalıştığı için doğru referans
 * sunucunun ya da tarayıcının yerel saati değil, İstanbul'dur.
 */
const BUSINESS_TIME_ZONE = 'Europe/Istanbul';

/**
 * `Intl` üzerinden `YYYY-AA-GG` üreten biçimlendirici.
 *
 * `sv-SE` yerel ayarı ISO ile aynı sırayı (yıl-ay-gün) verdiği için elle parça
 * birleştirmeye gerek kalmaz.
 */
const businessDateFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** İşletmenin saat dilimine göre bugünün tarihi: "2026-03-15". */
export function today(): string {
  return businessDateFormatter.format(new Date());
}

/**
 * Bir takvim gününe N gün ekler: `addCalendarDays('2026-03-15', 2)` → "2026-03-17".
 *
 * Sayım takvim günü üzerinden yapılır; yaz saati geçişleri gün sınırını
 * kaydırmasın diye öğle vaktinden başlanır.
 */
function addCalendarDays(isoDate: string, days: number): string {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

/**
 * Bugünden N gün sonrasını `YYYY-AA-GG` biçiminde döndürür.
 *
 * Tarih alanlarının `min` değeri ve varsayılanı bununla üretilir.
 */
export function dateAfterDays(days: number): string {
  return addCalendarDays(today(), days);
}

/**
 * Verilen andaki işletme saat dilimi farkı, dakika cinsinden.
 *
 * `longOffset` biçimi "GMT+03:00" verir. Türkiye 2016'dan beri sabit UTC+3
 * kullanıyor, ama farkı sabit yazmak yerine ortamdan okumak kuralın ileride
 * değişmesi hâlinde kodun sessizce yanlışlanmasını engeller.
 */
const businessOffsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  timeZoneName: 'longOffset',
});

function businessOffsetMinutes(instant: Date): number {
  const name = businessOffsetFormatter
    .formatToParts(instant)
    .find((part) => part.type === 'timeZoneName')?.value;

  const match = name === undefined ? null : /^GMT([+-])(\d{2}):(\d{2})$/.exec(name);

  // Farkın sıfır olduğu dilimlerde biçim yalnızca "GMT" olur; eşleşme yoksa 0.
  if (match === null) return 0;

  const [, sign, hours = '0', minutes = '0'] = match;
  const total = Number(hours) * 60 + Number(minutes);

  return sign === '-' ? -total : total;
}

/**
 * Bir takvim gününün İŞLETME SAAT DİLİMİNDE başladığı an.
 *
 * Yönetim panelindeki tarih süzgeçleri bunu kullanır. Sınırlar UTC gece
 * yarısından alındığında "bugün" süzgeci Türkiye'de 03:00'te başlıyor ve
 * ertesi günün ilk üç saatini içeriyordu: gece verilen siparişler o günün
 * listesinde görünmüyor, bir sonrakinde iki kez sayılıyordu.
 */
export function businessDayStart(isoDate: string): Date {
  const utcMidnight = Date.parse(`${isoDate}T00:00:00Z`);
  return new Date(utcMidnight - businessOffsetMinutes(new Date(utcMidnight)) * 60_000);
}

/**
 * Bir takvim gününün BİTTİĞİ an — yani ertesi günün başlangıcı.
 *
 * Aralık yarı açıktır: `[başlangıç, bitiş)`. Üst sınırı "23:59:59" olarak
 * yazmak, o saniyenin kesirli kısmına düşen kayıtları dışarıda bırakırdı.
 */
export function businessDayEnd(isoDate: string): Date {
  return businessDayStart(addCalendarDays(isoDate, 1));
}

/** Saat aralığını kullanıcıya gösterilecek metne çevirir: "09:00 - 11:00". */
export function formatTimeSlot(slot: TimeSlot): string {
  return `${slot.startTime} - ${slot.endTime}`;
}

/** Randevu en fazla bu kadar gün ileriye alınabilir. */
export const MAX_APPOINTMENT_LEAD_DAYS = 60;

/**
 * Randevu tarihini doğrular: geçmiş bir gün seçilemez ve en fazla
 * `MAX_APPOINTMENT_LEAD_DAYS` gün ileriye randevu alınabilir.
 */
export const appointmentDateSchema = dateOnlySchema.superRefine((value, ctx) => {
  /*
    Karşılaştırma metin üzerinden yapılır.

    `YYYY-AA-GG` biçimi sözlük sırasıyla takvim sırasına eşittir; Date
    nesnesine çevirmeye ve saat dilimi belirsizliğine gerek kalmaz. Sınırlar
    işletmenin saat dilimine göre üretilir.
  */
  if (value < today()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Geçmiş bir tarih seçilemez.' });
  }
  if (value > dateAfterDays(MAX_APPOINTMENT_LEAD_DAYS)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `En fazla ${MAX_APPOINTMENT_LEAD_DAYS} gün sonrasına randevu alabilirsiniz.`,
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
