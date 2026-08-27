/**
 * Seçim alanları: seçenek kartları ve onay kutusu.
 *
 * Ödeme sayfasında teslimat yöntemi ve ödeme yöntemi aynı görsel kalıbı elle
 * iki kez yazıyordu; nakliye, teknik servis ve satış formlarında aynı kalıp
 * tekrar gerekecekti. Bir kez yazılır.
 */

import type { InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils.ts';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

export interface RadioCardsProps<T extends string> {
  legend: string;
  options: readonly ChoiceOption<T>[];
  /** Hangi seçeneğin işaretli olduğu. Karta görsel vurgu vermek için gerekir. */
  value: T | undefined;
  error?: string | undefined;
  /** İki sütuna yayılsın mı? Az ve kısa seçeneklerde daha iyi durur. */
  columns?: 1 | 2;
  /**
   * React Hook Form'un `register()` çıktısı doğrudan verilir; her karta
   * aynı `name` ile uygulanır.
   */
  field: InputHTMLAttributes<HTMLInputElement>;
}

/**
 * Kart görünümlü radyo grubu.
 *
 * Radyo girdisi kartın içinde durur ve tüm kart `<label>` olduğu için
 * tıklanabilir alan büyüktür. Girdi gizlenmez: klavye ile gezinme ve ekran
 * okuyucu doğal olarak çalışır.
 */
export function RadioCards<T extends string>({
  legend,
  options,
  value,
  error,
  columns = 2,
  field,
}: RadioCardsProps<T>) {
  const errorId = useId();

  /*
    Hata mesajı `fieldset`e bağlanır, sarmalayıcı `div`e değil: ekran okuyucu
    odaklanılan radyo girdisini okurken içinde bulunduğu grubun açıklamasını da
    bildirir. Araya giren bir `div`e bağlanan açıklama hiç duyurulmaz.
  */
  return (
    <fieldset
      className="space-y-3"
      {...(error === undefined ? {} : { 'aria-describedby': errorId, 'aria-invalid': true })}
    >
      <legend className="text-sm font-semibold text-slate-900">{legend}</legend>

      <div className={cn('grid gap-3', columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1')}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors',
              value === option.value
                ? 'border-brand-orange-500 bg-brand-orange-50'
                : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <input type="radio" value={option.value} className="mt-1 size-4 shrink-0" {...field} />

            <span className="min-w-0">
              <span className="flex items-center gap-2 font-medium text-slate-900">
                {option.icon === undefined ? null : (
                  <option.icon className="size-4 shrink-0" aria-hidden="true" />
                )}
                {option.label}
              </span>

              {option.description === undefined ? null : (
                <span className="mt-1 block text-sm text-slate-600">{option.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>

      {error === undefined ? null : (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Etiketin altındaki açıklama. */
  hint?: ReactNode;
  error?: string | undefined;
}

/**
 * Onay kutusu.
 *
 * Etiket ve açıklama girdiyle `htmlFor` ve `aria-describedby` üzerinden
 * ilişkilendirilir; `TextField` ile aynı sözleşme.
 */
export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  function CheckboxField({ label, hint, error, className, ...props }, ref) {
    const inputId = useId();
    const hintId = `${inputId}-yardim`;
    const errorId = `${inputId}-hata`;

    const describedBy =
      [error === undefined ? null : errorId, hint === undefined ? null : hintId]
        .filter((id): id is string => id !== null)
        .join(' ') || undefined;

    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex gap-3">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            aria-describedby={describedBy}
            aria-invalid={error !== undefined}
            className="mt-0.5 size-4 shrink-0 rounded border-slate-300"
            {...props}
          />

          <label htmlFor={inputId} className="text-sm text-slate-700">
            {label}
          </label>
        </div>

        {error === undefined ? (
          hint === undefined ? null : (
            <p id={hintId} className="pl-7 text-sm text-slate-500">
              {hint}
            </p>
          )
        ) : (
          <p id={errorId} className="pl-7 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);
