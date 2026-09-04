import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ImageOff, ShoppingCart, Trash2 } from 'lucide-react';
import { ApiError, PRODUCT_CONDITION_LABELS } from '@ersinspot/shared';
import { Card } from '@/components/ui/card.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { Button } from '@/components/ui/button.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatPrice } from '@/lib/format.ts';
import { useCart, useRemoveFromCart } from '@/features/ordering';

/**
 * Sepet.
 *
 * Fiyatlar her açılışta sunucudan güncel olarak gelir; sepet fiyat saklamaz.
 * Eski kod tabanında sepet hem tarayıcıda hem sunucuda tutuluyor ve fiyat
 * kopyalanıyordu.
 */
export default function CartPage() {
  const { data: cart, isLoading, isError, error, refetch } = useCart();
  const removeItem = useRemoveFromCart();

  if (isLoading) return <PageSpinner label="Sepet yükleniyor" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (cart === undefined) return null;

  if (cart.items.length === 0) {
    return (
      <PageContainer width="prose">
        <EmptyState
          icon={ShoppingCart}
          title="Sepetiniz boş"
          description="Beğendiğiniz ürünleri sepete ekleyerek sipariş verebilirsiniz."
          action={
            <Button asChild>
              <Link to="/urunler">Ürünleri incele</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  function handleRemove(productId: string, title: string): void {
    removeItem.mutate(productId, {
      onSuccess: () => toast.success(`"${title}" sepetten çıkarıldı.`),
      onError: (mutationError: unknown) => {
        toast.error(
          mutationError instanceof ApiError ? mutationError.message : 'Ürün çıkarılamadı.',
        );
      },
    });
  }

  return (
    <PageContainer width="form">
      <PageHeader
        title="Sepetim"
        description="Sipariş vermeden önce sepetinizdeki ürünleri gözden geçirin."
      />

      {cart.hasUnavailableItems ? (
        // Uyarı kutusu, hesap ve ödeme sayfalarındaki uyarılarla aynı belirteçleri
        // kullanır. Burada ham `amber-*` tonları yazılıydı ve aynı işi yapan iki
        // kutu iki farklı sarı gösteriyordu.
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-lg bg-state-pending-bg p-4 text-state-pending-fg"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm">
            Sepetinizde artık satışta olmayan ürün var. Sipariş verebilmek için bu ürünleri
            çıkarmanız gerekiyor.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-3">
          {cart.items.map((item) => (
            <Card as="li" key={item.productId} className="flex gap-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <Link to={`/urun/${item.slug}`} tabIndex={-1} aria-hidden="true">
                  {item.coverImageUrl === null ? (
                    <div className="flex h-full items-center justify-center">
                      <ImageOff className="size-6 text-slate-300" aria-hidden="true" />
                    </div>
                  ) : (
                    <img src={item.coverImageUrl} alt="" className="size-full object-cover" />
                  )}
                </Link>
              </div>

              <div className="min-w-0 flex-1">
                {/* Kalemden ürün sayfasına dönüş: fiyat veya durum değiştiyse
                    kullanıcı ayrıntıyı oradan görür. */}
                <h2 className="truncate font-medium text-slate-900">
                  <Link to={`/urun/${item.slug}`} className="hover:text-brand-orange-600">
                    {item.title}
                  </Link>
                </h2>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge meta={PRODUCT_CONDITION_LABELS[item.condition]} />

                  {item.isAvailable ? null : (
                    <span className="text-xs font-medium text-red-600">Satışta değil</span>
                  )}
                </div>

                <p className="mt-2 font-semibold text-brand-orange-600">
                  {formatPrice(item.price)}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                aria-label={`"${item.title}" ürününü sepetten çıkar`}
                onClick={() => handleRemove(item.productId, item.title)}
                disabled={removeItem.isPending}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </Card>
          ))}
        </ul>

        <Card as="aside" padding="md" className="h-fit">
          <h2 className="font-semibold text-slate-900">Sipariş Özeti</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Ara toplam</dt>
              <dd className="font-medium">{formatPrice(cart.subtotal)}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-slate-600">Teslimat</dt>
              <dd className="text-slate-500">Adımda hesaplanır</dd>
            </div>
          </dl>

          <Button asChild size="lg" className="mt-5 w-full" disabled={cart.hasUnavailableItems}>
            <Link to="/odeme">Siparişi Tamamla</Link>
          </Button>

          <p className="mt-3 text-xs text-slate-500">
            Teslimat ücreti ilçenize göre bir sonraki adımda hesaplanır. Buca içi teslimat
            ücretsizdir.
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}
