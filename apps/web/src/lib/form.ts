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

/**
 * `aria-describedby` değerini üretir.
 *
 * Yalnızca EKRANDA GERÇEKTEN ÇİZİLEN öğeyi gösterir. Alan bileşenlerinin hepsi
 * hata varken yardım metnini gizleyip yerine hatayı yazıyor; buna rağmen
 * öznitelik ikisini birden bildiriyor ve var olmayan bir kimliğe işaret
 * ediyordu. Ekran okuyucular eksik kimliği sessizce atlar, dolayısıyla hata
 * hiçbir yerde görünmüyordu — yine de öznitelik, gösterilmeyen bir metni vaat
 * etmemelidir.
 *
 * Üç alan bileşeni (metin, onay kutusu, fotoğraf) aynı kuralı uyguladığı için
 * kural burada bir kez yazılır. `form-field.tsx` içinde duramaz: bileşen
 * dosyasından bileşen olmayan bir değer dışa aktarmak hızlı yenilemeyi
 * (fast refresh) bozar ve lint bunu uyarı olarak bildirir.
 */
export function describedByFor(options: {
  hintId: string;
  errorId: string;
  hasHint: boolean;
  hasError: boolean;
}): string | undefined {
  if (options.hasError) return options.errorId;
  return options.hasHint ? options.hintId : undefined;
}
