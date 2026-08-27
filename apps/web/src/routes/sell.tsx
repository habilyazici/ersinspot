/**
 * Ürün satma talebi.
 *
 * Müşteri ürününü mağazaya satmak için başvurur. Fotoğraf ZORUNLUDUR: personel
 * ürünü görmeden değerleme yapamaz, "tahmini" bir fiyat vermek de doğru
 * olmazdı. Bu yüzden bu sayfada tahmini tutar gösterilmez — nakliye
 * formundakinin aksine burada hesaplanabilecek bir şey yoktur.
 *
 * Müşterinin aklındaki fiyat isteğe bağlı olarak alınır ve bağlayıcı değildir;
 * pazarlığın nereden başlayacağını bilmek işimizi kolaylaştırır.
 */

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Banknote, Camera } from 'lucide-react';
import {
  ApiError,
  MIN_PRODUCT_IMAGES,
  PRODUCT_CONDITIONS,
  PRODUCT_CONDITION_LABELS,
  createSellRequestSchema,
  money,
} from '@ersinspot/shared';
import type { CreateSellRequestInput } from '@ersinspot/shared';
import { AddressFields } from '@/components/ui/address-fields.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { CheckboxField } from '@/components/ui/choice-field.tsx';
import { FormSection, SelectField, TextAreaField, TextField } from '@/components/ui/form-field.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { PhotoUpload } from '@/components/ui/photo-upload.tsx';
import { findError } from '@/lib/form.ts';
import { useAuth } from '@/features/auth';
import { useCategories } from '@/features/catalog';
import type { CategoryNode } from '@/features/catalog';
import { useCreateSellRequest } from '@/features/servicing';

type SellValues = CreateSellRequestInput;

/**
 * Kategori ağacını düz listeye çevirir.
 *
 * Seçim kutusunda hiyerarşi girinti ile gösterilir; iç içe `optgroup`
 * kullanılamaz çünkü ağaç ikiden derin olabilir.
 */
function flattenCategories(
  nodes: readonly CategoryNode[],
  depth = 0,
): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${'— '.repeat(depth)}${node.name}` },
    ...flattenCategories(node.children, depth + 1),
  ]);
}

export default function SellPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const createRequest = useCreateSellRequest();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SellValues>({
    resolver: zodResolver(createSellRequestSchema),
    defaultValues: {
      contact: { fullName: user?.fullName ?? '', phone: user?.phone ?? '' },
      title: '',
      brand: '',
      condition: 'good',
      description: '',
      hasBox: false,
      hasAccessories: false,
      hasWarranty: false,
      pickupAddress: { neighborhood: '', street: '', buildingNo: '' },
      photos: [],
    },
  });

  const photos = useWatch({ control, name: 'photos' }) ?? [];
  const options = flattenCategories(categories ?? []);

  function onSubmit(values: SellValues): void {
    createRequest.mutate(values, {
      onSuccess: (request) => {
        toast.success(`Talebiniz alındı. Takip numaranız: ${request.referenceNumber}`);
        void navigate(`/hesabim/taleplerim/${request.requestId}`, { replace: true });
      },

      onError: (error) => {
        if (error instanceof ApiError) {
          for (const field of error.fields) {
            setError(field.path as keyof SellValues, { message: field.message });
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
        title="Ürününüzü Satın"
        description="Kullanmadığınız beyaz eşya veya elektronik ürününüzü değerinde alalım. Ürünü tanıtın, ekibimiz inceleyip size fiyat teklifi sunsun."
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
                hint="Değerlendirme sonrası sizi bu numaradan arayacağız."
                error={errors.contact?.phone?.message}
                {...register('contact.phone')}
              />
            </div>
          </FormSection>

          <FormSection legend="Ürün Bilgileri">
            <TextField
              label="Ürün Başlığı"
              required
              placeholder="Örn. Arçelik No Frost Buzdolabı 520 L"
              hint="Ürünü tek cümlede tanımlayın."
              error={errors.title?.message}
              {...register('title')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Kategori"
                required
                error={errors.categoryId?.message}
                {...register('categoryId')}
              >
                <option value="">Seçiniz</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Ürün Durumu"
                required
                error={errors.condition?.message}
                {...register('condition')}
              >
                {PRODUCT_CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {PRODUCT_CONDITION_LABELS[condition].label}
                  </option>
                ))}
              </SelectField>

              <TextField
                label="Marka"
                required
                placeholder="Arçelik, Bosch, Vestel…"
                error={errors.brand?.message}
                {...register('brand')}
              />

              <TextField
                label="Model"
                hint="Biliyorsanız yazın; değerlemeyi kolaylaştırır."
                error={errors.model?.message}
                {...register('model')}
              />

              <TextField
                label="Alım Yılı"
                type="number"
                min={1980}
                max={new Date().getFullYear()}
                hint="Yaklaşık olması yeterli."
                error={errors.purchaseYear?.message}
                {...register('purchaseYear', {
                  // Boş bırakılırsa alan hiç gönderilmez; şemada isteğe bağlıdır.
                  setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
                })}
              />
            </div>

            <TextAreaField
              label="Ürün Açıklaması"
              required
              rows={5}
              hint="Ne kadar süredir kullanıldı, bilinen bir arızası veya çiziği var mı? Dürüst açıklama, teklifin gerçekçi olmasını sağlar."
              error={errors.description?.message}
              {...register('description')}
            />

            <div className="space-y-2">
              <CheckboxField label="Orijinal kutusu var" {...register('hasBox')} />
              <CheckboxField label="Aksesuarları tam" {...register('hasAccessories')} />
              <CheckboxField label="Garanti belgesi var" {...register('hasWarranty')} />
            </div>
          </FormSection>

          <FormSection legend="Fotoğraflar">
            <PhotoUpload
              label="Ürün Fotoğrafları"
              purpose="request_photo"
              value={photos}
              onChange={(next) => {
                setValue('photos', next, { shouldValidate: true });
              }}
              min={MIN_PRODUCT_IMAGES}
              max={10}
              hint={`En az ${String(MIN_PRODUCT_IMAGES)} fotoğraf gerekiyor: ürünün önden görünümü, etiketi ve varsa hasarlı bölümü. Ürünü görmeden değerleme yapamıyoruz.`}
              error={findError(errors, 'photos')}
            />
          </FormSection>

          {/* Ürünü kendimiz teslim alıyoruz; yalnızca hizmet verilen ilçeler. */}
          <AddressFields
            register={register}
            errors={errors}
            prefix="pickupAddress"
            servicedOnly
            legend="Ürünün Bulunduğu Adres"
          />

          <TextAreaField
            label="Eklemek İstedikleriniz"
            hint="Teslim alma saati tercihiniz gibi bilmemiz gerekenler."
            error={errors.customerNote?.message}
            {...register('customerNote')}
          />
        </div>

        <Card padding="md" sticky className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Banknote className="size-4" aria-hidden="true" />
            Aklınızdaki Fiyat
          </h2>

          <TextField
            label="Beklediğiniz Tutar"
            type="number"
            min={1}
            placeholder="Örn. 6500"
            hint="İsteğe bağlı ve bağlayıcı değil. Yazarsanız pazarlığın nereden başlayacağını biliriz."
            error={errors.askingPrice?.message}
            {...register('askingPrice', {
              /*
                Sunucu tutarı KURUŞ olarak bekler; kullanıcı lira yazar.
                Dönüşüm burada yapılır, paylaşılan `money` yardımcısıyla —
                elle 100 ile çarpmak kayan nokta hatası üretirdi.
              */
              setValueAs: (value: string) => {
                if (value === '') return undefined;
                const kurus = money.parseLira(value);
                return kurus ?? undefined;
              },
            })}
          />

          <p className="flex gap-2 rounded-lg bg-brand-navy-50 px-3 py-2 text-xs text-brand-navy-800">
            <Camera className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Ekibimiz fotoğrafları inceledikten sonra size bir teklif sunar. Teklifi kabul ederseniz
            ürünü adresinizden teslim alırız.
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
