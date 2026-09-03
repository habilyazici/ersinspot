/**
 * API hata sözleşmesi.
 *
 * Sunucu ve tarayıcı bu tipleri paylaşır. Böylece arayüz, hata mesajını sunucudan
 * gelen serbest metne bakarak değil, makine tarafından okunabilir bir koda bakarak
 * ele alır. Eski kod tabanında her sayfa `error.message` metnini kendi yorumluyordu;
 * mesaj değiştiğinde arayüz sessizce bozuluyordu.
 *
 * Güvenlik notu: `message` alanı kullanıcıya gösterilmek üzere yazılır ve asla
 * sistem içi ayrıntı (SQL hatası, dosya yolu, yığın izi) içermez.
 */

export const ERROR_CODES = [
  // 400 — istek hatalı
  'validation_failed',
  'invalid_state_transition',
  'business_rule_violated',

  // 401 — kimlik doğrulanmamış
  'unauthenticated',
  'invalid_credentials',

  // 403 — yetki yok
  'forbidden',
  'email_not_verified',
  'account_locked',

  // 404 — bulunamadı
  'not_found',

  // 409 — çakışma
  'already_exists',
  'resource_conflict',
  'product_unavailable',

  // 413 / 415 — yükleme
  'file_too_large',
  'unsupported_file_type',

  // 429 — hız sınırı
  'rate_limited',

  // 500 — sunucu
  'internal_error',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Her hata koduna karşılık gelen HTTP durum kodu. Tek kaynak. */
export const ERROR_STATUS: Readonly<Record<ErrorCode, number>> = {
  validation_failed: 400,
  invalid_state_transition: 400,
  business_rule_violated: 400,

  unauthenticated: 401,
  invalid_credentials: 401,

  forbidden: 403,
  email_not_verified: 403,
  account_locked: 403,

  not_found: 404,

  already_exists: 409,
  resource_conflict: 409,
  product_unavailable: 409,

  file_too_large: 413,
  unsupported_file_type: 415,

  rate_limited: 429,

  internal_error: 500,
};

/**
 * Kullanıcıya gösterilecek varsayılan mesajlar.
 *
 * Kimlik doğrulama hatalarında mesajlar bilinçli olarak geneldir: "böyle bir kullanıcı yok"
 * ile "şifre yanlış" ayrımı yapılmaz, çünkü bu ayrım saldırgana geçerli e-posta
 * adreslerini keşfetme imkânı verir (kullanıcı numaralandırma).
 */
export const ERROR_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  validation_failed: 'Girdiğiniz bilgilerde eksik veya hatalı alanlar var.',
  invalid_state_transition: 'Bu işlem, kaydın mevcut durumunda yapılamaz.',
  business_rule_violated: 'Bu işlem iş kurallarına uymuyor.',

  unauthenticated: 'Bu işlem için giriş yapmanız gerekiyor.',
  invalid_credentials: 'E-posta veya şifre hatalı.',

  forbidden: 'Bu işlem için yetkiniz yok.',
  email_not_verified: 'Devam etmek için e-posta adresinizi doğrulayın.',
  account_locked: 'Çok fazla başarısız deneme yapıldı. Bir süre sonra tekrar deneyin.',

  not_found: 'Aradığınız kayıt bulunamadı.',

  already_exists: 'Bu kayıt zaten mevcut.',
  resource_conflict: 'Kayıt başkası tarafından değiştirilmiş. Sayfayı yenileyip tekrar deneyin.',
  product_unavailable: 'Bu ürün artık satışta değil.',

  file_too_large: 'Dosya boyutu izin verilen sınırı aşıyor.',
  unsupported_file_type: 'Bu dosya türü desteklenmiyor.',

  rate_limited: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.',

  internal_error: 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
};

/** Belirli bir alana bağlı doğrulama hatası. Form alanlarını işaretlemek için. */
export interface FieldError {
  /** Nokta ile ayrılmış alan yolu, örn. "customer.phone" veya "items.0.quantity". */
  readonly path: string;
  readonly message: string;
}

/** Sunucunun hata durumunda döndürdüğü gövde. Tüm uçlar bu biçimi kullanır. */
export interface ApiErrorBody {
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
    /** Yalnızca `validation_failed` durumunda dolar. */
    readonly fields?: readonly FieldError[];
    /** Yalnızca `rate_limited` durumunda dolar: kaç saniye sonra tekrar denenebilir. */
    readonly retryAfterSeconds?: number;
    /**
     * Sunucu loglarıyla eşleştirmek için üretilen kimlik. Kullanıcı destek talebinde
     * bu kodu paylaşabilir; kendisi hiçbir hassas bilgi içermez.
     */
    readonly traceId?: string;
  };
}

/** Gövdenin API hata biçiminde olup olmadığını, tip daraltmasıyla kontrol eder. */
export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { error?: unknown };
  if (typeof candidate.error !== 'object' || candidate.error === null) return false;

  const error = candidate.error as { code?: unknown; message?: unknown };
  return (
    typeof error.code === 'string' &&
    (ERROR_CODES as readonly string[]).includes(error.code) &&
    typeof error.message === 'string'
  );
}

/**
 * Tarayıcı tarafında fırlatılan hata sınıfı. API istemcisi başarısız yanıtları
 * bu tipe çevirir; arayüz `code` alanına bakarak karar verir.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields: readonly FieldError[];
  readonly retryAfterSeconds: number | undefined;
  readonly traceId: string | undefined;

  constructor(body: ApiErrorBody, status: number) {
    super(body.error.message);
    this.name = 'ApiError';
    this.code = body.error.code;
    this.status = status;
    this.fields = body.error.fields ?? [];
    this.retryAfterSeconds = body.error.retryAfterSeconds;
    this.traceId = body.error.traceId;
  }

  /** Girişe yönlendirme gerektiren hata. */
  get requiresLogin(): boolean {
    return this.code === 'unauthenticated';
  }

  /** Kullanıcı aynı isteği tekrar deneyerek başarılı olabilir mi? */
  get isRetryable(): boolean {
    return this.code === 'rate_limited' || this.code === 'internal_error';
  }

  /** Belirli bir form alanına ait hata mesajını döndürür. */
  fieldError(path: string): string | undefined {
    return this.fields.find((field) => field.path === path)?.message;
  }
}
