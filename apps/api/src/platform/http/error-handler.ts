/**
 * Merkezi hata işleyici.
 *
 * Tüm hatalar buradan geçer ve paylaşılan sözleşmedeki `ApiErrorBody` biçimine
 * çevrilir. İki kural:
 *
 * 1. Beklenen hatalar (`AppError`) kullanıcıya anlaşılır mesajla döner.
 *
 * 2. Beklenmeyen hatalar loglanır ama dışarı **hiçbir ayrıntı sızmaz** — yığın izi,
 *    SQL metni, dosya yolu, sütun adı hiçbiri. Kullanıcı yalnızca genel bir mesaj
 *    ve destek talebinde paylaşabileceği bir izleme kodu görür.
 *
 * Eski kod tabanında hata yanıtları `return c.json({ error: err.message }, 500)`
 * biçimindeydi; bu, veritabanı hata metinlerini (tablo ve sütun adları dahil)
 * doğrudan istemciye gönderiyordu.
 */

import type { Context, ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { ApiErrorBody, FieldError } from '@ersinspot/shared';
import { ERROR_MESSAGES } from '@ersinspot/shared';
import { AppError, isAppError } from '../errors/index.ts';
import { generateTraceId, logger } from '../observability/logger.ts';
import { isProduction } from '../config/env.ts';

/** PostgreSQL hata kodlarından bazıları kullanıcıya anlamlı bir mesaja çevrilebilir. */
function mapDatabaseError(error: unknown): AppError | null {
  if (typeof error !== 'object' || error === null) return null;

  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string') return null;

  switch (code) {
    case '23505': // unique_violation
      return new AppError('already_exists');
    case '23503': // foreign_key_violation
      return new AppError('business_rule_violated', {
        message: 'İlişkili bir kayıt bulunamadı veya silinemiyor.',
      });
    case '23514': // check_violation
      return new AppError('business_rule_violated', {
        message: 'Gönderilen değerler iş kurallarına uymuyor.',
      });
    case '40001': // serialization_failure
    case '40P01': // deadlock_detected
      return new AppError('resource_conflict', {
        message: 'İşlem başka bir işlemle çakıştı. Lütfen tekrar deneyin.',
      });
    default:
      return null;
  }
}

function buildBody(error: AppError, traceId: string | undefined): ApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields.length > 0 ? { fields: error.fields } : {}),
      ...(error.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: error.retryAfterSeconds }),
      ...(traceId === undefined ? {} : { traceId }),
    },
  };
}

export const errorHandler: ErrorHandler = (error: unknown, c: Context) => {
  const requestInfo = {
    method: c.req.method,
    path: c.req.path,
  };

  // 1) Uygulama hataları: beklenen durumlar.
  if (isAppError(error)) {
    // İstemci hataları gürültü yaratmasın diye yalnızca debug seviyesinde loglanır;
    // sunucu hataları ve yetki ihlalleri uyarı seviyesinde.
    if (error.status >= 500) {
      logger.error(error.message, { ...requestInfo, code: error.code, context: error.context });
    } else if (error.status === 401 || error.status === 403 || error.status === 429) {
      logger.warn(error.message, { ...requestInfo, code: error.code, context: error.context });
    } else {
      logger.debug(error.message, { ...requestInfo, code: error.code });
    }

    const traceId = error.status >= 500 ? generateTraceId() : undefined;

    if (error.retryAfterSeconds !== undefined) {
      c.header('Retry-After', String(error.retryAfterSeconds));
    }

    return c.json(buildBody(error, traceId), error.status as 400);
  }

  // 2) Doğrulama middleware'i dışında kalan zod hataları.
  if (error instanceof ZodError) {
    const fields: FieldError[] = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    logger.debug('Doğrulama hatası', { ...requestInfo, fieldCount: fields.length });

    return c.json(buildBody(new AppError('validation_failed', { fields }), undefined), 400);
  }

  // 3) Veritabanı hataları: tanınanlar anlamlı mesaja çevrilir.
  const mapped = mapDatabaseError(error);
  if (mapped !== null) {
    logger.warn('Veritabanı kısıtı ihlal edildi', {
      ...requestInfo,
      code: mapped.code,
      // Ham hata yalnızca logda; yanıta girmez.
      cause: error instanceof Error ? error.message : String(error),
    });

    return c.json(buildBody(mapped, undefined), mapped.status as 400);
  }

  // 4) Hono'nun kendi istisnaları (gövde boyutu, yöntem uyuşmazlığı vb.).
  if (error instanceof HTTPException) {
    /*
      Mesaj yalnızca istemci hatalarında (4xx) aktarılır. 5xx bir HTTPException
      sunucu tarafı bir arızayı anlatır ve metni iç ayrıntı taşıyabilir; bu
      dosyanın kuralı gereği dışarı çıkmaz.
    */
    const isClientError = error.status >= 400 && error.status < 500;

    const appError = new AppError(error.status === 404 ? 'not_found' : 'business_rule_violated', {
      ...(error.status === 404
        ? { message: ERROR_MESSAGES.not_found }
        : isClientError
          ? { message: error.message }
          : {}),
    });

    if (isClientError) {
      logger.debug('HTTP istisnası', { ...requestInfo, status: error.status });
    } else {
      logger.error('HTTP istisnası', {
        ...requestInfo,
        status: error.status,
        cause: error.message,
      });
    }

    return c.json(buildBody(appError, undefined), error.status);
  }

  // 5) Beklenmeyen hata: ayrıntı dışarı çıkmaz.
  const traceId = generateTraceId();

  logger.error('Beklenmeyen hata', {
    ...requestInfo,
    traceId,
    error: error instanceof Error ? error : String(error),
  });

  const internal = new AppError('internal_error');

  return c.json(
    {
      error: {
        code: internal.code,
        message: internal.message,
        traceId,
        // Geliştirmede hata mesajı yanıta eklenir; üretimde asla.
        ...(isProduction || !(error instanceof Error) ? {} : { debugMessage: error.message }),
      },
    },
    500,
  );
};

/** Tanımsız rotalar için 404 yanıtı. */
export function notFoundHandler(c: Context) {
  const body: ApiErrorBody = {
    error: {
      code: 'not_found',
      message: 'Böyle bir uç nokta yok.',
    },
  };
  return c.json(body, 404);
}
