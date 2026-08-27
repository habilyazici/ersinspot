/**
 * Nakliye talebi.
 *
 * Formdaki tutar BAĞLAYICI DEĞİLDİR: bir tahmindir. Bağlayıcı fiyat, personel
 * talebi inceledikten sonra verdiği tekliftir. Bu ayrım ekranda açıkça yazılır
 * — eski sitede hesaplanan tutar "fiyat" olarak sunuluyordu ve müşteri farklı
 * bir rakamla karşılaşınca haklı olarak itiraz ediyordu.
 *
 * Tahmin, sunucunun kullandığı AYNI paylaşılan fonksiyonla hesaplanır
 * (`estimateMoving`). İki taraf ayrı hesap yazsaydı ekrandaki tahmin ile
 * kayda geçen tahmin ayrışırdı.
 */

import { useMemo } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Plus, Trash2, Truck } from 'lucide-react';
import {
  ApiError,
  COMMON_MOVING_ITEMS,
  HOUSE_SIZES,
  HOUSE_SIZE_LABELS,
  MOVING_ASSEMBLY_FEE,
  MOVING_PACKING_FEE,
  createMovingRequestSchema,
  estimateMoving,
} from '@ersinspot/shared';
import type { CreateMovingRequestInput } from '@ersinspot/shared';
import { AddressFields } from '@/components/ui/address-fields.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { CheckboxField } from '@/components/ui/choice-field.tsx';
import { FormSection, SelectField, TextAreaField, TextField } from '@/components/ui/form-field.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { findError } from '@/lib/form.ts';
import { formatPrice } from '@/lib/format.ts';
import { useAuth } from '@/features/auth';
import { useCreateMovingRequest } from '@/features/servicing';

type MovingValues = CreateMovingRequestInput;

/** En erken taşınma günü: hazırlık için üç gün. */
function earliestMovingDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 3);
  return date.toISOString().slice(0, 10);
}

export default function MovingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createRequest = useCreateMovingRequest();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MovingValues>({
    resolver: zodResolver(createMovingRequestSchema),
    defaultValues: {
      contact: { fullName: user?.fullName ?? '', phone: user?.phone ?? '' },
      houseSize: '2+1',
      fromLocation: {
        address: { neighborhood: '', street: '', buildingNo: '' },
        floor: 0,
        hasElevator: false,
      },
      toLocation: {
        address: { neighborhood: '', street: '', buildingNo: '' },
        floor: 0,
        hasElevator: false,
      },
      preferredDate: earliestMovingDate(),
      items: [{ name: COMMON_MOVING_ITEMS[0], quantity: 1, needsDisassembly: false }],
      needsPacking: false,
      needsAssembly: false,
      photos: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Tahmini etkileyen her alan izlenir; değiştikçe tutar güncellenir.
  const watched = useWatch({ control });

  /**
   * Tahmini tutar.
   *
   * Sunucunun kullandığı aynı saf fonksiyon çağrılır. Kat bilgisi metin
   * girdisinden geldiği için sayıya çevrilir; boş veya geçersizse 0 sayılır.
   */
  const estimate = useMemo(() => {
    const toFloorNumber = (value: unknown): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return estimateMoving({
      houseSize: watched.houseSize ?? '2+1',
      fromFloor: toFloorNumber(watched.fromLocation?.floor),
      fromHasElevator: watched.fromLocation?.hasElevator ?? false,
      toFloor: toFloorNumber(watched.toLocation?.floor),
      toHasElevator: watched.toLocation?.hasElevator ?? false,
      itemCount: watched.items?.length ?? 0,
      needsPacking: watched.needsPacking ?? false,
      needsAssembly: watched.needsAssembly ?? false,
    });
  }, [watched]);

  function onSubmit(values: MovingValues): void {
    createRequest.mutate(values, {
      onSuccess: (request) => {
        toast.success(`Talebiniz alındı. Takip numaranız: ${request.referenceNumber}`);
        void navigate(`/hesabim/taleplerim/${request.requestId}`, { replace: true });
      },

      onError: (error) => {
        if (error instanceof ApiError) {
          for (const field of error.fields) {
            setError(field.path as keyof MovingValues, { message: field.message });
          }

          if (error.fields.length === 0) {
            setError('root', { message: error.message });
          }
        } else {
          setError('root', { message: 'Talep oluşturulamadı. Lütfen tekrar deneyin.' });
        }
      },
    });
  }

  return (
    <PageContainer width="form">
      <PageHeader
        title="Evden Eve Nakliyat"
        description="Taşınma bilgilerinizi girin, size hemen bir tahmini tutar gösterelim. Kesin fiyat, ekibimiz talebinizi inceledikten sonra teklif olarak iletilir."
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
                hint="Keşif ve teklif için sizi bu numaradan arayacağız."
                error={errors.contact?.phone?.message}
                {...register('contact.phone')}
              />
            </div>
          </FormSection>

          <FormSection legend="Taşınma Bilgileri">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Ev Büyüklüğü"
                required
                hint="Tahmini tutarın temelini bu belirler."
                error={errors.houseSize?.message}
                {...register('houseSize')}
              >
                {HOUSE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {HOUSE_SIZE_LABELS[size]}
                  </option>
                ))}
              </SelectField>

              <TextField
                label="Tercih Ettiğiniz Tarih"
                required
                type="date"
                min={earliestMovingDate()}
                hint="Kesin randevu, teklifi onayladıktan sonra verilir."
                error={errors.preferredDate?.message}
                {...register('preferredDate')}
              />
            </div>
          </FormSection>

          {/*
            İki adres aynı bileşenle alınır. `servicedOnly`: nakliye yalnızca
            hizmet verilen ilçelerde yapılır; listede olmayan bir ilçe
            seçilemez.
          */}
          <div className="space-y-4">
            <AddressFields
              register={register}
              errors={errors}
              prefix="fromLocation.address"
              servicedOnly
              legend="Çıkış Adresi"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Kat"
                required
                type="number"
                min={-3}
                max={50}
                hint="Zemin kat için 0, bodrum için eksi değer."
                error={findError(errors, 'fromLocation.floor')}
                {...register('fromLocation.floor', { valueAsNumber: true })}
              />

              <CheckboxField
                label="Binada asansör var"
                hint="Asansör, kat farkından doğan ücreti azaltır."
                className="self-end pb-2"
                {...register('fromLocation.hasElevator')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <AddressFields
              register={register}
              errors={errors}
              prefix="toLocation.address"
              servicedOnly
              legend="Varış Adresi"
            />

            {/* Çıkış ve varış adresinin aynı olamayacağı kuralı buraya raporlanır. */}
            {findError(errors, 'toLocation') === undefined ? null : (
              <p className="text-sm text-red-600">{findError(errors, 'toLocation')}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Kat"
                required
                type="number"
                min={-3}
                max={50}
                hint="Zemin kat için 0, bodrum için eksi değer."
                error={findError(errors, 'toLocation.floor')}
                {...register('toLocation.floor', { valueAsNumber: true })}
              />

              <CheckboxField
                label="Binada asansör var"
                className="self-end pb-2"
                {...register('toLocation.hasElevator')}
              />
            </div>
          </div>

          <FormSection
            legend="Taşınacak Eşyalar"
            description="Her kalem tahmini tutara eklenir. Listeyi eksiksiz vermeniz, teklifin gerçeğe yakın olmasını sağlar."
          >
            <ul className="space-y-3">
              {fields.map((field, index) => (
                <Card as="li" key={field.id} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_6rem_auto]">
                    <SelectField
                      label="Eşya"
                      required
                      error={findError(errors, `items.${String(index)}.name`)}
                      {...register(`items.${index}.name` as const)}
                    >
                      {COMMON_MOVING_ITEMS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </SelectField>

                    <TextField
                      label="Adet"
                      required
                      type="number"
                      min={1}
                      max={99}
                      error={findError(errors, `items.${String(index)}.quantity`)}
                      {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="self-end text-state-danger-fg"
                      // Son kalem silinemez: şema en az bir eşya ister.
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 aria-hidden="true" />
                      <span className="sr-only">Bu eşyayı listeden çıkar</span>
                    </Button>
                  </div>

                  <CheckboxField
                    label="Sökülüp takılması gerekiyor"
                    {...register(`items.${index}.needsDisassembly` as const)}
                  />
                </Card>
              ))}
            </ul>

            {errors.items?.message === undefined ? null : (
              <p className="text-sm text-red-600">{errors.items.message}</p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={fields.length >= 100}
              onClick={() =>
                append({ name: COMMON_MOVING_ITEMS[0], quantity: 1, needsDisassembly: false })
              }
            >
              <Plus aria-hidden="true" />
              Eşya ekle
            </Button>
          </FormSection>

          <FormSection legend="Ek Hizmetler">
            <CheckboxField
              label={`Ambalajlama hizmeti istiyorum (+${formatPrice(MOVING_PACKING_FEE)})`}
              hint="Eşyalarınız ekibimiz tarafından paketlenir."
              {...register('needsPacking')}
            />

            <CheckboxField
              label={`Montaj hizmeti istiyorum (+${formatPrice(MOVING_ASSEMBLY_FEE)})`}
              hint="Sökülen mobilyalar yeni adreste kurulur."
              {...register('needsAssembly')}
            />
          </FormSection>

          <TextAreaField
            label="Eklemek İstedikleriniz"
            hint="Dar sokak, park sorunu, kırılacak eşya gibi bilmemiz gerekenler."
            error={errors.customerNote?.message}
            {...register('customerNote')}
          />
        </div>

        <Card padding="md" sticky className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Truck className="size-4" aria-hidden="true" />
            Tahmini Tutar
          </h2>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Temel ücret</dt>
              <dd className="font-medium text-slate-900">{formatPrice(estimate.basePrice)}</dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Kat farkı</dt>
              <dd className="font-medium text-slate-900">{formatPrice(estimate.floorSurcharge)}</dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Eşya ({fields.length} kalem)</dt>
              <dd className="font-medium text-slate-900">{formatPrice(estimate.itemSurcharge)}</dd>
            </div>

            {estimate.packingFee === 0 ? null : (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Ambalajlama</dt>
                <dd className="font-medium text-slate-900">{formatPrice(estimate.packingFee)}</dd>
              </div>
            )}

            {estimate.assemblyFee === 0 ? null : (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Montaj</dt>
                <dd className="font-medium text-slate-900">{formatPrice(estimate.assemblyFee)}</dd>
              </div>
            )}

            <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-base">
              <dt className="font-semibold text-slate-900">Tahmin</dt>
              <dd className="font-bold text-brand-orange-600">{formatPrice(estimate.total)}</dd>
            </div>
          </dl>

          {/*
            Bu uyarı kaldırılmamalıdır. Tahmini bağlayıcı fiyat sanan müşteri,
            teklif farklı geldiğinde haklı olarak itiraz eder.
          */}
          <p className="flex gap-2 rounded-lg bg-brand-navy-50 px-3 py-2 text-xs text-brand-navy-800">
            <Building2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Bu bir tahmindir, bağlayıcı değildir. Kesin fiyat, ekibimiz talebinizi inceledikten
            sonra teklif olarak iletilir.
          </p>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={isSubmitting || createRequest.isPending}
          >
            Talep Oluştur
          </Button>
        </Card>
      </form>
    </PageContainer>
  );
}
