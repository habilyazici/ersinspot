/**
 * Kart, künye listesi ve zaman çizelgesi.
 *
 * Üçü de "bir kaydın bilgilerini göster" işini yapar ve sipariş detayında,
 * talep detayında, ödeme özetinde aynı görünmeleri gerekir. Denetimde bunlar
 * her sayfada elle yazılıyordu ve dolgu, kenarlık ve satır aralığı sayfadan
 * sayfaya değişiyordu.
 */

import type { ElementType, ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils.ts';

const PADDINGS = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
} as const;

export interface CardProps {
  children: ReactNode;
  padding?: keyof typeof PADDINGS;
  /** Sağ sütunda kaydırmayla birlikte kayan özet kartı. */
  sticky?: boolean;
  /**
   * Kartın HTML elemanı.
   *
   * Liste içindeki kart `li` olmalıdır: `ul` yalnızca `li` içerebilir, aksi
   * halde işaretleme geçersizdir ve ekran okuyucu listeyi liste olarak
   * bildirmez.
   */
  as?: ElementType;
  /**
   * Kartın kendisi tıklanabilir bir öğeyse (bağlantı gibi) o öğeye dönüşür;
   * kart stili çocuğa uygulanır. `Button` ile aynı sözleşme.
   */
  asChild?: boolean;
  /** Fareyle üzerine gelindiğinde yükselir. Tıklanabilir kartlarda. */
  interactive?: boolean;
  className?: string;
}

export function Card({
  children,
  padding = 'sm',
  sticky = false,
  as: Element = 'div',
  asChild = false,
  interactive = false,
  className,
}: CardProps) {
  const Component = asChild ? Slot : Element;

  return (
    <Component
      className={cn(
        'rounded-xl border border-slate-200 bg-white',
        PADDINGS[padding],
        sticky && 'h-fit lg:sticky lg:top-20',
        interactive && 'transition-shadow hover:shadow-card',
        className,
      )}
    >
      {children}
    </Component>
  );
}

export interface DetailRow {
  term: string;
  value: ReactNode;
  /**
   * Terim ve değeri alt alta gösterir. Uzun değerler (adres, not) için;
   * kısa değerler aynı satırda sağa yaslanır.
   */
  stacked?: boolean;
}

export interface DetailListProps {
  rows: readonly (DetailRow | null | false)[];
  className?: string;
}

/**
 * Künye listesi.
 *
 * `null`/`false` satırlar atlanır: çağıran taraf koşullu satırları
 * `condition && { term, value }` biçiminde yazabilir, dizi filtrelemek
 * zorunda kalmaz.
 */
export function DetailList({ rows, className }: DetailListProps) {
  const visible = rows.filter((row): row is DetailRow => row !== null && row !== false);

  return (
    <dl className={cn('space-y-2 text-sm', className)}>
      {visible.map((row) =>
        row.stacked === true ? (
          <div key={row.term} className="space-y-0.5">
            <dt className="text-slate-600">{row.term}</dt>
            <dd className="text-slate-900">{row.value}</dd>
          </div>
        ) : (
          <div key={row.term} className="flex justify-between gap-4">
            <dt className="text-slate-600">{row.term}</dt>
            <dd className="text-right font-medium text-slate-900">{row.value}</dd>
          </div>
        ),
      )}
    </dl>
  );
}

export interface TimelineEvent {
  label: string;
  /** ISO tarih-saat. Biçimlendirme çağırana bırakılmaz; burada yapılır. */
  occurredAt: string;
  note?: string | null;
}

export interface TimelineProps {
  events: readonly TimelineEvent[];
  /** Zamanı biçimlendiren fonksiyon. Sipariş ve talep aynı biçimi kullanır. */
  formatTime: (value: string) => string;
  className?: string;
}

/**
 * Durum geçmişi.
 *
 * Son olay güncel durumdur ve vurgulanır; öncekiler soluk kalır. Sipariş ve
 * hizmet talebi aynı bileşeni kullanır — ikisinin de geçmişi aynı şekilde
 * okunur, yalnızca etiketler farklıdır.
 */
export function Timeline({ events, formatTime, className }: TimelineProps) {
  return (
    <ol className={cn('space-y-4 border-l-2 border-slate-200 pl-5', className)}>
      {events.map((event, index) => {
        const isCurrent = index === events.length - 1;

        return (
          <li key={`${event.label}-${event.occurredAt}`} className="relative">
            <span
              className={
                isCurrent
                  ? 'absolute -left-[27px] top-1 size-3 rounded-full bg-brand-orange-500 ring-4 ring-brand-orange-100'
                  : 'absolute -left-[25px] top-1.5 size-2 rounded-full bg-slate-300'
              }
              aria-hidden="true"
            />

            <p className="text-sm font-medium text-slate-900">{event.label}</p>
            <p className="text-xs text-slate-500">{formatTime(event.occurredAt)}</p>

            {event.note === null || event.note === undefined ? null : (
              <p className="mt-1 text-sm text-slate-600">{event.note}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
