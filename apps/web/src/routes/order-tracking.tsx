import { useState } from 'react';
import type { FormEvent } from 'react';
import { PackageSearch } from 'lucide-react';
import { ORDER_STATUS_LABELS } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatDate, formatDateTime } from '@/lib/format.ts';
import { useOrderTracking } from '@/features/ordering';

/**
 * Sipariş takibi.
 *
 * Eski sitede bu sayfa TAMAMEN sahte veriyle çalışıyordu: yalnızca kaynak
 * dosyaya gömülü "SIP-123456" gibi kodlar eşleşiyordu ve gerçek bir müşteri
 * kendi sipariş numarasını girdiğinde "bulunamadı" alıyordu.
 *
 * Oturum gerektirmez; bu yüzden dönen bilgi bilinçli olarak dardır: ad,
 * telefon, adres ve fiyat yer almaz.
 */
export default function OrderTrackingPage() {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data, isLoading, isError } = useOrderTracking(submitted, submitted !== '');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setSubmitted(input.trim().toUpperCase());
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <PackageSearch className="mx-auto size-10 text-brand-orange-500" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Sipariş Takibi</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sipariş onayında size ilettiğimiz takip numarasını girin.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 flex gap-2">
        <div className="flex-1">
          <label htmlFor="takip-no" className="sr-only">
            Takip numarası
          </label>
          <input
            id="takip-no"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="SIP-2026-000123"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm uppercase"
          />
        </div>

        <Button type="submit" size="lg" isLoading={isLoading}>
          Sorgula
        </Button>
      </form>

      <div aria-live="polite" className="mt-8">
        {isError ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-700">
              Bu takip numarasıyla bir sipariş bulunamadı. Numarayı kontrol edip tekrar deneyin.
            </p>
          </div>
        ) : data === undefined ? null : (
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-slate-500">{data.referenceNumber}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {data.itemCount} ürün · {formatDate(data.createdAt)}
                </p>
              </div>

              <StatusBadge meta={ORDER_STATUS_LABELS[data.status]} withDescription />
            </div>

            {data.deliveryDate === null ? null : (
              <p className="mt-4 rounded-lg bg-brand-navy-50 px-4 py-3 text-sm text-brand-navy-800">
                Planlanan teslimat: <strong>{formatDate(data.deliveryDate)}</strong>
              </p>
            )}

            <section aria-labelledby="gecmis" className="mt-6">
              <h2 id="gecmis" className="text-sm font-semibold text-slate-900">
                Sipariş Geçmişi
              </h2>

              <ol className="mt-3 space-y-3">
                {data.timeline.map((event, index) => (
                  <li key={`${event.status}-${event.occurredAt}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={
                          index === data.timeline.length - 1
                            ? 'size-2.5 rounded-full bg-brand-orange-500'
                            : 'size-2.5 rounded-full bg-slate-300'
                        }
                        aria-hidden="true"
                      />
                      {index < data.timeline.length - 1 ? (
                        <span className="w-px flex-1 bg-slate-200" aria-hidden="true" />
                      ) : null}
                    </div>

                    <div className="pb-3">
                      <p className="text-sm font-medium text-slate-900">
                        {ORDER_STATUS_LABELS[event.status].label}
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(event.occurredAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </article>
        )}
      </div>
    </div>
  );
}
