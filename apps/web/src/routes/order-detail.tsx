/**
 * Sipariş detayı.
 *
 * Sipariş akışının son halkası: ödeme sayfası buraya yönlendirir, siparişlerim
 * listesi buraya bağlanır. Denetimde bu sayfanın hiç yazılmadığı, iki
 * bağlantının da 404'e düştüğü görüldü.
 *
 * Gösterilen kalem bilgisi ürünün GÜNCEL hâli değil, sipariş anındaki
 * kopyasıdır (`titleSnapshot`, `unitPrice`). Ürün sonradan silinse veya fiyatı
 * değişse bile müşterinin gördüğü geçmiş bozulmaz.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ImageOff, MapPin, Package, Store, Truck } from 'lucide-react';
import {
  ApiError,
  CUSTOMER_CANCELLABLE_ORDER_STATUSES,
  DELIVERY_METHOD_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PRODUCT_CONDITION_LABELS,
} from '@ersinspot/shared';
import type { OrderStatus } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { TextAreaField } from '@/components/ui/form-field.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import {
  formatAddress,
  formatDate,
  formatDateTime,
  formatPrice,
  formatTimeSlot,
} from '@/lib/format.ts';
import { useCancelOrder, useOrder } from '@/features/ordering';

/** Müşteri bu siparişi kendisi iptal edebilir mi? Kural sunucuyla ortak. */
function isCancellable(status: OrderStatus): boolean {
  return (CUSTOMER_CANCELLABLE_ORDER_STATUSES as readonly OrderStatus[]).includes(status);
}

export default function OrderDetailPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError, error, refetch } = useOrder(orderId);
  const cancelOrder = useCancelOrder();

  const [isCancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (isLoading) return <PageSpinner label="Sipariş yükleniyor" />;

  if (isError || order === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const statusMeta = ORDER_STATUS_LABELS[order.status];
  const isPickup = order.deliveryMethod === 'store_pickup';

  function handleCancel(): void {
    cancelOrder.mutate(
      { orderId, ...(reason.trim() === '' ? {} : { reason: reason.trim() }) },
      {
        onSuccess: () => {
          toast.success('Siparişiniz iptal edildi.');
          setCancelOpen(false);
        },
        onError: (cancelError) => {
          toast.error(
            cancelError instanceof ApiError
              ? cancelError.message
              : 'Sipariş iptal edilemedi. Lütfen tekrar deneyin.',
          );
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => void navigate('/hesabim/siparislerim')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Siparişlerim
      </button>

      {/* Başlık */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sipariş Detayı</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">{order.referenceNumber}</p>
          <p className="mt-0.5 text-sm text-slate-500">{formatDate(order.createdAt)}</p>
        </div>

        <StatusBadge meta={statusMeta} withDescription />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-8">
          {/* Kalemler */}
          <section>
            <h2 className="text-sm font-semibold text-slate-900">Ürünler</h2>

            <ul className="mt-3 space-y-3">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {item.imageUrlSnapshot === null ? (
                      <div className="flex h-full items-center justify-center">
                        <ImageOff className="size-5 text-slate-300" aria-hidden="true" />
                      </div>
                    ) : (
                      <img
                        src={item.imageUrlSnapshot}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/*
                      Ürüne bağlantı verilmez. Ürün detayı slug ile açılır, sipariş
                      kalemi ise kimlik tutar; ayrıca satılmış ürün vitrinden
                      kalktığı için bağlantı çoğu zaman 404 verirdi. Burada
                      gösterilmesi gereken zaten sipariş anındaki kopyadır.
                    */}
                    <p className="font-medium text-slate-900">{item.titleSnapshot}</p>

                    <p className="mt-1 text-xs text-slate-500">
                      {PRODUCT_CONDITION_LABELS[item.conditionSnapshot].label}
                      {item.quantity > 1 ? ` · ${item.quantity} adet` : ''}
                    </p>
                  </div>

                  <p className="shrink-0 self-center font-semibold text-slate-900">
                    {formatPrice(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Teslimat */}
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {isPickup ? (
                <Store className="size-4" aria-hidden="true" />
              ) : (
                <Truck className="size-4" aria-hidden="true" />
              )}
              {DELIVERY_METHOD_LABELS[order.deliveryMethod].label}
            </h2>

            <dl className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
              {order.deliveryAddress === null ? null : (
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Adres</dt>
                    <dd className="text-slate-700">{formatAddress(order.deliveryAddress)}</dd>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">{isPickup ? 'Alım günü' : 'Teslimat günü'}</dt>
                <dd className="text-right font-medium text-slate-900">
                  {order.deliveryDate === null ? '—' : formatDate(order.deliveryDate)}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Saat aralığı</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formatTimeSlot(order.deliveryTimeSlot)}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">İletişim</dt>
                <dd className="text-right font-medium text-slate-900">
                  {order.contactName} · {order.contactPhone}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Ödeme</dt>
                <dd className="text-right font-medium text-slate-900">
                  {PAYMENT_METHOD_LABELS[order.paymentMethod].label}
                </dd>
              </div>

              {order.note === null ? null : (
                <div className="border-t border-slate-100 pt-2">
                  <dt className="text-slate-600">Notunuz</dt>
                  <dd className="mt-0.5 text-slate-700">{order.note}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Durum geçmişi */}
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Package className="size-4" aria-hidden="true" />
              Sipariş Geçmişi
            </h2>

            <ol className="mt-3 space-y-4 border-l-2 border-slate-200 pl-5">
              {order.timeline.map((event, index) => (
                <li key={`${event.status}-${event.occurredAt}`} className="relative">
                  <span
                    className={
                      // Son olay güncel durumdur; vurgulanır.
                      index === order.timeline.length - 1
                        ? 'absolute -left-[27px] top-1 size-3 rounded-full bg-brand-orange-500 ring-4 ring-brand-orange-100'
                        : 'absolute -left-[25px] top-1.5 size-2 rounded-full bg-slate-300'
                    }
                    aria-hidden="true"
                  />

                  <p className="text-sm font-medium text-slate-900">
                    {ORDER_STATUS_LABELS[event.status].label}
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(event.occurredAt)}</p>
                  {event.note === null ? null : (
                    <p className="mt-1 text-sm text-slate-600">{event.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Özet */}
        <aside className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
          <h2 className="font-semibold text-slate-900">Tutar</h2>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Ara toplam</dt>
              <dd className="font-medium">{formatPrice(order.subtotal)}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-slate-600">Teslimat</dt>
              <dd className="font-medium">
                {order.deliveryFee === 0 ? (
                  <span className="text-brand-teal-700">Ücretsiz</span>
                ) : (
                  formatPrice(order.deliveryFee)
                )}
              </dd>
            </div>

            <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
              <dt className="font-semibold text-slate-900">Toplam</dt>
              <dd className="font-bold text-brand-orange-600">{formatPrice(order.total)}</dd>
            </div>
          </dl>

          {/*
            İptal yalnızca hazırlığa geçilmeden önce mümkün. Aynı kural sunucuda
            da uygulanır; buradaki kontrol yalnızca kullanıcıya yapamayacağı bir
            işlemi göstermemek içindir.
          */}
          {isCancellable(order.status) ? (
            isCancelOpen ? (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <TextAreaField
                  label="İptal nedeni"
                  hint="İsteğe bağlı. Bize yardımcı olur."
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />

                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    className="flex-1"
                    isLoading={cancelOrder.isPending}
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
                  onClick={() => setCancelOpen(true)}
                >
                  Siparişi iptal et
                </Button>
              </div>
            )
          ) : null}
        </aside>
      </div>
    </div>
  );
}
