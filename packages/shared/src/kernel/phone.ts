/**
 * Türkiye cep telefonu numaralarının normalleştirilmesi ve biçimlendirilmesi.
 *
 * Eski kod tabanında numaralar kullanıcının yazdığı gibi saklanıyordu; aynı kişi
 * "0507 194 05 50", "+905071940550" ve "5071940550" olarak üç ayrı müşteri kaydı
 * oluşturabiliyordu. Burada tek bir kanonik biçim tanımlanıyor: E.164 (+905071940550).
 *
 * Kural: veritabanına daima kanonik biçim yazılır, ekrana daima `format` ile basılır.
 */

/** Kanonik saklama biçimi: E.164, örn. "+905071940550". */
export type PhoneNumber = string;

/** Türkiye cep telefonu operatör kodları (5XX). Sabit hatlar kabul edilmez. */
const MOBILE_PREFIX = '5';
const NATIONAL_SIGNIFICANT_LENGTH = 10; // 5071940550
const COUNTRY_CODE = '90';

/**
 * Kullanıcı girdisini kanonik biçime çevirir.
 *
 * Kabul edilen biçimler: "0507 194 05 50", "507 194 05 50", "+90 507 194 05 50",
 * "0090 507 194 05 50" ve bunların boşluksuz/tireli/parantezli varyasyonları.
 *
 * @returns Geçerli bir Türkiye cep numarası okunamazsa `null`.
 */
export function normalize(input: string): PhoneNumber | null {
  const digits = input.replace(/\D/g, '');
  if (digits === '') return null;

  let national: string;

  if (digits.startsWith('00' + COUNTRY_CODE)) {
    national = digits.slice(4);
  } else if (digits.startsWith(COUNTRY_CODE) && digits.length === NATIONAL_SIGNIFICANT_LENGTH + 2) {
    national = digits.slice(2);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else {
    national = digits;
  }

  if (national.length !== NATIONAL_SIGNIFICANT_LENGTH) return null;
  if (!national.startsWith(MOBILE_PREFIX)) return null;

  return `+${COUNTRY_CODE}${national}`;
}

/**
 * Kanonik numarayı okunabilir biçime çevirir: "0507 194 05 50".
 * Geçersiz bir değer verilirse olduğu gibi döndürür — ekranda hiçbir zaman boş görünmez.
 */
export function format(phone: PhoneNumber): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== NATIONAL_SIGNIFICANT_LENGTH + 2) return phone;

  const national = digits.slice(2);
  const area = national.slice(0, 3);
  const first = national.slice(3, 6);
  const second = national.slice(6, 8);
  const third = national.slice(8, 10);

  return `0${area} ${first} ${second} ${third}`;
}

/**
 * `tel:` bağlantısı için kullanılacak biçim. Kanonik biçimle aynıdır ama
 * niyeti açık olsun diye ayrı isimlendirilmiştir.
 */
export function toTelHref(phone: PhoneNumber): string {
  return `tel:${phone}`;
}

/**
 * Numaranın son dört hanesi dışındaki kısmını gizler: "0507 *** ** 50".
 * Destek ekranlarında ve loglarda kişisel veriyi açığa çıkarmamak için.
 */
export function mask(phone: PhoneNumber): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== NATIONAL_SIGNIFICANT_LENGTH + 2) return '***';

  const national = digits.slice(2);
  return `0${national.slice(0, 3)} *** ** ${national.slice(8, 10)}`;
}
