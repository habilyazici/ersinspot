/**
 * Sunucu tarafı hata türleri.
 *
 * Tüm beklenen hatalar `AppError` olarak fırlatılır; merkezi hata işleyici bunları
 * paylaşılan sözleşmedeki (`@ersinspot/shared`) biçime çevirir. Beklenmeyen hatalar
 * ise loglanır ve kullanıcıya genel bir mesajla döner — yığın izi, SQL metni veya
 * dosya yolu asla dışarı sızmaz.
 */

import { ERROR_MESSAGES, ERROR_STATUS } from '@ersinspot/shared';
import type { ErrorCode, FieldError } from '@ersinspot/shared';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields: readonly FieldError[];
  readonly retryAfterSeconds: number | undefined;

  /**
   * Yalnızca loglara yazılan ek bağlam. Kullanıcıya gönderilen yanıtta yer almaz;
   * hassas bilgi içerebilir.
   */
  readonly context: Record<string, unknown> | undefined;

  constructor(
    code: ErrorCode,
    options?: {
      message?: string;
      fields?: readonly FieldError[];
      retryAfterSeconds?: number;
      context?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super(options?.message ?? ERROR_MESSAGES[code], { cause: options?.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.fields = options?.fields ?? [];
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.context = options?.context;
  }
}

// ---------------------------------------------------------------------------
// Kısayollar
// ---------------------------------------------------------------------------
// Sık kullanılan hataları tek satırda fırlatmak için. `throw notFound('Ürün')`
// biçimi, handler'ların okunabilirliğini korur.

export function unauthenticated(message?: string): AppError {
  return new AppError('unauthenticated', message === undefined ? undefined : { message });
}

export function sessionExpired(): AppError {
  return new AppError('session_expired');
}

/**
 * Kimlik bilgileri hatalı.
 *
 * Mesaj bilinçli olarak geneldir ve "kullanıcı bulunamadı" ile "şifre yanlış"
 * ayrımı yapılmaz — bu ayrım geçerli e-posta adreslerinin keşfedilmesine izin verir.
 */
export function invalidCredentials(): AppError {
  return new AppError('invalid_credentials');
}

export function forbidden(message?: string): AppError {
  return new AppError('forbidden', message === undefined ? undefined : { message });
}

export function notFound(resource?: string): AppError {
  return new AppError('not_found', {
    message: resource === undefined ? undefined : `${resource} bulunamadı.`,
  });
}

export function validationFailed(fields: readonly FieldError[]): AppError {
  return new AppError('validation_failed', { fields });
}

export function businessRule(message: string, fields?: readonly FieldError[]): AppError {
  return new AppError('business_rule_violated', { message, fields });
}

/**
 * Kaydın mevcut durumunda bu işlem yapılamaz.
 *
 * Durum makinesindeki geçersiz geçişler için: teslim edilmiş bir siparişi iptal
 * etmeye çalışmak gibi.
 */
export function invalidTransition(from: string, to: string, entityLabel: string): AppError {
  return new AppError('invalid_state_transition', {
    message: `${entityLabel} "${from}" durumundayken "${to}" durumuna geçirilemez.`,
    context: { from, to },
  });
}

export function alreadyExists(message?: string): AppError {
  return new AppError('already_exists', message === undefined ? undefined : { message });
}

export function conflict(message?: string): AppError {
  return new AppError('resource_conflict', message === undefined ? undefined : { message });
}

export function productUnavailable(productTitle?: string): AppError {
  return new AppError('product_unavailable', {
    message:
      productTitle === undefined
        ? undefined
        : `"${productTitle}" artık satışta değil. Lütfen sepetinizden çıkarın.`,
  });
}

export function rateLimited(retryAfterSeconds: number): AppError {
  return new AppError('rate_limited', { retryAfterSeconds });
}

export function accountLocked(retryAfterSeconds: number): AppError {
  return new AppError('account_locked', { retryAfterSeconds });
}

export function fileTooLarge(maxBytes: number): AppError {
  const maxMegabytes = Math.floor(maxBytes / (1024 * 1024));
  return new AppError('file_too_large', {
    message: `Dosya boyutu ${maxMegabytes} MB sınırını aşıyor.`,
  });
}

export function unsupportedFileType(allowed: readonly string[]): AppError {
  return new AppError('unsupported_file_type', {
    message: `Yalnızca şu dosya türleri yüklenebilir: ${allowed.join(', ')}.`,
  });
}

export function internalError(cause: unknown, context?: Record<string, unknown>): AppError {
  return new AppError('internal_error', { cause, context });
}

/** Değerin `AppError` olup olmadığını, tip daraltmasıyla söyler. */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
