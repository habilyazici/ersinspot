/**
 * Para birimi: kuruş cinsinden tam sayı.
 *
 * Eski kod tabanında fiyatlar ondalıklı sayı (`parseFloat`) olarak tutuluyordu.
 * İkili kayan noktalı sayılar ondalık kesirleri tam gösteremez; 0.1 + 0.2 işlemi
 * 0.30000000000000004 verir. Para hesabında bu, birikimli yuvarlama hatası demektir.
 *
 * Çözüm: para her yerde kuruş (₺'nin 1/100'ü) cinsinden tam sayı olarak taşınır.
 * Veritabanında `bigint`, JSON'da `number`, arayüzde biçimlendirilmiş metin olur.
 * Ondalıklı sayıya çevirme yalnızca ekrana yazdırma anında yapılır.
 */

declare const kurusBrand: unique symbol;

/**
 * Markalı tam sayı tipi. Düz `number` bu tipe atanamaz; para değeri üretmek için
 * bu dosyadaki yapıcılardan biri kullanılmak zorundadır. Böylece "bu sayı lira mıydı
 * kuruş muydu?" belirsizliği derleme zamanında ortadan kalkar.
 */
export type Kurus = number & { readonly [kurusBrand]: true };

/** JavaScript'in güvenli tam sayı sınırı içinde kalan üst limit: yaklaşık 90 trilyon ₺. */
const MAX_KURUS = Number.MAX_SAFE_INTEGER;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

function assertValidKurus(value: number): asserts value is Kurus {
  if (!Number.isFinite(value)) {
    throw new MoneyError('Para değeri sonlu bir sayı olmalıdır.');
  }
  if (!Number.isInteger(value)) {
    throw new MoneyError('Para değeri kuruş cinsinden tam sayı olmalıdır.');
  }
  if (Math.abs(value) > MAX_KURUS) {
    throw new MoneyError('Para değeri güvenli tam sayı aralığının dışında.');
  }
}

// ---------------------------------------------------------------------------
// Yapıcılar
// ---------------------------------------------------------------------------

export const ZERO = 0 as Kurus;

/** Kuruş cinsinden bir tam sayıdan para değeri üretir. Veritabanından okurken kullanılır. */
export function fromKurus(value: number): Kurus {
  assertValidKurus(value);
  return value;
}

/**
 * Lira cinsinden bir sayıdan para değeri üretir ve en yakın kuruşa yuvarlar.
 * Yalnızca sabit değerler ve testler için; kullanıcı girdisi için `parseLira` kullanın.
 */
export function fromLira(lira: number): Kurus {
  if (!Number.isFinite(lira)) {
    throw new MoneyError('Lira değeri sonlu bir sayı olmalıdır.');
  }
  return fromKurus(Math.round(lira * 100));
}

/**
 * Kullanıcının yazdığı metni para değerine çevirir.
 *
 * Türkçe biçimi (binlik ayıracı nokta, ondalık ayıracı virgül) ve İngilizce biçimi
 * birlikte kabul eder; "1.234,56", "1234,56", "1234.56" ve "1234" hepsi geçerlidir.
 * Belirsiz durumlarda son ayıracı ondalık kabul eder.
 *
 * @returns Geçerli bir sayı okunamazsa `null`.
 */
export function parseLira(input: string): Kurus | null {
  const trimmed = input.trim().replace(/\s|₺|TL/gi, '');
  if (trimmed === '') return null;

  const negative = trimmed.startsWith('-');
  const digitsAndSeparators = negative ? trimmed.slice(1) : trimmed;

  if (!/^[\d.,]+$/.test(digitsAndSeparators)) return null;

  const lastComma = digitsAndSeparators.lastIndexOf(',');
  const lastDot = digitsAndSeparators.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);

  let wholePart: string;
  let fractionPart: string;

  // Son ayıraçtan sonra 1-2 basamak varsa bu bir ondalık ayıracıdır;
  // 3 basamak varsa binlik ayıracıdır ("1.234" gibi).
  const digitsAfterSeparator =
    decimalIndex === -1 ? 0 : digitsAndSeparators.length - decimalIndex - 1;

  if (decimalIndex !== -1 && digitsAfterSeparator > 0 && digitsAfterSeparator <= 2) {
    wholePart = digitsAndSeparators.slice(0, decimalIndex);
    fractionPart = digitsAndSeparators.slice(decimalIndex + 1);
  } else {
    wholePart = digitsAndSeparators;
    fractionPart = '';
  }

  const wholeDigits = wholePart.replace(/[.,]/g, '');
  if (wholeDigits === '' && fractionPart === '') return null;
  if (/[.,]/.test(fractionPart)) return null;

  const paddedFraction = fractionPart.padEnd(2, '0').slice(0, 2);
  const combined = `${wholeDigits || '0'}${paddedFraction}`;

  const value = Number(combined);
  if (!Number.isSafeInteger(value)) return null;

  return (negative ? -value : value) as Kurus;
}

// ---------------------------------------------------------------------------
// Aritmetik
// ---------------------------------------------------------------------------

export function add(a: Kurus, b: Kurus): Kurus {
  return fromKurus(a + b);
}

/** Para değerini tam sayı adetle çarpar. Kesirli çarpan kabul edilmez. */
export function multiply(amount: Kurus, quantity: number): Kurus {
  if (!Number.isInteger(quantity)) {
    throw new MoneyError('Adet tam sayı olmalıdır.');
  }
  return fromKurus(amount * quantity);
}

export function sum(amounts: readonly Kurus[]): Kurus {
  return amounts.reduce<Kurus>((total, amount) => add(total, amount), ZERO);
}

// ---------------------------------------------------------------------------
// Biçimlendirme
// ---------------------------------------------------------------------------

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeCurrencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Para değerini kullanıcıya gösterilecek metne çevirir: "1.234,56 ₺".
 *
 * @param options.hideDecimalsWhenWhole Tam liralık tutarlarda kuruş kısmını gizler.
 *   Fiyat etiketlerinde daha temiz görünür ("2.500 ₺" gibi).
 */
export function format(amount: Kurus, options?: { hideDecimalsWhenWhole?: boolean }): string {
  const lira = amount / 100;
  if (options?.hideDecimalsWhenWhole === true && amount % 100 === 0) {
    return wholeCurrencyFormatter.format(lira);
  }
  return currencyFormatter.format(lira);
}

/** Para değerini form alanına yazılabilecek düz metne çevirir: "1234,56". Simge içermez. */
export function toInputValue(amount: Kurus): string {
  const negative = amount < 0;
  const absolute = Math.abs(amount);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${whole},${fraction}`;
}
