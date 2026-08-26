import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils.ts';

/**
 * Form alanı sarmalayıcısı.
 *
 * Etiket, yardım metni ve hata mesajını girdiyle doğru şekilde ilişkilendirir:
 * `htmlFor`, `aria-describedby` ve `aria-invalid` elle yazılmaz, unutulamaz.
 *
 * Eski kod tabanında formlar bu ilişkilendirmeleri yapmıyordu; ekran okuyucu
 * bir alanın hangi etikete ait olduğunu ve hatalı olup olmadığını bilmiyordu.
 */

interface FieldWrapperProps {
  label: string;
  /** Alanın altında gösterilen açıklama. */
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  children: (ids: {
    inputId: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
  className?: string;
}

export function FormField({
  label,
  hint,
  error,
  required = false,
  children,
  className,
}: FieldWrapperProps) {
  const inputId = useId();
  const hintId = `${inputId}-yardim`;
  const errorId = `${inputId}-hata`;

  const describedBy =
    [error === undefined ? null : errorId, hint === undefined ? null : hintId]
      .filter((id): id is string => id !== null)
      .join(' ') || undefined;

  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
        {required ? (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children({ inputId, describedBy, invalid: error !== undefined })}

      {error === undefined ? (
        hint === undefined ? null : (
          <p id={hintId} className="text-sm text-slate-500">
            {hint}
          </p>
        )
      ) : (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm ' +
  'placeholder:text-slate-400 aria-[invalid=true]:border-red-500';

/** Etiketli metin girdisi. */
export const TextField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }
>(function TextField({ label, hint, error, required, className, ...props }, ref) {
  return (
    <FormField label={label} hint={hint} error={error} required={required} className={className}>
      {({ inputId, describedBy, invalid }) => (
        <input
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={inputClass}
          {...props}
        />
      )}
    </FormField>
  );
});

/** Etiketli açılır liste. */
export const SelectField = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; error?: string }
>(function SelectField({ label, hint, error, required, className, children, ...props }, ref) {
  return (
    <FormField label={label} hint={hint} error={error} required={required} className={className}>
      {({ inputId, describedBy, invalid }) => (
        <select
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={inputClass}
          {...props}
        >
          {children}
        </select>
      )}
    </FormField>
  );
});

/** Etiketli çok satırlı metin. */
export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }
>(function TextAreaField({ label, hint, error, required, className, ...props }, ref) {
  return (
    <FormField label={label} hint={hint} error={error} required={required} className={className}>
      {({ inputId, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={inputId}
          rows={4}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={inputClass}
          {...props}
        />
      )}
    </FormField>
  );
});
