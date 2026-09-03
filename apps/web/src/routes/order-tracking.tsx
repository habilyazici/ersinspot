import { useState } from 'react';
import type { FormEvent } from 'react';
import { PackageSearch } from 'lucide-react';
import { ORDER_STATUS_LABELS } from '@ersinspot/shared';
import { Card } from '@/components/ui/card.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { Button } from '@/components/ui/button.tsx';
import { TextField } from '@/components/ui/form-field.tsx';
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
 * İKİ BİLGİ İSTENİR. Takip numaraları sırayla üretilir; yalnızca numarayla
 * sorgulanabilseydi sayacı artıran biri mağazanın tüm siparişlerinin durumunu
 * tarayabilirdi. Sipariş üzerindeki iletişim numarası, müşterinin bildiği ama
 * saldırganın numaradan türetemeyeceği ikinci bilgidir.
 *
 * Oturum gerektirmez; bu yüzden dönen bilgi ayrıca dardır: ad, telefon, adres
 * ve fiyat yer almaz.
 */
export default function OrderTrackingPage() {
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState<{ reference: string; phone: string } | null>(null);

  const { data, isLoading, isError } = useOrderTracking(
    submitted?.reference ?? '',
    submitted?.phone ?? '',
    submitted !== null,
  );

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setSubmitted({ reference: reference.trim().toUpperCase(), phone: phone.trim() });
  }

  return (
    <PageContainer width="prose">
      <PageHeader
        align="center"
        icon={PackageSearch}
        title="Sipariş Takibi"
        description="Sipariş onayında size ilettiğimiz takip numarasını ve siparişteki telefon numarasını girin."
      />

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Takip numarası"
            required
            value={reference}
            onChange={(event) => {
              setReference(event.target.value);
            }}
            placeholder="SIP-2026-000123"
            autoComplete="off"
            inputMode="text"
          />

          <TextField
            label="Telefon"
            required
            type="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
            }}
            placeholder="0507 194 05 50"
            hint="Siparişi verirken bildirdiğiniz numara."
            autoComplete="tel"
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
              Bu bilgilerle bir sipariş bulunamadı. Takip ve telefon numarasını kontrol edip tekrar
              deneyin.
            </p>
          </div>
        ) : data === undefined ? null : (
          <Card as="article" padding="lg" className="shadow-card">
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
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
