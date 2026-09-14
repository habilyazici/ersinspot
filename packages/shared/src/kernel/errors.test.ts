/**
 * API hatasının istemciye verdiği kararlar.
 *
 * `ApiError` yalnızca bir mesaj taşımaz; istemcinin ne yapacağını da söyler —
 * girişe yönlendirsin mi, isteği kendiliğinden tekrarlasın mı. İki karar da
 * arayüzde doğrudan davranışa çevrilir (`query-client.ts`), bu yüzden burada
 * sabitlenir.
 */

import { describe, expect, it } from 'vitest';
import { ApiError } from './errors.ts';
import type { ErrorCode } from './errors.ts';

function hata(code: ErrorCode, extra: Record<string, unknown> = {}): ApiError {
  return new ApiError({ error: { code, message: 'mesaj', ...extra } }, 400);
}

describe('ApiError', () => {
  it('yalnızca oturumsuz hatada girişe yönlendirir', () => {
    expect(hata('unauthenticated').requiresLogin).toBe(true);

    for (const code of ['forbidden', 'not_found', 'validation_failed'] as const) {
      expect(hata(code).requiresLogin).toBe(false);
    }
  });

  it('sunucu hatasını tekrar denenebilir sayar', () => {
    expect(hata('internal_error').isRetryable).toBe(true);
  });

  it('hız sınırını tekrar denenebilir SAYMAZ', () => {
    /*
      Sunucu "şu kadar saniye bekle" der ve o süre dakikalarla ölçülür;
      istemcinin saniyelerle ölçülen geri çekilmesiyle yapılan deneme hiçbir
      zaman başarılı olamaz. Tek yaptığı, kullanıcıya beklemesi gerektiğini
      söyleyen mesajı geciktirmek ve kendini savunan sunucuya fazladan istek
      göndermektir.
    */
    expect(hata('rate_limited', { retryAfterSeconds: 869 }).isRetryable).toBe(false);
  });

  it('istemci hatalarını tekrar denemez', () => {
    for (const code of [
      'validation_failed',
      'not_found',
      'forbidden',
      'already_exists',
      'product_unavailable',
    ] as const) {
      expect(hata(code).isRetryable).toBe(false);
    }
  });

  it('bekleme süresini ve alan hatalarını taşır', () => {
    const rate = hata('rate_limited', { retryAfterSeconds: 869 });
    expect(rate.retryAfterSeconds).toBe(869);

    const validation = hata('validation_failed', {
      fields: [{ path: 'email', message: 'E-posta adresi zorunludur.' }],
    });
    expect(validation.fieldError('email')).toBe('E-posta adresi zorunludur.');
    expect(validation.fieldError('phone')).toBeUndefined();
  });
});
