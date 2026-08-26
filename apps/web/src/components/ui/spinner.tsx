import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

/**
 * Yükleme göstergesi.
 *
 * Ekran okuyucuya durumu bildirir: yalnızca dönen bir simge, görmeyen kullanıcı
 * için sayfanın donmuş olmasından ayırt edilemez.
 */
export function Spinner({
  className,
  label = 'Yükleniyor',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-slate-500', className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Sayfa ortasında tam yükseklikte yükleme göstergesi. */
export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}
