/**
 * Paylaşılan çekirdek.
 *
 * Her modülün kullanabileceği yapı taşları. Hiçbir modüle bağımlı değildir ve
 * bağımlı olmamalıdır — bağımlılık yönü daima modüllerden çekirdeğe doğrudur.
 */

export * from './status.ts';
export * from './locations.ts';
export * from './pricing.ts';
export * from './validation.ts';
export * from './errors.ts';
export * from './slug.ts';

// Para ve telefon modülleri, isimleri çakıştığı için (format, normalize) ad alanı
// olarak dışa aktarılır: `money.format(...)`, `phone.format(...)`.
export * as money from './money.ts';
export * as phone from './phone.ts';
export type { Kurus } from './money.ts';
export type { PhoneNumber } from './phone.ts';
