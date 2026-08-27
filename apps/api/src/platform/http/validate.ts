/**
 * İstek doğrulama middleware'i.
 *
 * Her uç, gövde ve sorgu parametrelerini `@ersinspot/shared` içindeki zod şemasıyla
 * doğrular. Doğrulanmış veri bağlama yazılır ve handler yalnızca tipli, temizlenmiş
 * değere erişir — ham gövdeye erişim yoktur.
 *
 * Eski kod tabanında hiçbir şema doğrulama kütüphanesi yoktu; istek gövdesi
 * doğrudan destructure edilip veritabanına gidiyordu:
 *
 *     const { customer, items, delivery, payment, notes } = body;
 *
 * Eksik alan kontrolü her endpoint'te elle ve tutarsızdı.
 */

import type { Context, MiddlewareHandler, Next } from 'hono';
import type { ZodTypeAny, z } from 'zod';
import type { FieldError } from '@ersinspot/shared';
import { validationFailed } from '../errors/index.ts';

/** Doğrulanmış verilerin bağlamda tutulduğu anahtarlar. */
export interface ValidatedVariables {
  validatedBody: unknown;
  validatedQuery: unknown;
  validatedParams: unknown;
}

/** Zod hatalarını paylaşılan `FieldError` biçimine çevirir. */
function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * İstek gövdesini doğrular.
 *
 * Gövde okunamıyorsa (bozuk JSON, boş gövde) doğrulama hatası olarak ele alınır;
 * ham ayrıştırma hatası kullanıcıya gösterilmez.
 */
export function validateBody<S extends ZodTypeAny>(
  schema: S,
): MiddlewareHandler<{ Variables: ValidatedVariables }> {
  return async (c: Context<{ Variables: ValidatedVariables }>, next: Next) => {
    let raw: unknown;

    try {
      raw = await c.req.json();
    } catch {
      throw validationFailed([
        { path: '', message: 'İstek gövdesi okunamadı. Geçerli bir JSON gönderin.' },
      ]);
    }

    const result = schema.safeParse(raw);

    if (!result.success) {
      throw validationFailed(toFieldErrors(result.error));
    }

    c.set('validatedBody', result.data);
    await next();
  };
}

/** Sorgu dizesini doğrular. Değerler metin geldiği için şemalar `coerce` kullanır. */
export function validateQuery<S extends ZodTypeAny>(
  schema: S,
): MiddlewareHandler<{ Variables: ValidatedVariables }> {
  return async (c: Context<{ Variables: ValidatedVariables }>, next: Next) => {
    const result = schema.safeParse(c.req.query());

    if (!result.success) {
      throw validationFailed(toFieldErrors(result.error));
    }

    c.set('validatedQuery', result.data);
    await next();
  };
}

/** Yol parametrelerini doğrular. Kimliklerin UUID biçiminde olduğunu garanti eder. */
export function validateParams<S extends ZodTypeAny>(
  schema: S,
): MiddlewareHandler<{ Variables: ValidatedVariables }> {
  return async (c: Context<{ Variables: ValidatedVariables }>, next: Next) => {
    const result = schema.safeParse(c.req.param());

    if (!result.success) {
      throw validationFailed(toFieldErrors(result.error));
    }

    c.set('validatedParams', result.data);
    await next();
  };
}

// ---------------------------------------------------------------------------
// Okuyucular
// ---------------------------------------------------------------------------
// Handler bu fonksiyonlarla doğrulanmış veriye erişir. Şema tipi parametre olarak
// verildiği için dönüş değeri tam tiplidir.
//
// Parametre tipi `Context` yerine `{ var: ... }` yapısal biçiminde yazılır:
// Hono'nun `Context<E>` tipi `set` metodu yüzünden değişmezdir (invariant), bu da
// daha geniş bir `Variables` tipine sahip bağlamların daraltılmış imzaya
// geçirilmesini engeller. Yalnızca okuma yapan `var` özelliği üzerinden yazıldığında
// tip uyumu doğal olarak sağlanır.

interface ReadsValidated {
  readonly var: Partial<ValidatedVariables>;
}

/**
 * Şemanın çıktı tipini yapısal olarak çıkarır.
 *
 * `S extends ZodTypeAny` kısıtı kullanıldığında `z.infer<S>` `any` değerine
 * çözülür ve yardımcı hiçbir tip güvenliği sağlamaz — hata ESLint'in "gereksiz
 * tip dönüşümü" uyarısıyla ortaya çıktı. Zod şemalarının taşıdığı `_output`
 * hayalet özelliğinden okumak gerçek çıkarım verir.
 */
type OutputOf<S> = S extends { readonly _output: infer O } ? O : never;

export function body<S extends ZodTypeAny>(c: ReadsValidated, _schema: S): OutputOf<S> {
  const value = c.var.validatedBody;

  if (value === undefined) {
    throw new Error(
      "body(), validateBody middleware'i olmadan çağrıldı. Rota tanımını kontrol edin.",
    );
  }

  return value as OutputOf<S>;
}

export function query<S extends ZodTypeAny>(c: ReadsValidated, _schema: S): OutputOf<S> {
  const value = c.var.validatedQuery;

  if (value === undefined) {
    throw new Error(
      "query(), validateQuery middleware'i olmadan çağrıldı. Rota tanımını kontrol edin.",
    );
  }

  return value as OutputOf<S>;
}

export function params<S extends ZodTypeAny>(c: ReadsValidated, _schema: S): OutputOf<S> {
  const value = c.var.validatedParams;

  if (value === undefined) {
    throw new Error(
      "params(), validateParams middleware'i olmadan çağrıldı. Rota tanımını kontrol edin.",
    );
  }

  return value as OutputOf<S>;
}
