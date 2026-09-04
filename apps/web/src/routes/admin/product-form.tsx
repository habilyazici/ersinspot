/**
 * Yönetim — ürün ekleme ve düzenleme.
 *
 * TEK FORM iki işi yapar: adres `/yeni` ise oluşturma, ürün kimliği taşıyorsa
 * düzenleme. İki ayrı ekran, aynı on alanın iki kez yazılması ve zamanla
 * ayrışması demek olurdu — bir alana eklenen doğrulama diğerine unutulurdu.
 *
 * Fiyat kullanıcıdan LİRA olarak alınır, sunucuya KURUŞ gider. Dönüşüm
 * paylaşılan `money` yardımcısıyla yapılır; elle 100 ile çarpmak kayan nokta
 * hatası üretirdi (19,90 × 100 = 1989,9999...).
 */

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  ApiError,
  MIN_PRODUCT_IMAGES,
  PRODUCT_CONDITIONS,
  PRODUCT_CONDITION_LABELS,
  createProductSchema,
  money,
} from '@ersinspot/shared';
import type { CreateProductInput } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { ConfirmDelete } from '@/components/ui/confirm-delete.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { FormSection, SelectField, TextAreaField, TextField } from '@/components/ui/form-field.tsx';
import { PageHeader } from '@/components/ui/page.tsx';
import { PhotoUpload } from '@/components/ui/photo-upload.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { findError } from '@/lib/form.ts';
import type { CategoryNode } from '@/features/catalog';
import {
  useAdminProduct,
  useBrands,
  useCategories,
  useCreateProduct,
  useDeleteProduct,
  useUpdateProduct,
} from '@/features/catalog';

/**
 * Form şeması.
 *
 * Fiyat alanı formda LİRA METNİ olarak tutulur ("24.500" ya da "24500,50") ve
 * gönderim sırasında kuruşa çevrilir. Alanda doğrudan kuruş tutulduğunda
 * düzenleme modu bozuluyordu: sunucudan gelen 2.450.000 kuruş kutuya olduğu
 * gibi yazılıyor, personel ekranda "2450000 ₺" görüyordu. Düzeltmek için
 * "24500" yazan biri de ürünü 245 ₺'ye düşürüyordu — dönüşüm iki yönde de
 * yapılmadığı sürece hangi birimin kutuda olduğu belirsizdi.
 *
 * Ayrım artık tipte görünür: forma giren değer metin, şemadan çıkan değer
 * kuruştur.
 */
const productFormSchema = createProductSchema.extend({
  /*
    Fiyat DOĞRULANIR ama şemada dönüştürülmez.

    Dönüşümü şemaya koymak, form değerinin tipi ile doğrulayıcının çıktısının
    tipini ayırırdı; react-hook-form'un çözümleyici tipleri bu ayrımı taşımıyor.
    Doğrulama tek yerde kalsın diye kural burada, birim dönüşümü gönderimde
    yapılır — ikisi de `money.parseLira` üzerinden.
  */
  price: z.string({ required_error: 'Fiyat zorunludur.' }).superRefine((value, ctx) => {
    const kurus = money.parseLira(value);

    if (kurus === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Geçerli bir fiyat girin. Örn. 24500 veya 24500,50',
      });
      return;
    }

    if (kurus <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Fiyat sıfırdan büyük olmalıdır.' });
    }
  }),
});

/**
 * Formda tutulan değerler.
 *
 * Fiyat dışında sunucu sözleşmesiyle aynıdır; fiyat LİRA METNİ olarak tutulur
 * ("24.500" ya da "24500,50") ve gönderimde kuruşa çevrilir. Alanda doğrudan
 * kuruş tutulduğunda düzenleme modu bozuluyordu: sunucudan gelen 2.450.000
 * kuruş kutuya olduğu gibi yazılıyor, personel ekranda "2450000 ₺" görüyordu.
 * Düzeltmek için "24500" yazan biri de ürünü 245 ₺'ye düşürüyordu.
 */
type ProductValues = Omit<CreateProductInput, 'price'> & { price: string };

/** Kategori ağacını girintili düz listeye çevirir. */
function flattenCategories(
  nodes: readonly CategoryNode[],
  depth = 0,
): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${'— '.repeat(depth)}${node.name}` },
    ...flattenCategories(node.children, depth + 1),
  ]);
}

export default function AdminProductFormPage() {
  const { productId } = useParams<{ productId: string }>();
  const isEditing = productId !== undefined && productId !== 'yeni';

  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const existing = useAdminProduct(isEditing ? productId : '');

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: '',
      description: '',
      price: '',
      condition: 'good',
      status: 'draft',
      warrantyMonths: 0,
      brandId: null,
      images: [],
      specs: [],
    },
  });

  const photos = useWatch({ control, name: 'images' }) ?? [];

  /*
    Düzenleme modunda form, ürün yüklenince doldurulur. `reset` kullanılır
    çünkü `defaultValues` yalnızca ilk oluşturmada okunur; sorgu sonradan
    tamamlandığında alanlar boş kalırdı.
  */
  useEffect(() => {
    const product = existing.data;
    if (product === undefined) return;

    reset({
      title: product.title,
      description: product.description,
      // Kuruş → lira metni. Kutuya kuruş yazmak fiyatı 100 katı gösterirdi.
      price: money.toInputValue(money.fromKurus(product.price)),
      condition: product.condition,
      status: product.status,
      warrantyMonths: product.warrantyMonths,
      categoryId: product.category.id,
      brandId: product.brand?.id ?? null,
      images: product.images.map((image) => ({
        storageKey: image.storageKey,
        altText: image.altText,
      })),
      specs: product.specs.map((spec) => ({ key: spec.key, value: spec.value })),
    });
  }, [existing.data, reset]);

  if (isEditing && existing.isLoading) return <PageSpinner label="Ürün yükleniyor" />;

  if (isEditing && existing.isError) {
    return <ErrorState error={existing.error} onRetry={() => void existing.refetch()} />;
  }

  function onSubmit(values: ProductValues): void {
    // Şema fiyatı zaten doğruladı; burada yalnızca lira → kuruş çevrilir.
    const price = money.parseLira(values.price);

    if (price === null) return;

    const payload: CreateProductInput = { ...values, price };

    const done = {
      onSuccess: () => {
        toast.success(isEditing ? 'Ürün güncellendi.' : 'Ürün oluşturuldu.');
        void navigate('/yonetim/urunler');
      },
      onError: (failure: unknown) => {
        toast.error(failure instanceof ApiError ? failure.message : 'Ürün kaydedilemedi.');
      },
    };

    if (isEditing) updateProduct.mutate({ productId, product: payload }, done);
    else createProduct.mutate(payload, done);
  }

  const categoryOptions = flattenCategories(categories ?? []);

  return (
    <>
      <PageHeader
        backTo={{ to: '/yonetim/urunler', label: 'Ürünler' }}
        title={isEditing ? 'Ürünü Düzenle' : 'Yeni Ürün'}
        description={
          isEditing
            ? 'Değişiklikler kaydedildiğinde vitrinde hemen görünür.'
            : 'Ürün taslak olarak oluşturulur; gözden geçirdikten sonra satışa açabilirsiniz.'
        }
      />

      <form
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        className="mt-8 max-w-3xl space-y-8"
      >
        <FormSection legend="Temel Bilgiler">
          <TextField
            label="Ürün Başlığı"
            required
            placeholder="Örn. Arçelik No Frost Buzdolabı 520 L"
            error={errors.title?.message}
            {...register('title')}
          />

          <TextAreaField
            label="Açıklama"
            required
            rows={6}
            hint="Ürünün durumu, bilinen kusurları ve yapılan kontroller. Dürüst açıklama iade ve şikâyeti azaltır."
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Fiyat (₺)"
              required
              inputMode="decimal"
              placeholder="Örn. 24500"
              hint="Lira olarak yazın; kuruş için virgül kullanın."
              error={errors.price?.message}
              {...register('price')}
            />

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

            <SelectField
              label="Kategori"
              required
              error={errors.categoryId?.message}
              {...register('categoryId')}
            >
              <option value="">Seçiniz</option>
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <SelectField label="Marka" error={errors.brandId?.message} {...register('brandId')}>
              <option value="">Markasız</option>
              {(brands ?? []).map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </SelectField>

            <TextField
              label="Garanti (ay)"
              type="number"
              min={0}
              max={60}
              hint="Garanti verilmiyorsa 0."
              error={errors.warrantyMonths?.message}
              {...register('warrantyMonths', { valueAsNumber: true })}
            />
          </div>
        </FormSection>

        <FormSection legend="Fotoğraflar">
          <PhotoUpload
            label="Ürün Fotoğrafları"
            purpose="product_image"
            value={photos}
            onChange={(next) => {
              setValue('images', next, { shouldValidate: true });
            }}
            min={MIN_PRODUCT_IMAGES}
            max={10}
            hint={`En az ${String(MIN_PRODUCT_IMAGES)} fotoğraf gerekiyor. İlk fotoğraf vitrinde kapak olarak kullanılır.`}
            error={findError(errors, 'images')}
          />
        </FormSection>

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            size="lg"
            isLoading={isSubmitting || createProduct.isPending || updateProduct.isPending}
          >
            {isEditing ? 'Değişiklikleri kaydet' : 'Ürünü oluştur'}
          </Button>

          {isEditing ? (
            <ConfirmDelete
              appearance="text"
              label="Ürünü sil"
              question="Ürün vitrinden kaldırılacak."
              isPending={deleteProduct.isPending}
              onConfirm={() => {
                deleteProduct.mutate(productId, {
                  onSuccess: () => {
                    toast.success('Ürün silindi.');
                    void navigate('/yonetim/urunler');
                  },
                  onError: (failure) => {
                    // Siparişe bağlı ürün silinemez; sunucu sebebini yazar.
                    toast.error(failure instanceof ApiError ? failure.message : 'Ürün silinemedi.');
                  },
                });
              }}
            />
          ) : null}
        </div>
      </form>

      {isEditing && existing.data !== undefined ? (
        <Card padding="md" className="mt-8 max-w-3xl">
          <p className="text-sm text-slate-600">
            Bu ürün <strong>{existing.data.viewCount}</strong> kez görüntülendi ve{' '}
            <strong>{existing.data.favoriteCount}</strong> kez favorilere eklendi.
          </p>
        </Card>
      ) : null}
    </>
  );
}
