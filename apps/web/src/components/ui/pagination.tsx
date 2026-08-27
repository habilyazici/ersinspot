/**
 * Sayfalama ve süzgeç çipleri.
 *
 * Ürün vitrini, sipariş listesi, talep listesi ve mesaj listesi aynı iki
 * kalıba ihtiyaç duyar. Her birinde elle yazıldığında düğme boyutları ve
 * "Sayfa 2 / 5" metni ayrışırdı.
 *
 * SÜZGEÇ DURUMU ADRES ÇUBUĞUNDA tutulur, bileşen durumunda değil: bir listeyi
 * paylaşmak, yer imine eklemek ve geri tuşuyla dönmek mümkün olmalıdır.
 */

import { Button } from './button.tsx';
import { cn } from '@/lib/utils.ts';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Sayfalama"
      className={cn('mt-8 flex items-center justify-center gap-2', className)}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => {
          onPageChange(page - 1);
        }}
      >
        Önceki
      </Button>

      <span className="px-3 text-sm tabular-nums text-slate-600">
        Sayfa {page} / {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => {
          onPageChange(page + 1);
        }}
      >
        Sonraki
      </Button>
    </nav>
  );
}

export interface FilterChipsProps<T extends string> {
  /** Grubun ne olduğunu bildirir; ekran okuyucu için gereklidir. */
  label: string;
  options: readonly { value: T; label: string }[];
  /** Seçili değer; `undefined` "tümü" demektir. */
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  /** "Tümü" çipinin metni. */
  allLabel?: string;
  className?: string;
}

/**
 * Tek seçimli süzgeç çipleri.
 *
 * Seçili çipe tekrar basmak süzgeci kaldırır — ayrı bir "temizle" düğmesi
 * gerekmez. `aria-pressed` durumu bildirir; renk tek başına yeterli değildir.
 */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
  allLabel = 'Tümü',
  className,
}: FilterChipsProps<T>) {
  const chipClass = (isActive: boolean): string =>
    cn(
      'rounded-full border px-3 py-1.5 text-sm transition-colors',
      isActive
        ? 'border-brand-orange-500 bg-brand-orange-50 text-brand-orange-700'
        : 'border-slate-200 text-slate-600 hover:border-slate-300',
    );

  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      <button
        type="button"
        aria-pressed={value === undefined}
        className={chipClass(value === undefined)}
        onClick={() => {
          onChange(undefined);
        }}
      >
        {allLabel}
      </button>

      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={chipClass(value === option.value)}
          onClick={() => {
            onChange(value === option.value ? undefined : option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
