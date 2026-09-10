import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

/**
 * Bot tuzağı alanı.
 *
 * Gerçek kullanıcı bu alanı görmez ve dolduramaz; otomatik araçlar formdaki
 * her alanı doldurduğu için doldurur. Sunucu alanı dolu bulduğunda mesajı
 * sessizce yok sayar ve yine de başarılı yanıt döner — engellendiğini anlamayan
 * bir araç yeni yöntem denemez.
 *
 * `type="hidden"` KULLANILMAZ: onu birçok otomatik araç atlar, görsel olarak
 * gizlenmiş bir metin alanını atlamaz. Alan ekran dışına taşınır, `tabIndex`
 * ile klavye sırasından çıkarılır ve `aria-hidden` ile ekran okuyucudan
 * gizlenir; gören ya da duyan hiçbir kullanıcıya ulaşmaz.
 *
 * Ortak bileşen olmasının sebebi, sayfaların form alanını elle yazmamasıdır
 * (bkz. `consistency.test.ts`): etiket-girdi ilişkisi ve gizleme kuralı tek
 * yerde durur, ikinci bir herkese açık form eklendiğinde kopyalanmaz.
 */
export const HoneypotField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function HoneypotField({ id = 'website', ...props }, ref) {
    return (
      <div
        aria-hidden="true"
        className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor={id}>Bu alanı boş bırakın</label>
        <input ref={ref} id={id} type="text" tabIndex={-1} autoComplete="off" {...props} />
      </div>
    );
  },
);
