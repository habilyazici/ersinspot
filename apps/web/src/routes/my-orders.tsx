import { Link } from 'react-router-dom';
import { ImageOff, Package } from 'lucide-react';
import { ORDER_STATUS_LABELS } from '@ersinspot/shared';
import { Card } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatDate, formatPrice } from '@/lib/format.ts';
import { useMyOrders } from '@/features/ordering';

export default function MyOrdersPage() {
  const { data, isLoading, isError, error, refetch } = useMyOrders();

  if (isLoading) return <PageSpinner label="Siparişler yükleniyor" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <PageContainer>
      <PageHeader
        title="Siparişlerim"
        description="Verdiğiniz siparişlerin durumunu buradan izleyebilirsiniz."
      />

      {data === undefined || data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Henüz siparişiniz yok"
          description="Verdiğiniz siparişler burada listelenir."
          action={
            <Button asChild>
              <Link to="/urunler">Alışverişe başla</Link>
            </Button>
          }
        />
      ) : (
        <ul className="mt-8 space-y-3">
          {data.items.map((order) => (
            <Card as="li" key={order.id} interactive className="p-0">
              <Link to={`/hesabim/siparislerim/${order.id}`} className="flex gap-4 p-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {order.previewImageUrl === null ? (
                    <div className="flex h-full items-center justify-center">
                      <ImageOff className="size-5 text-slate-300" aria-hidden="true" />
                    </div>
                  ) : (
                    <img src={order.previewImageUrl} alt="" className="size-full object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-mono text-xs text-slate-500">{order.referenceNumber}</p>
                    <StatusBadge meta={ORDER_STATUS_LABELS[order.status]} />
                  </div>

                  <p className="mt-1 truncate text-sm font-medium text-slate-900">
                    {order.previewTitle}
                    {order.itemCount > 1 ? ` ve ${order.itemCount - 1} ürün daha` : ''}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                </div>

                <p className="shrink-0 self-center font-semibold text-brand-orange-600">
                  {formatPrice(order.total)}
                </p>
              </Link>
            </Card>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
