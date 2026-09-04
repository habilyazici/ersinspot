import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ImageOff, ShieldCheck, ShoppingCart } from 'lucide-react';
import { ApiError, PRODUCT_CONDITION_LABELS, PRODUCT_STATUS_LABELS } from '@ersinspot/shared';
import { PageContainer } from '@/components/ui/page.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatPrice } from '@/lib/format.ts';
import { cn } from '@/lib/utils.ts';
import { useAuth } from '@/features/auth';
import { useProduct } from '@/features/catalog';
import { FavoriteButton, useAddToCart, useFavoriteStatus } from '@/features/ordering';

export default function ProductDetailPage() {
  const { slug = '' } = useParams();
  const { data: product, isLoading, isError, error, refetch } = useProduct(slug);
  const { isAuthenticated } = useAuth();
  const addToCart = useAddToCart();
  const { data: favorites } = useFavoriteStatus(product === undefined ? [] : [product.id]);
  const [activeImage, setActiveImage] = useState(0);

  if (isLoading) return <PageSpinner label="Ürün yükleniyor" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (product === undefined) return null;

  const isPurchasable = product.status === 'for_sale';
  const cover = product.images[activeImage] ?? product.images[0];

  /*
    Ürün kimliği parametreyle geçilir.

    Fonksiyon, `product === undefined` erken dönüşünden SONRA tanımlı olsa da
    TypeScript kapanış içinde daraltmayı koruyamaz; kimliği dışarıdan almak,
    burada bir `!` işareti yazmaktan kurtarır.
  */
  function handleAddToCart(productId: string): void {
    addToCart.mutate(productId, {
      onSuccess: () => toast.success('Ürün sepetinize eklendi.'),
      onError: (mutationError) => {
        toast.error(
          mutationError instanceof ApiError ? mutationError.message : 'Ürün sepete eklenemedi.',
        );
      },
    });
  }

  return (
    <PageContainer width="wide">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/urunler">
          <ArrowLeft aria-hidden="true" />
          Ürünlere dön
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Görseller */}
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {cover === undefined ? (
              <div className="flex h-full items-center justify-center">
                <ImageOff className="size-12 text-slate-300" aria-hidden="true" />
              </div>
            ) : (
              <img
                src={cover.url}
                alt={cover.altText === '' ? product.title : cover.altText}
                className="size-full object-cover"
              />
            )}
          </div>

          {product.images.length > 1 ? (
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((image, index) => (
                <li key={image.id}>
                  <button
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`${index + 1}. fotoğrafı göster`}
                    aria-current={index === activeImage}
                    className={cn(
                      'aspect-square w-full overflow-hidden rounded-lg border-2 transition-colors',
                      index === activeImage
                        ? 'border-brand-orange-500'
                        : 'border-transparent hover:border-slate-300',
                    )}
                  >
                    <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Bilgiler */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge meta={PRODUCT_CONDITION_LABELS[product.condition]} />
            {isPurchasable ? null : <StatusBadge meta={PRODUCT_STATUS_LABELS[product.status]} />}

            <FavoriteButton
              productId={product.id}
              productTitle={product.title}
              isFavorite={favorites?.has(product.id) ?? false}
              className="ml-auto shadow-none ring-1 ring-slate-200"
            />
          </div>

          <h1 className="mt-3 text-2xl font-bold text-slate-900 lg:text-3xl">{product.title}</h1>

          <p className="mt-1 text-sm text-slate-600">
            {product.brand?.name ?? '—'} · {product.category.name}
          </p>

          <p className="mt-6 text-3xl font-bold text-brand-orange-600">
            {formatPrice(product.price)}
          </p>

          {product.warrantyMonths > 0 ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-brand-teal-700">
              <ShieldCheck className="size-4" aria-hidden="true" />
              {product.warrantyLabel}
            </p>
          ) : null}

          <div className="mt-6">
            {isPurchasable ? (
              isAuthenticated ? (
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    handleAddToCart(product.id);
                  }}
                  isLoading={addToCart.isPending}
                >
                  <ShoppingCart aria-hidden="true" />
                  Sepete Ekle
                </Button>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">
                    Sepete eklemek için giriş yapmanız gerekiyor.
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <Link to="/giris">Giriş Yap</Link>
                  </Button>
                </div>
              )
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-700">
                  Bu ürün şu anda satışta değil. Benzer ürünler için ürün listesine göz
                  atabilirsiniz.
                </p>
              </div>
            )}
          </div>

          <section aria-labelledby="aciklama" className="mt-8">
            <h2 id="aciklama" className="text-lg font-semibold text-slate-900">
              Ürün Açıklaması
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {product.description}
            </p>
          </section>

          {product.specs.length > 0 ? (
            <section aria-labelledby="ozellikler" className="mt-8">
              <h2 id="ozellikler" className="text-lg font-semibold text-slate-900">
                Teknik Özellikler
              </h2>

              <dl className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
                {product.specs.map((spec) => (
                  <div key={spec.key} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <dt className="text-slate-600">{spec.key}</dt>
                    <dd className="font-medium text-slate-900">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
