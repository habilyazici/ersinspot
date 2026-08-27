/**
 * Teknik servis talebi.
 *
 * Keşif ücreti PEŞİNEN bildirilir ve onaylatılır. Eski sitede ücret hiçbir
 * yerde yazmıyordu; teknisyen kapıya gidince öğrenilen bir masraf, haklı
 * şikâyet üretir. Onay kutusu şemada da zorunludur — arayüzden kaldırılsa
 * sunucu yine reddeder.
 */

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Info, Wrench } from 'lucide-react';
import {
  ApiError,
  DEVICE_TYPES,
  DEVICE_TYPE_LABELS,
  INSPECTION_FEE,
  PROBLEM_CATEGORIES,
  PROBLEM_CATEGORY_LABELS,
  WARRANTY_STATUSES,
  WARRANTY_STATUS_LABELS,
  createTechnicalServiceRequestSchema,
} from '@ersinspot/shared';
import type { CreateTechnicalServiceRequestInput } from '@ersinspot/shared';
import { AddressFields } from '@/components/ui/address-fields.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { CheckboxField } from '@/components/ui/choice-field.tsx';
import { FormSection, SelectField, TextAreaField, TextField } from '@/components/ui/form-field.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { PhotoUpload } from '@/components/ui/photo-upload.tsx';
import { findError } from '@/lib/form.ts';
import { formatPrice } from '@/lib/format.ts';
import { useAuth } from '@/features/auth';
import { useCreateTechnicalServiceRequest } from '@/features/servicing';

type TechnicalServiceValues = CreateTechnicalServiceRequestInput;

/** En erken keşif günü: ekibin planlama yapabilmesi için iki gün. */
function earliestVisitDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 2);
  return date.toISOString().slice(0, 10);
}

export default function TechnicalServicePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createRequest = useCreateTechnicalServiceRequest();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TechnicalServiceValues>({
    resolver: zodResolver(createTechnicalServiceRequestSchema),
    defaultValues: {
      contact: { fullName: user?.fullName ?? '', phone: user?.phone ?? '' },
      deviceType: 'refrigerator',
      brand: '',
      warrantyStatus: 'unknown',
      problemCategory: 'not_powering_on',
      problemDescription: '',
      address: { neighborhood: '', street: '', buildingNo: '' },
      preferredDate: earliestVisitDate(),
      photos: [],
      acceptedInspectionFee: false,
    },
  });

  const deviceType = useWatch({ control, name: 'deviceType' });
  const photos = useWatch({ control, name: 'photos' }) ?? [];

  function onSubmit(values: TechnicalServiceValues): void {
    createRequest.mutate(values, {
      onSuccess: (request) => {
        toast.success(`Talebiniz alındı. Takip numaranız: ${request.referenceNumber}`);
        void navigate(`/hesabim/taleplerim/${request.requestId}`, { replace: true });
      },

      onError: (error) => {
        if (error instanceof ApiError) {
          for (const field of error.fields) {
            setError(field.path as keyof TechnicalServiceValues, { message: field.message });
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
        title="Teknik Servis"
        description="Arızalı cihazınızı anlatın, ekibimiz keşif için size gelsin. Onarım fiyatı, arıza yerinde görüldükten sonra teklif olarak iletilir."
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
                hint="Keşif randevusu için sizi bu numaradan arayacağız."
                error={errors.contact?.phone?.message}
                {...register('contact.phone')}
              />
            </div>
          </FormSection>

          <FormSection legend="Cihaz Bilgileri">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Cihaz Türü"
                required
                error={errors.deviceType?.message}
                {...register('deviceType')}
              >
                {DEVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DEVICE_TYPE_LABELS[type]}
                  </option>
                ))}
              </SelectField>

              {/* "Diğer" seçilince cihaz adı zorunlu hale gelir; kural şemada. */}
              {deviceType === 'other' ? (
                <TextField
                  label="Cihaz Adı"
                  required
                  placeholder="Örn. Ütü, Su Arıtma"
                  error={errors.customDeviceType?.message}
                  {...register('customDeviceType')}
                />
              ) : null}

              <TextField
                label="Marka"
                required
                placeholder="Arçelik, Bosch, Vestel…"
                error={errors.brand?.message}
                {...register('brand')}
              />

              <TextField
                label="Model"
                hint="Cihazın üzerindeki etikette yazar. Bilmiyorsanız boş bırakın."
                error={errors.model?.message}
                {...register('model')}
              />

              <SelectField
                label="Garanti Durumu"
                error={errors.warrantyStatus?.message}
                {...register('warrantyStatus')}
              >
                {WARRANTY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {WARRANTY_STATUS_LABELS[status]}
                  </option>
                ))}
              </SelectField>
            </div>
          </FormSection>

          <FormSection legend="Arıza">
            <SelectField
              label="Arıza Türü"
              required
              error={errors.problemCategory?.message}
              {...register('problemCategory')}
            >
              {PROBLEM_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {PROBLEM_CATEGORY_LABELS[category]}
                </option>
              ))}
            </SelectField>

            <TextAreaField
              label="Arıza Açıklaması"
              required
              rows={5}
              hint="Ne zaman başladı, hangi durumda oluyor, bir ses veya hata kodu var mı? Ne kadar ayrıntı verirseniz keşif o kadar hızlı sonuçlanır."
              error={errors.problemDescription?.message}
              {...register('problemDescription')}
            />

            <PhotoUpload
              label="Fotoğraflar"
              purpose="request_photo"
              value={photos}
              onChange={(next) => {
                setValue('photos', next, { shouldValidate: true });
              }}
              max={10}
              hint="İsteğe bağlı. Arızanın veya hata kodunun fotoğrafı işimizi kolaylaştırır."
              error={findError(errors, 'photos')}
            />
          </FormSection>

          {/* Teknik servis yalnızca hizmet verilen ilçelerde yapılır. */}
          <AddressFields
            register={register}
            errors={errors}
            prefix="address"
            servicedOnly
            legend="Cihazın Bulunduğu Adres"
          />

          <FormSection legend="Randevu Tercihi">
            <TextField
              label="Tercih Ettiğiniz Tarih"
              required
              type="date"
              min={earliestVisitDate()}
              hint="Kesin randevu, talebiniz incelendikten sonra size bildirilir."
              error={errors.preferredDate?.message}
              {...register('preferredDate')}
            />
          </FormSection>

          <TextAreaField
            label="Eklemek İstedikleriniz"
            hint="Kapıda zil çalışmıyor, köpek var gibi bilmemiz gerekenler."
            error={errors.customerNote?.message}
            {...register('customerNote')}
          />
        </div>

        <Card padding="md" sticky className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Wrench className="size-4" aria-hidden="true" />
            Keşif Ücreti
          </h2>

          <p className="text-2xl font-bold text-brand-orange-600">{formatPrice(INSPECTION_FEE)}</p>

          <p className="text-sm text-slate-600">
            Teknisyenimizin adresinize gelip arızayı yerinde incelemesinin ücretidir. Onarımı bize
            yaptırmanız hâlinde bu tutar toplam fiyattan düşülür.
          </p>

          {/*
            Onay şemada da zorunludur. Buradan kaldırılsa sunucu talebi yine
            reddeder — ücretin görülmeden kabul edilmesi mümkün değildir.
          */}
          <div className="border-t border-slate-200 pt-4">
            <CheckboxField
              label={`${formatPrice(INSPECTION_FEE)} keşif ücretini kabul ediyorum`}
              error={errors.acceptedInspectionFee?.message}
              {...register('acceptedInspectionFee')}
            />
          </div>

          <p className="flex gap-2 rounded-lg bg-brand-navy-50 px-3 py-2 text-xs text-brand-navy-800">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Onarım fiyatı bu tutara dahil değildir. Arıza görüldükten sonra ayrı bir teklif
            iletilir; kabul edip etmemek size kalmıştır.
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
