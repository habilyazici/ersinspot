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
 * Testlerde loglar susturulur: her istek için satır basmak test çıktısını
 * okunmaz hale getirir. Bir testte log içeriğini incelemek gerekirse
 * `LOG_LEVEL=debug` ile çalıştırılabilir.
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

/** Kısmi maskeleme uygulanacak alanlar: tanınabilir kalsın ama tam görünmesin. */
const PARTIAL_MASK_KEYS = ['email', 'phone'] as const;

function maskEmail(value: string): string {
  const atIndex = value.indexOf('@');
  if (atIndex <= 0) return '***';
  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***${domain}`;
}

function maskPhone(value: string): string {
  return value.length <= 4 ? '***' : `***${value.slice(-4)}`;
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
        result[key] = lowerKey.includes('email') ? maskEmail(entry) : maskPhone(entry);
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

  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context === undefined ? {} : { context: sanitize(context) }),
  };

  const output = isProduction
    ? JSON.stringify(entry)
    : `${entry.time.slice(11, 19)} ${level.toUpperCase().padEnd(5)} ${message}${
        context === undefined ? '' : ` ${JSON.stringify(sanitize(context))}`
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
