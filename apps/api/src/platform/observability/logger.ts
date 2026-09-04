/**
 * Yapılandırılmış loglama.
 *
 * Eski kod tabanında 1.473 adet `console.log` vardı ve bunlar müşteri e-postası,
 * kullanıcı kimliği ve oturum jetonunun ilk 20 karakterini üretim loglarına
 * yazıyordu. Burada iki kural uygulanır:
 *
 * 1. Log kayıtları yapılandırılmıştır (JSON): üretimde makineyle işlenebilir,
 *    geliştirmede okunabilir biçimde basılır.
 *
 * 2. Bilinen hassas alan adları otomatik maskelenir. Yine de asıl sorumluluk
 *    çağıran taraftadır: kişisel veri loglanmaz.
 */

import { phone } from '@ersinspot/shared';
import { isProduction, isTest } from '../config/env.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_RANK: Readonly<Record<LogLevel, number>> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/**
 * Alt sınır ortamdan türetilir; ayrıca yapılandırılmaz.
 *
 * Testlerde loglar susturulur: her istek için satır basmak test çıktısını
 * okunmaz hale getirir. Üretimde `debug` satırları elenir, geliştirmede hepsi
 * görünür.
 */
const MIN_LEVEL: LogLevel = isTest ? 'silent' : isProduction ? 'info' : 'debug';

/**
 * Log kaydında değeri maskelenecek alan adları.
 *
 * Eşleştirme küçük harfe çevrilerek ve içerme (substring) kontrolüyle yapılır;
 * `passwordHash`, `sessionToken`, `resetToken` gibi türevler de yakalanır.
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'hash',
  'apikey',
  'creditcard',
] as const;

/**
 * Kısmi maskeleme uygulanacak alanlar: tanınabilir kalsın ama tam görünmesin.
 *
 * Telefon maskesi PAYLAŞILAN ÇEKİRDEKTEN gelir (`phone.mask`). Burada ikinci
 * bir uygulama duruyordu ve ikisi aynı şeyi farklı yapıyordu: buradaki son
 * dört karakteri açıkta bırakıyordu — numara olsun olmasın, her değer için.
 * Çekirdektekiyse yalnızca geçerli bir numarayı maskeler, tanımadığı değeri
 * tamamen gizler.
 */
const PARTIAL_MASK_KEYS = ['email', 'phone'] as const;

function maskEmail(value: string): string {
  const atIndex = value.indexOf('@');
  if (atIndex <= 0) return '***';
  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***${domain}`;
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[derinlik sınırı]';
  if (value === null || value === undefined) return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      // Yığın izi yalnızca geliştirmede; üretimde log toplayıcıya ayrıca gider.
      stack: isProduction ? undefined : value.stack,
    };
  }

  /*
    Tarih, `Object.entries` ile boş nesneye dönüşürdü: `{ deliveryDate: {} }`.
    ISO metne çevrilir; log satırı okunabilir ve makineyle ayrıştırılabilir kalır.
  */
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();

      if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
        result[key] = '[gizlendi]';
        continue;
      }

      if (typeof entry === 'string' && PARTIAL_MASK_KEYS.some((k) => lowerKey.includes(k))) {
        result[key] = lowerKey.includes('email') ? maskEmail(entry) : phone.mask(entry);
        continue;
      }

      result[key] = sanitize(entry, depth + 1);
    }

    return result;
  }

  return value;
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return;

  const time = new Date().toISOString();

  /*
    Temizlik BİR KEZ yapılır.

    Önceki hâlinde hem yapılandırılmış kayıt hem geliştirme satırı kendi
    `sanitize` çağrısını yapıyordu: geliştirmede aynı nesne her log satırı
    için iki kez, özyinelemeli olarak dolaşılıyordu. Sonuç ikisinde de aynı
    olduğu için fark edilmiyordu — ikinci çağrının tek etkisi maliyetti.
  */
  const safeContext = context === undefined ? undefined : sanitize(context);

  const output = isProduction
    ? JSON.stringify({
        level,
        time,
        message,
        ...(safeContext === undefined ? {} : { context: safeContext }),
      })
    : `${time.slice(11, 19)} ${level.toUpperCase().padEnd(5)} ${message}${
        safeContext === undefined ? '' : ` ${JSON.stringify(safeContext)}`
      }`;

  // Logger, konsola yazma iznine sahip tek modüldür.
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};

/**
 * İstek izleme kimliği üretir.
 *
 * Hata yanıtında kullanıcıya bu kod gösterilir; destek talebinde paylaşıldığında
 * ilgili log kaydı bulunabilir. Kendisi hiçbir bilgi taşımaz.
 */
export function generateTraceId(): string {
  return crypto.randomUUID().slice(0, 8);
}
