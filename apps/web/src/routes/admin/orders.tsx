/**
 * Yönetim — sipariş listesi.
 *
 * Personelin gördüğü liste müşterininkinden iki noktada ayrılır: tüm
 * müşterilerin siparişlerini içerir ve takip numarası/müşteri adıyla arama
 * yapılabilir. Görsel düzen aynıdır — aynı işi yapan iki liste farklı
 * görünmemelidir.
 */

import { Link } from 'react-router-dom';
import { ImageOff, Search, ShoppingBag } from 'lucide-react';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@ersinspot/shared';
import type { OrderStatus } from '@ersinspot/shared';
import { Card } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { PageHeader } from '@/components/ui/page.tsx';
import { useListFilters } from '@/lib/list-filters.ts';
import { FilterChips, Pagination } from '@/components/ui/pagination.tsx';
import { SearchField } from '@/components/ui/search-field.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatDate, formatPrice } from '@/lib/format.ts';
import { useAdminOrders } from '@/features/ordering';

export default function AdminOrdersPage() {
  const { params, page, hasActiveFilters, setFilter, clearFilters } = useListFilters();

  const status = (params.get('durum') ?? undefined) as OrderStatus | undefined;
  const search = params.get('ara') ?? '';

  const { data, isLoading, isError, error, refetch } = useAdminOrders({
    page,
    ...(status === undefined ? {} : { status }),
    ...(search === '' ? {} : { search }),
  });

  /** Süzgeci adres çubuğuna yazar. Sayfa numarası daima sıfırlanır. */

  return (
    <>
      <PageHeader
        title="Siparişler"
        description="Tüm müşterilerin siparişleri. Takip numarası veya müşteri adıyla arayabilirsiniz."
      />

      <div className="mt-6 space-y-3">
        <SearchField
          value={search}
          placeholder="Takip numarası veya müşteri adı"
          onSearch={(next) => {
            setFilter('ara', next);
          }}
          className="max-w-sm"
        />

        <FilterChips
          label="Sipariş durumu"
          value={status}
          onChange={(next) => {
            setFilter('durum', next);
          }}
          options={ORDER_STATUSES.map((value) => ({
            value,
            label: ORDER_STATUS_LABELS[value].label,
          }))}
        />
      </div>

      {isLoading ? (
        <PageSpinner label="Siparişler yükleniyor" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data === undefined || data.items.length === 0 ? (
        <EmptyState
          icon={hasActiveFilters ? Search : ShoppingBag}
          title={hasActiveFilters ? 'Sonuç bulunamadı' : 'Sipariş yok'}
          description={
            hasActiveFilters
              ? 'Bu süzgeçle eşleşen sipariş bulunmuyor.'
              : 'Vitrinden sipariş verildiğinde burada görünür.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Süzgeçleri temizle
              </Button>
            ) : undefined
          }
          className="mt-4"
        />
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600">{data.totalItems} sipariş</p>

          <ul className="mt-3 space-y-2">
            {data.items.map((order) => (
              <Card as="li" key={order.id} interactive className="p-0">
                <Link to={`/yonetim/siparisler/${order.id}`} className="flex gap-4 p-4">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {order.previewImageUrl === null ? (
                      <div className="flex h-full items-center justify-center">
                        <ImageOff className="size-5 text-slate-300" aria-hidden="true" />
                      </div>
                    ) : (
                      <img
                        src={order.previewImageUrl}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
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

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(order.createdAt)}
                      {order.deliveryDate === null
                        ? ''
                        : ` · Teslimat: ${formatDate(order.deliveryDate)}`}
                    </p>
                  </div>

                  <p className="shrink-0 self-center font-semibold tabular-nums text-brand-orange-600">
                    {formatPrice(order.total)}
                  </p>
                </Link>
              </Card>
            ))}
          </ul>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={(next) => {
              setFilter('sayfa', String(next));
            }}
          />
        </>
      )}
    </>
  );
}
