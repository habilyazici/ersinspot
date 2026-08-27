/**
 * Sipariş tamamlama.
 *
 * Tutar, sunucunun kullandığı AYNI fonksiyonla hesaplanır
 * (`calculateOrderTotals`, paylaşılan pakette). İki taraf ayrı hesaplama
 * yazsaydı ekrandaki tutar ile tahsil edilen tutar ayrışabilirdi.
 *
 * Buradaki hesap yalnızca GÖSTERİM içindir. Bağlayıcı tutarı sunucu, kendi
 * veritabanından okuduğu fiyatlarla belirler; `expectedTotal` alanı ikisinin
 * uyuştuğunu doğrulamak için gönderilir. Uyuşmazsa sipariş reddedilir ve
 * kullanıcı güncel tutarı görür.
 */

import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, CreditCard, Store, Truck } from 'lucide-react';
import {
  APPOINTMENT_TIME_SLOTS,
  ApiError,
  DELIVERY_METHOD_LABELS,
  FREE_DELIVERY_THRESHOLD,
  LEAD_TIME_DAYS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  calculateOrderTotals,
  createOrderSchema,
  dateAfterDays,
  money,
} from '@ersinspot/shared';
import type { CreateOrderInput, IzmirDistrict } from '@ersinspot/shared';
import { AddressFields } from '@/components/ui/address-fields.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { RadioCards } from '@/components/ui/choice-field.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { FormSection, SelectField, TextAreaField, TextField } from '@/components/ui/form-field.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { findError } from '@/lib/form.ts';
import { formatPrice } from '@/lib/format.ts';
import { useAuth } from '@/features/auth';
import { OrderTotals, useCart, useCreateOrder } from '@/features/ordering';

/** Kaydedilmiş bir saat aralığı mı? Yöntem değişiminde değeri taşırken kullanılır. */
function isTimeSlot(value: unknown): value is { startTime: string; endTime: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { startTime?: unknown }).startTime === 'string' &&
    typeof (value as { endTime?: unknown }).endTime === 'string'
  );
}

type CheckoutValues = CreateOrderInput;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cart, isLoading } = useCart();
  const createOrder = useCreateOrder();

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      contact: { fullName: user?.fullName ?? '', phone: user?.phone ?? '' },
      delivery: {
        method: 'home_delivery',
        address: {
          // İlçe bilinçli olarak boş: seçim yapılana kadar "Seçiniz" görünür.
          neighborhood: '',
          street: '',
          buildingNo: '',
        },
        deliveryDate: dateAfterDays(LEAD_TIME_DAYS.delivery),
        deliveryTimeSlot: APPOINTMENT_TIME_SLOTS[0],
      },
      paymentMethod: 'cash_on_delivery',
      expectedTotal: 0,
    },
  });

  // Teslimat yöntemi ve ilçe değişince tutar yeniden hesaplanır.
  const deliveryMethod = useWatch({ control, name: 'delivery.method' });
  const district = useWatch({ control, name: 'delivery.address.district' });
  const paymentMethod = useWatch({ control, name: 'paymentMethod' });

  const selectedSlotStart =
    useWatch({
      control,
      name:
        deliveryMethod === 'store_pickup'
          ? 'delivery.pickupTimeSlot.startTime'
          : 'delivery.deliveryTimeSlot.startTime',
    }) ?? APPOINTMENT_TIME_SLOTS[0].startTime;

  /*
    Teslimat yöntemi değişince randevu alanları AD DEĞİŞTİRİR:
    `deliveryDate`/`deliveryTimeSlot` ile `pickupDate`/`pickupTimeSlot`.

    Şema ayrımlı birleşim olduğu için bu doğru: mağazadan alımda teslimat
    tarihi diye bir kavram yok. Ancak değer taşınmazsa ekranda dolu görünen
    alanlar form durumunda boş kalır ve gönderim sessizce reddedilir —
    kullanıcı neyin eksik olduğunu göremez. Bu yüzden seçim değiştiğinde
    değerler karşı kola kopyalanır.
  */
  useEffect(() => {
    const isPickup = deliveryMethod === 'store_pickup';

    const dateFrom = isPickup ? 'delivery.deliveryDate' : 'delivery.pickupDate';
    const dateTo = isPickup ? 'delivery.pickupDate' : 'delivery.deliveryDate';
    const slotFrom = isPickup ? 'delivery.deliveryTimeSlot' : 'delivery.pickupTimeSlot';
    const slotTo = isPickup ? 'delivery.pickupTimeSlot' : 'delivery.deliveryTimeSlot';

    const carriedDate: unknown = getValues(dateFrom as 'delivery.deliveryDate');
    setValue(
      dateTo as 'delivery.deliveryDate',
      typeof carriedDate === 'string' && carriedDate !== ''
        ? carriedDate
        : dateAfterDays(LEAD_TIME_DAYS.delivery),
    );

    const carriedSlot: unknown = getValues(slotFrom as 'delivery.deliveryTimeSlot');
    setValue(
      slotTo as 'delivery.deliveryTimeSlot',
      isTimeSlot(carriedSlot) ? carriedSlot : { ...APPOINTMENT_TIME_SLOTS[0] },
    );
  }, [deliveryMethod, getValues, setValue]);

  /**
   * Tutarlar.
   *
   * Sunucunun kullandığı aynı saf fonksiyon çağrılır; iki tarafın hesabı
   * yapısal olarak aynıdır.
   */
  const totals = useMemo(() => {
    if (cart === undefined) return null;

    const lines = cart.items
      .filter((item) => item.isAvailable)
      .map((item) => ({
        unitPrice: money.fromKurus(item.unitPrice),
        quantity: item.quantity,
      }));

    /*
      İlçe seçilmeden teslimat ücreti hesaplanamaz. Varsayılan alanda boş
      dizgedir (tip düzeyinde IzmirDistrict, çalışma anında ""), bu yüzden
      karşılaştırma dizge üzerinden yapılır. Seçim yapılana kadar mağazanın
      bulunduğu ilçe varsayılır; kullanıcı seçince tutar güncellenir.
    */
    const chosen: string | undefined = district;
    const selectedDistrict = (
      chosen === undefined || chosen === '' ? 'Buca' : chosen
    ) as IzmirDistrict;

    return calculateOrderTotals(lines, {
      method: deliveryMethod ?? 'home_delivery',
      district: selectedDistrict,
    });
  }, [cart, deliveryMethod, district]);

  if (isLoading) return <PageSpinner label="Sepet yükleniyor" />;

  if (cart === undefined || cart.items.length === 0) {
    return (
      <PageContainer width="prose">
        <EmptyState
          title="Sepetiniz boş"
          description="Sipariş verebilmek için önce sepetinize ürün ekleyin."
          action={
            <Button asChild>
              <Link to="/urunler">Ürünleri incele</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (cart.hasUnavailableItems) {
    return (
      <PageContainer width="prose">
        <EmptyState
          icon={AlertTriangle}
          title="Sepetinizde satışta olmayan ürün var"
          description="Sipariş verebilmek için bu ürünleri sepetinizden çıkarmanız gerekiyor."
          action={
            <Button asChild>
              <Link to="/sepet">Sepete dön</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  function onSubmit(values: CheckoutValues): void {
    if (totals === null) return;

    createOrder.mutate(
      // Ekranda gösterilen tutar; sunucu kendi hesabıyla karşılaştırır.
      { ...values, expectedTotal: totals.total },
      {
        onSuccess: (order) => {
          toast.success(`Siparişiniz alındı. Takip numaranız: ${order.referenceNumber}`);
          void navigate(`/hesabim/siparislerim/${order.orderId}`, { replace: true });
        },

        onError: (error) => {
          if (error instanceof ApiError) {
            for (const field of error.fields) {
              setError(field.path as keyof CheckoutValues, { message: field.message });
            }

            if (error.fields.length === 0) {
              setError('root', { message: error.message });
            }

            // Fiyat değiştiyse sepeti yeniden çekmek gerekir.
            if (error.code === 'resource_conflict') {
              toast.error(error.message);
            }
          } else {
            setError('root', { message: 'Sipariş oluşturulamadı. Lütfen tekrar deneyin.' });
          }
        },
      },
    );
  }

  const isHomeDelivery = deliveryMethod === 'home_delivery';

  return (
    <PageContainer width="form">
      <PageHeader
        backTo={{ to: '/sepet', label: 'Sepet' }}
        title="Siparişi Tamamla"
        description="Teslimat ve iletişim bilgilerinizi girin. Tutar, siparişi onayladığınızda kesinleşir."
      />

      <form
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]"
      >
        <div className="space-y-8">
          {errors.root === undefined ? null : (
            <div
              role="alert"
              className="rounded-lg bg-state-danger-bg px-4 py-3 text-sm text-state-danger-fg"
            >
              {errors.root.message}
            </div>
          )}

          {/* İletişim */}
          <FormSection legend="İletişim Bilgileri">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Ad Soyad"
                required
                autoComplete="name"
                error={errors.contact?.fullName?.message}
                {...register('contact.fullName')}
              />

              <TextField
                label="Telefon"
                required
                type="tel"
                autoComplete="tel"
                placeholder="0507 194 05 50"
                hint="Teslimat öncesi sizi bu numaradan arayacağız."
                error={errors.contact?.phone?.message}
                {...register('contact.phone')}
              />
            </div>
          </FormSection>

          <RadioCards
            legend="Teslimat Yöntemi"
            value={deliveryMethod}
            field={register('delivery.method')}
            options={[
              {
                value: 'home_delivery',
                icon: Truck,
                label: DELIVERY_METHOD_LABELS.home_delivery.label,
                description: DELIVERY_METHOD_LABELS.home_delivery.description,
              },
              {
                value: 'store_pickup',
                icon: Store,
                label: DELIVERY_METHOD_LABELS.store_pickup.label,
                description: DELIVERY_METHOD_LABELS.store_pickup.description,
              },
            ]}
          />

          {/* Adres — yalnızca adrese teslimatta */}
          {isHomeDelivery ? (
            <AddressFields
              register={register}
              errors={errors}
              prefix="delivery.address"
              legend="Teslimat Adresi"
            />
          ) : null}

          {/* Tarih ve saat */}
          <FormSection legend={isHomeDelivery ? 'Teslimat Zamanı' : 'Mağazadan Alım Zamanı'}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Tarih"
                required
                type="date"
                min={dateAfterDays(LEAD_TIME_DAYS.delivery)}
                hint="En erken iki gün sonrasına randevu verilebilir."
                error={findError(
                  errors,
                  isHomeDelivery ? 'delivery.deliveryDate' : 'delivery.pickupDate',
                )}
                {...register(isHomeDelivery ? 'delivery.deliveryDate' : 'delivery.pickupDate')}
              />

              {/*
                Saat aralığı tek seçimle iki alanı birden belirler.

                Başlangıç ve bitişi ayrı alanlarda tutmak veritabanı tarafında
                doğru (karşılaştırılabilir, sıralanabilir); kullanıcı ise aralığı
                bir bütün olarak seçer. Dönüşüm burada yapılır.
              */}
              <SelectField
                label="Saat Aralığı"
                required
                value={selectedSlotStart}
                onChange={(event) => {
                  const slot = APPOINTMENT_TIME_SLOTS.find(
                    (entry) => entry.startTime === event.target.value,
                  );
                  if (slot === undefined) return;

                  const path = isHomeDelivery
                    ? 'delivery.deliveryTimeSlot'
                    : 'delivery.pickupTimeSlot';

                  setValue(
                    `${path}.startTime` as 'delivery.deliveryTimeSlot.startTime',
                    slot.startTime,
                  );
                  setValue(`${path}.endTime` as 'delivery.deliveryTimeSlot.endTime', slot.endTime);
                }}
              >
                {APPOINTMENT_TIME_SLOTS.map((slot) => (
                  <option key={slot.startTime} value={slot.startTime}>
                    {slot.startTime} - {slot.endTime}
                  </option>
                ))}
              </SelectField>
            </div>
          </FormSection>

          <RadioCards
            legend="Ödeme Yöntemi"
            columns={1}
            value={paymentMethod}
            field={register('paymentMethod')}
            error={errors.paymentMethod?.message}
            options={PAYMENT_METHODS.map((method) => ({
              value: method,
              icon: CreditCard,
              label: PAYMENT_METHOD_LABELS[method].label,
              description: PAYMENT_METHOD_LABELS[method].description,
            }))}
          />

          <TextAreaField
            label="Sipariş Notu"
            hint="Eklemek istediğiniz bir şey varsa buraya yazabilirsiniz."
            error={errors.note?.message}
            {...register('note')}
          />
        </div>

        <Card padding="md" sticky className="space-y-4">
          <h2 className="font-semibold text-slate-900">Sipariş Özeti</h2>

          <ul className="space-y-2 border-b border-slate-200 pb-3">
            {cart.items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-700">{item.title}</span>
                <span className="shrink-0 font-medium">{formatPrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          {totals === null ? null : (
            <OrderTotals
              subtotal={totals.subtotal}
              deliveryFee={totals.deliveryFee}
              total={totals.total}
            />
          )}

          {isHomeDelivery && totals !== null && totals.deliveryFee > 0 ? (
            <p className="rounded-lg bg-brand-navy-50 px-3 py-2 text-xs text-brand-navy-800">
              {formatPrice(FREE_DELIVERY_THRESHOLD)} ve üzeri siparişlerde teslimat ücretsizdir.
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={isSubmitting || createOrder.isPending}
          >
            Siparişi Onayla
          </Button>

          <p className="text-xs text-slate-500">
            Siparişi onayladığınızda ürünler sizin için ayrılır ve en kısa sürede sizinle iletişime
            geçilir.
          </p>
        </Card>
      </form>
    </PageContainer>
  );
}
