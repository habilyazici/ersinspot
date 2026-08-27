import type { FieldErrors } from 'react-hook-form';

/**
 * İç içe alan yolundaki doğrulama hatasını okur.
 *
 * React Hook Form'un hata nesnesi formun şeklini birebir yansıtır; ayrımlı
 * birleşimlerde (`delivery` gibi) TypeScript hangi kolun etkin olduğunu
 * bilemediği için `errors.delivery.deliveryDate` doğrudan okunamaz.
 *
 * Yol dizgesiyle okumak bu sorunu çözer: tip düzeyinde değil çalışma anında
 * gezinir, sonucu daima `string | undefined` olarak döner.
 *
 * @example findError(errors, 'delivery.address.district')
 */
export function findError(errors: FieldErrors, path: string): string | undefined {
  let current: unknown = errors;

  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  if (typeof current === 'object' && current !== null && 'message' in current) {
    const message = (current as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }

  return undefined;
}
