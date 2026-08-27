import { cn } from '@/lib/utils.ts';
import type { StatusMeta, StatusTone } from '@ersinspot/shared';

/**
 * Durum rozeti.
 *
 * Etiket ve renk, paylaşılan paketteki durum tanımından gelir. Eski kod
 * tabanında 19 dosya kendi `getStatus…` fonksiyonunu tanımlıyor ve durum
 * etiketleri 4-20 dosyada elle yazılıyordu; yeni bir durum eklemek 19 dosyayı
 * düzenlemek demekti.
 *
 * Durum renkleri marka renginden ayrıdır: turuncu bir vurgu, uyarı değil.
 */

const TONE_CLASSES: Readonly<Record<StatusTone, string>> = {
  neutral: 'bg-state-neutral-bg text-state-neutral-fg',
  pending: 'bg-state-pending-bg text-state-pending-fg',
  progress: 'bg-state-progress-bg text-state-progress-fg',
  success: 'bg-state-success-bg text-state-success-fg',
  danger: 'bg-state-danger-bg text-state-danger-fg',
};

export interface StatusBadgeProps {
  meta: StatusMeta;
  /** Açıklamayı da gösterir; detay sayfalarında yardımcı olur. */
  withDescription?: boolean;
  className?: string;
}

export function StatusBadge({ meta, withDescription = false, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex flex-col gap-0.5', className)}>
      <span
        className={cn(
          'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium',
          TONE_CLASSES[meta.tone],
        )}
      >
        {meta.label}
      </span>

      {withDescription ? <span className="text-xs text-slate-500">{meta.description}</span> : null}
    </span>
  );
}
