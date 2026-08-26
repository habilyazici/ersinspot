import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ImageOff, ShoppingCart, Trash2 } from 'lucide-react';
import { ApiError, PRODUCT_CONDITION_LABELS } from '@ersinspot/shared';
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
      <div className="mx-auto max-w-2xl px-4 py-16">
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
      </div>
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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Sepetim</h1>

      {cart.hasUnavailableItems ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm text-amber-900">
            Sepetinizde artık satışta olmayan ürün var. Sipariş verebilmek için bu ürünleri
            çıkarmanız gerekiyor.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-3">
          {cart.items.map((item) => (
            <li
              key={item.productId}
              className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {item.coverImageUrl === null ? (
                  <div className="flex h-full items-center justify-center">
                    <ImageOff className="size-6 text-slate-300" aria-hidden="true" />
                  </div>
                ) : (
                  <img src={item.coverImageUrl} alt="" className="size-full object-cover" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate font-medium text-slate-900">{item.title}</h2>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge meta={PRODUCT_CONDITION_LABELS[item.condition]} />

                  {item.isAvailable ? null : (
                    <span className="text-xs font-medium text-red-600">Satışta değil</span>
                  )}
                </div>

                <p className="mt-2 font-semibold text-brand-orange-600">
                  {formatPrice(item.lineTotal)}
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
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
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
        </aside>
      </div>
    </div>
  );
}
