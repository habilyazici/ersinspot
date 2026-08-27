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
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ImageOff, MapPin, Package, ShoppingBag, Store, Truck } from 'lucide-react';
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
import { Card, DetailList, Timeline } from '@/components/ui/card.tsx';
import { PageContainer, PageHeader, Section } from '@/components/ui/page.tsx';
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
import { OrderTotals, useCancelOrder, useOrder } from '@/features/ordering';

/** Müşteri bu siparişi kendisi iptal edebilir mi? Kural sunucuyla ortak. */
function isCancellable(status: OrderStatus): boolean {
  return (CUSTOMER_CANCELLABLE_ORDER_STATUSES as readonly OrderStatus[]).includes(status);
}

export default function OrderDetailPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(orderId);
  const cancelOrder = useCancelOrder();

  const [isCancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (isLoading) return <PageSpinner label="Sipariş yükleniyor" />;

  if (isError || order === undefined) {
    return (
      <PageContainer width="prose">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </PageContainer>
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
    <PageContainer>
      <PageHeader
        backTo={{ to: '/hesabim/siparislerim', label: 'Siparişlerim' }}
        title="Sipariş Detayı"
        meta={
          <>
            <span className="font-mono">{order.referenceNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(order.createdAt)}</span>
          </>
        }
        aside={<StatusBadge meta={statusMeta} withDescription />}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-8">
          {/* Kalemler */}
          <Section title="Ürünler" icon={ShoppingBag}>
            <ul className="space-y-3">
              {order.items.map((item) => (
                <Card as="li" key={item.id} className="flex gap-4">
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
                </Card>
              ))}
            </ul>
          </Section>

          <Section
            title={DELIVERY_METHOD_LABELS[order.deliveryMethod].label}
            icon={isPickup ? Store : Truck}
          >
            <Card>
              <DetailList
                rows={[
                  order.deliveryAddress !== null && {
                    term: 'Adres',
                    value: (
                      <span className="flex gap-2">
                        <MapPin
                          className="mt-0.5 size-4 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                        {formatAddress(order.deliveryAddress)}
                      </span>
                    ),
                    stacked: true,
                  },
                  {
                    term: isPickup ? 'Alım günü' : 'Teslimat günü',
                    value: order.deliveryDate === null ? '—' : formatDate(order.deliveryDate),
                  },
                  { term: 'Saat aralığı', value: formatTimeSlot(order.deliveryTimeSlot) },
                  {
                    term: 'İletişim',
                    value: `${order.contactName} · ${order.contactPhone}`,
                  },
                  {
                    term: 'Ödeme',
                    value: PAYMENT_METHOD_LABELS[order.paymentMethod].label,
                  },
                  order.note !== null && { term: 'Notunuz', value: order.note, stacked: true },
                ]}
              />
            </Card>
          </Section>

          <Section title="Sipariş Geçmişi" icon={Package}>
            <Timeline
              formatTime={formatDateTime}
              events={order.timeline.map((event) => ({
                label: ORDER_STATUS_LABELS[event.status].label,
                occurredAt: event.occurredAt,
                note: event.note,
              }))}
            />
          </Section>
        </div>

        <Card padding="md" sticky className="space-y-4">
          <h2 className="font-semibold text-slate-900">Tutar</h2>

          <OrderTotals
            subtotal={order.subtotal}
            deliveryFee={order.deliveryFee}
            total={order.total}
          />

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
        </Card>
      </div>
    </PageContainer>
  );
}
