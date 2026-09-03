/**
 * Yönetim — sipariş detayı.
 *
 * Müşterinin gördüğü sayfayla aynı bilgiyi aynı düzende gösterir; ek olarak
 * DURUM İLERLETME kutusu vardır.
 *
 * Sunulan durum seçenekleri paylaşılan geçiş haritasından üretilir
 * (`ORDER_STATUS_TRANSITIONS`). Elle liste yazılsaydı sunucunun kabul ettiği
 * geçişlerle ayrışabilir ve personel reddedilecek bir seçeneği tıklayabilirdi.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ImageOff, MapPin, NotebookPen, Package, ShoppingBag, Store, Truck } from 'lucide-react';
import {
  ApiError,
  DELIVERY_METHOD_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_METHOD_LABELS,
  PRODUCT_CONDITION_LABELS,
} from '@ersinspot/shared';
import type { OrderStatus } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card, DetailList, Timeline } from '@/components/ui/card.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { SelectField, TextAreaField } from '@/components/ui/form-field.tsx';
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
import {
  OrderTotals,
  useOrder,
  useSetOrderStaffNote,
  useUpdateOrderStatus,
} from '@/features/ordering';

export default function AdminOrderDetailPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const saveStaffNote = useSetOrderStaffNote();

  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');

  /*
    Personel notu kutusu kontrollüdür ve yüklenen siparişten doldurulur.

    Doldurma render sırasında, hangi siparişin yüklendiği karşılaştırılarak
    yapılır — React'in "prop değişince state'i ayarla" için önerdiği kalıp.
    Kaydet düğmesi yalnızca metin değiştiğinde etkinleşir; boşaltıp kaydetmek
    notu siler, ki yanlışlıkla yazılmış bir not kaldırılabilsin.
  */
  const [staffNote, setStaffNote] = useState('');
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);

  if (order !== undefined && order.id !== loadedOrderId) {
    setLoadedOrderId(order.id);
    setStaffNote(order.staffNote ?? '');
  }

  if (isLoading) return <PageSpinner label="Sipariş yükleniyor" />;

  if (isError || order === undefined) {
    return (
      <PageContainer width="prose">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  const isPickup = order.deliveryMethod === 'store_pickup';
  const allowed = ORDER_STATUS_TRANSITIONS[order.status];

  function applyStatus(): void {
    if (nextStatus === '') return;

    updateStatus.mutate(
      { orderId, status: nextStatus, ...(note.trim() === '' ? {} : { note: note.trim() }) },
      {
        onSuccess: () => {
          toast.success(
            `Sipariş durumu "${ORDER_STATUS_LABELS[nextStatus].label}" olarak güncellendi.`,
          );
          setNextStatus('');
          setNote('');
        },
        onError: (statusError) => {
          toast.error(
            statusError instanceof ApiError
              ? statusError.message
              : 'Durum güncellenemedi. Lütfen tekrar deneyin.',
          );
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        backTo={{ to: '/yonetim/siparisler', label: 'Siparişler' }}
        title="Sipariş"
        meta={
          <>
            <span className="font-mono">{order.referenceNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(order.createdAt)}</span>
          </>
        }
        aside={<StatusBadge meta={ORDER_STATUS_LABELS[order.status]} withDescription />}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-8">
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
                    <p className="font-medium text-slate-900">{item.titleSnapshot}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {PRODUCT_CONDITION_LABELS[item.conditionSnapshot].label}
                      {item.quantity > 1 ? ` · ${item.quantity} adet` : ''}
                      {item.productId === null ? ' · ürün kaydı silinmiş' : ''}
                    </p>
                  </div>

                  <p className="shrink-0 self-center font-semibold tabular-nums text-slate-900">
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
                  { term: 'Müşteri', value: `${order.contactName} · ${order.contactPhone}` },
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
                  { term: 'Ödeme', value: PAYMENT_METHOD_LABELS[order.paymentMethod].label },
                  order.note !== null && {
                    term: 'Müşteri notu',
                    value: order.note,
                    stacked: true,
                  },
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

        <div className="space-y-4">
          <Card padding="md" sticky className="space-y-4">
            <h2 className="font-semibold text-slate-900">Tutar</h2>

            <OrderTotals
              subtotal={order.subtotal}
              deliveryFee={order.deliveryFee}
              total={order.total}
            />

            {/*
              Seçenekler paylaşılan geçiş haritasından gelir; sunucunun kabul
              ettiği kümeyle aynıdır. Terminal durumlarda ("teslim edildi",
              "iptal edildi") liste boştur ve kutu hiç gösterilmez.
            */}
            {allowed.length === 0 ? (
              <p className="border-t border-slate-200 pt-4 text-sm text-slate-600">
                Bu sipariş kapandı; durumu değiştirilemez.
              </p>
            ) : (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <SelectField
                  label="Durumu ilerlet"
                  value={nextStatus}
                  onChange={(event) => {
                    setNextStatus(event.target.value as OrderStatus | '');
                  }}
                >
                  <option value="">Seçiniz</option>
                  {allowed.map((value) => (
                    <option key={value} value={value}>
                      {ORDER_STATUS_LABELS[value].label}
                    </option>
                  ))}
                </SelectField>

                <TextAreaField
                  label="Not"
                  rows={3}
                  hint="Müşteri sipariş geçmişinde görür."
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value);
                  }}
                />

                <Button
                  className="w-full"
                  disabled={nextStatus === ''}
                  isLoading={updateStatus.isPending}
                  onClick={applyStatus}
                >
                  Durumu güncelle
                </Button>
              </div>
            )}
          </Card>

          {/* ---------------------------------------------------------------
              Personel notu — müşteriye gitmez
              --------------------------------------------------------------- */}
          <Card padding="md" className="space-y-3">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <NotebookPen className="size-4" aria-hidden="true" />
              Personel Notu
            </h2>

            <TextAreaField
              label="Not"
              rows={3}
              hint="Yalnızca personel görür; müşteriye giden yanıtlarda yer almaz. Boşaltıp kaydetmek notu siler."
              value={staffNote}
              onChange={(event) => {
                setStaffNote(event.target.value);
              }}
            />

            <Button
              variant="outline"
              className="w-full"
              disabled={staffNote === (order.staffNote ?? '')}
              isLoading={saveStaffNote.isPending}
              onClick={() => {
                saveStaffNote.mutate(
                  { orderId, note: staffNote.trim() },
                  {
                    onSuccess: () => {
                      toast.success(staffNote.trim() === '' ? 'Not silindi.' : 'Not kaydedildi.');
                    },
                    onError: (failure) => {
                      toast.error(
                        failure instanceof ApiError ? failure.message : 'Not kaydedilemedi.',
                      );
                    },
                  },
                );
              }}
            >
              Notu kaydet
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
