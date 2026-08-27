/**
 * Hizmet talebi detayı.
 *
 * Üç talep türü (nakliye, teknik servis, ürün satma) TEK sayfada gösterilir.
 * Ortak olan her şey — durum, teklif, randevu, geçmiş, iptal — bir kez
 * yazılır; türe göre değişen yalnızca "Talep Bilgileri" bölümüdür.
 *
 * Sayfa, sipariş detayıyla AYNI bileşenleri kullanır (`PageHeader`, `Section`,
 * `Card`, `DetailList`, `Timeline`). İki ekranın içeriği farklıdır, çerçevesi
 * aynıdır.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarCheck, ClipboardList, Home, MapPin, Package, Receipt, Wrench } from 'lucide-react';
import {
  ApiError,
  CUSTOMER_CANCELLABLE_REQUEST_STATUSES,
  DEVICE_TYPE_LABELS,
  HOUSE_SIZE_LABELS,
  PRODUCT_CONDITION_LABELS,
  PROBLEM_CATEGORY_LABELS,
  REQUEST_STATUS_LABELS,
  SERVICE_KIND_LABELS,
  WARRANTY_STATUS_LABELS,
} from '@ersinspot/shared';
import type { RequestStatus, ServiceRequest } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card, DetailList, Timeline } from '@/components/ui/card.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { TextAreaField } from '@/components/ui/form-field.tsx';
import { PageContainer, PageHeader, Section } from '@/components/ui/page.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import {
  formatAddress,
  formatDate,
  formatDateTime,
  formatPrice,
  formatTimeSlot,
} from '@/lib/format.ts';
import type { DetailRow } from '@/components/ui/card.tsx';
import { useCancelRequest, useRequest, useRespondToQuote } from '@/features/servicing';

/** Müşteri bu talebi kendisi iptal edebilir mi? Kural sunucuyla ortak. */
function isCancellable(status: RequestStatus): boolean {
  return (CUSTOMER_CANCELLABLE_REQUEST_STATUSES as readonly RequestStatus[]).includes(status);
}

/**
 * Türe özgü bilgi satırları.
 *
 * `kind` ayrımlı birleşimin ayırıcısıdır; TypeScript her dalda hangi alanların
 * mevcut olduğunu buradan bilir. Yeni bir talep türü eklendiğinde bu switch
 * derlenmez ve eksik dal derleme anında görünür.
 */
function detailRows(request: ServiceRequest): {
  icon: typeof Home;
  /** `DetailList` boş satırları kendisi atar; koşullu satırlar burada `null` bırakılır. */
  rows: readonly (DetailRow | null)[];
} {
  switch (request.kind) {
    case 'moving':
      return {
        icon: Home,
        rows: [
          { term: 'Ev büyüklüğü', value: HOUSE_SIZE_LABELS[request.houseSize] },
          {
            term: 'Çıkış adresi',
            value: `${formatAddress(request.fromLocation.address)} · ${String(request.fromLocation.floor)}. kat${request.fromLocation.hasElevator ? ' (asansörlü)' : ''}`,
            stacked: true,
          },
          {
            term: 'Varış adresi',
            value: `${formatAddress(request.toLocation.address)} · ${String(request.toLocation.floor)}. kat${request.toLocation.hasElevator ? ' (asansörlü)' : ''}`,
            stacked: true,
          },
          { term: 'Tercih edilen tarih', value: formatDate(request.preferredDate) },
          { term: 'Eşya sayısı', value: `${String(request.items.length)} kalem` },
          { term: 'Ambalajlama', value: request.needsPacking ? 'İsteniyor' : 'İstenmiyor' },
          { term: 'Montaj', value: request.needsAssembly ? 'İsteniyor' : 'İstenmiyor' },
          { term: 'İlk tahmin', value: formatPrice(request.estimatedTotal) },
        ],
      };

    case 'technical_service':
      return {
        icon: Wrench,
        rows: [
          {
            term: 'Cihaz',
            value:
              request.customDeviceType ??
              `${DEVICE_TYPE_LABELS[request.deviceType]} · ${request.brand}`,
          },
          request.model === null ? null : { term: 'Model', value: request.model },
          { term: 'Garanti', value: WARRANTY_STATUS_LABELS[request.warrantyStatus] },
          { term: 'Arıza türü', value: PROBLEM_CATEGORY_LABELS[request.problemCategory] },
          { term: 'Arıza açıklaması', value: request.problemDescription, stacked: true },
          { term: 'Adres', value: formatAddress(request.address), stacked: true },
          { term: 'Tercih edilen tarih', value: formatDate(request.preferredDate) },
          { term: 'Keşif ücreti', value: formatPrice(request.inspectionFee) },
          request.diagnosis === null
            ? null
            : { term: 'Teknisyen tespiti', value: request.diagnosis, stacked: true },
        ],
      };

    case 'sell_request':
      return {
        icon: Package,
        rows: [
          { term: 'Ürün', value: request.title },
          { term: 'Kategori', value: request.category.name },
          { term: 'Marka', value: request.brand },
          request.model === null ? null : { term: 'Model', value: request.model },
          { term: 'Durum', value: PRODUCT_CONDITION_LABELS[request.condition].label },
          request.purchaseYear === null
            ? null
            : { term: 'Alım yılı', value: String(request.purchaseYear) },
          { term: 'Açıklama', value: request.description, stacked: true },
          {
            term: 'Yanında gelenler',
            value:
              [
                request.hasBox ? 'kutusu' : null,
                request.hasAccessories ? 'aksesuarları' : null,
                request.hasWarranty ? 'garanti belgesi' : null,
              ]
                .filter((item): item is string => item !== null)
                .join(', ') || 'yok',
          },
          request.askingPrice === null
            ? null
            : { term: 'Beklediğiniz fiyat', value: formatPrice(request.askingPrice) },
          {
            term: 'Teslim alma adresi',
            value: formatAddress(request.pickupAddress),
            stacked: true,
          },
        ],
      };
  }
}

export default function RequestDetailPage() {
  const { requestId = '' } = useParams<{ requestId: string }>();
  const { data: request, isLoading, isError, error, refetch } = useRequest(requestId);
  const respondToQuote = useRespondToQuote();
  const cancelRequest = useCancelRequest();

  const [isCancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (isLoading) return <PageSpinner label="Talep yükleniyor" />;

  if (isError || request === undefined) {
    return (
      <PageContainer width="prose">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  const { icon: KindIcon, rows } = detailRows(request);

  function respond(decision: 'accept' | 'reject'): void {
    respondToQuote.mutate(
      { requestId, response: { decision } },
      {
        onSuccess: () => {
          toast.success(
            decision === 'accept'
              ? 'Teklifi kabul ettiniz. Randevu için sizinle iletişime geçeceğiz.'
              : 'Teklifi reddettiniz.',
          );
        },
        onError: (respondError) => {
          toast.error(
            respondError instanceof ApiError
              ? respondError.message
              : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
          );
        },
      },
    );
  }

  function handleCancel(): void {
    cancelRequest.mutate(
      { requestId, ...(reason.trim() === '' ? {} : { reason: reason.trim() }) },
      {
        onSuccess: () => {
          toast.success('Talebiniz iptal edildi.');
          setCancelOpen(false);
        },
        onError: (cancelError) => {
          toast.error(
            cancelError instanceof ApiError
              ? cancelError.message
              : 'Talep iptal edilemedi. Lütfen tekrar deneyin.',
          );
        },
      },
    );
  }

  return (
    <PageContainer>
      <PageHeader
        backTo={{ to: '/hesabim/taleplerim', label: 'Taleplerim' }}
        title={SERVICE_KIND_LABELS[request.kind].label}
        meta={
          <>
            <span className="font-mono">{request.referenceNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(request.createdAt)}</span>
          </>
        }
        aside={<StatusBadge meta={REQUEST_STATUS_LABELS[request.status]} withDescription />}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-8">
          <Section title="Talep Bilgileri" icon={KindIcon}>
            <Card>
              <DetailList rows={rows} />
            </Card>
          </Section>

          {/* Nakliyede eşya listesi ayrı gösterilir: satır sayısı değişkendir. */}
          {request.kind !== 'moving' ? null : (
            <Section title="Taşınacak Eşyalar" icon={ClipboardList}>
              <Card>
                <ul className="space-y-1 text-sm">
                  {request.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-4">
                      <span className="text-slate-700">
                        {item.name}
                        {item.needsDisassembly ? ' (söküm gerekli)' : ''}
                      </span>
                      <span className="shrink-0 font-medium text-slate-900">
                        {item.quantity} adet
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          )}

          {request.customerNote === null ? null : (
            <Section title="Notunuz" icon={MapPin}>
              <Card>
                <p className="text-sm text-slate-700">{request.customerNote}</p>
              </Card>
            </Section>
          )}

          {request.appointment === null ? null : (
            <Section title="Randevu" icon={CalendarCheck}>
              <Card>
                <DetailList
                  rows={[
                    { term: 'Tarih', value: formatDate(request.appointment.date) },
                    { term: 'Saat aralığı', value: formatTimeSlot(request.appointment.timeSlot) },
                    request.appointment.note !== null && {
                      term: 'Not',
                      value: request.appointment.note,
                      stacked: true,
                    },
                  ]}
                />
              </Card>
            </Section>
          )}

          <Section title="Talep Geçmişi" icon={ClipboardList}>
            <Timeline
              formatTime={formatDateTime}
              events={request.timeline.map((event) => ({
                label: REQUEST_STATUS_LABELS[event.status].label,
                occurredAt: event.occurredAt,
                note: event.note,
              }))}
            />
          </Section>
        </div>

        <Card padding="md" sticky className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Receipt className="size-4" aria-hidden="true" />
            Teklif
          </h2>

          {request.quote === null ? (
            <p className="text-sm text-slate-600">
              Talebiniz inceleniyor. Fiyat teklifi hazır olduğunda burada görünecek ve size haber
              vereceğiz.
            </p>
          ) : (
            <>
              <p className="text-2xl font-bold text-brand-orange-600">
                {formatPrice(request.quote.amount)}
              </p>

              <DetailList
                rows={[
                  { term: 'Geçerlilik', value: formatDate(request.quote.validUntil) },
                  request.quote.note !== null && {
                    term: 'Not',
                    value: request.quote.note,
                    stacked: true,
                  },
                ]}
              />

              {/*
                Karar yalnızca teklif aşamasında verilir. Sunucu da aynı kuralı
                uygular; buradaki kontrol kullanıcıya yapamayacağı bir işlemi
                göstermemek içindir.
              */}
              {request.status === 'quoted' ? (
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <Button
                    className="w-full"
                    isLoading={respondToQuote.isPending}
                    onClick={() => {
                      respond('accept');
                    }}
                  >
                    Teklifi kabul et
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={respondToQuote.isPending}
                    onClick={() => {
                      respond('reject');
                    }}
                  >
                    Reddet
                  </Button>
                </div>
              ) : null}
            </>
          )}

          {isCancellable(request.status) ? (
            isCancelOpen ? (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <TextAreaField
                  label="İptal nedeni"
                  hint="İsteğe bağlı. Bize yardımcı olur."
                  rows={3}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                  }}
                />

                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    className="flex-1"
                    isLoading={cancelRequest.isPending}
                    onClick={handleCancel}
                  >
                    İptal et
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCancelOpen(false);
                      setReason('');
                    }}
                  >
                    Vazgeç
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-200 pt-4">
                <Button
                  variant="ghost"
                  className="w-full text-state-danger-fg hover:bg-state-danger-bg"
                  onClick={() => {
                    setCancelOpen(true);
                  }}
                >
                  Talebi iptal et
                </Button>
              </div>
            )
          ) : null}
        </Card>
      </div>
    </PageContainer>
  );
}
