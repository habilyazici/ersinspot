/**
 * Yönetim — ürün listesi.
 *
 * Vitrin yalnızca satıştaki ve rezerve ürünleri gösterir; bu liste taslak,
 * depodaki ve satılmış ürünleri de içerir. Durum süzgeci bu yüzden en üstte:
 * personelin en sık sorduğu soru "hangi ürünler henüz satışa açılmadı".
 *
 * Durum değiştirme listede yapılır. Bir ürünü satışa açmak için detay sayfasına
 * girmek gereksiz bir adım olurdu; asıl iş toplu gözden geçirmedir.
 */

import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Package, Plus, Search } from 'lucide-react';
import {
  ApiError,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  PRODUCT_CONDITION_LABELS,
} from '@ersinspot/shared';
import type { ProductStatus } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { SelectField } from '@/components/ui/form-field.tsx';
import { PageHeader } from '@/components/ui/page.tsx';
import { FilterChips, Pagination } from '@/components/ui/pagination.tsx';
import { SearchField } from '@/components/ui/search-field.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatPrice } from '@/lib/format.ts';
import { useAdminProducts, useUpdateProductStatus } from '@/features/catalog';

export default function AdminProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = (searchParams.get('durum') ?? undefined) as ProductStatus | undefined;
  const search = searchParams.get('ara') ?? '';
  const page = Number(searchParams.get('sayfa') ?? '1');

  const { data, isLoading, isError, error, refetch } = useAdminProducts({
    page,
    ...(status === undefined ? {} : { status }),
    ...(search === '' ? {} : { search }),
  });

  const updateStatus = useUpdateProductStatus();

  function setFilter(key: string, value: string | undefined): void {
    const next = new URLSearchParams(searchParams);

    if (value === undefined || value === '') next.delete(key);
    else next.set(key, value);

    if (key !== 'sayfa') next.delete('sayfa');

    // Süzgeç değişimi geçmişe kayıt eklemez; geri tuşu listede değil,
    // sayfalar arasında gezinmelidir.
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <PageHeader
        title="Ürünler"
        description="Taslak, depodaki ve satılmış ürünler dahil tüm katalog."
        aside={
          <Button asChild size="sm">
            <Link to="/yonetim/urunler/yeni">
              <Plus aria-hidden="true" />
              Ürün ekle
            </Link>
          </Button>
        }
      />

      <div className="mt-6 space-y-3">
        <SearchField
          value={search}
          placeholder="Ürün adı"
          onSearch={(next) => {
            setFilter('ara', next);
          }}
          className="max-w-sm"
        />

        <FilterChips
          label="Ürün durumu"
          value={status}
          onChange={(next) => {
            setFilter('durum', next);
          }}
          options={PRODUCT_STATUSES.map((value) => ({
            value,
            label: PRODUCT_STATUS_LABELS[value].label,
          }))}
        />
      </div>

      {isLoading ? (
        <PageSpinner label="Ürünler yükleniyor" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data === undefined || data.items.length === 0 ? (
        <EmptyState
          icon={search === '' ? Package : Search}
          title={search === '' ? 'Ürün yok' : 'Sonuç bulunamadı'}
          description={
            search === ''
              ? 'Bu süzgeçle eşleşen ürün bulunmuyor.'
              : 'Arama kriterlerinizi değiştirip tekrar deneyin.'
          }
          className="mt-4"
        />
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600">{data.totalItems} ürün</p>

          <ul className="mt-3 space-y-2">
            {data.items.map((product) => (
              <Card as="li" key={product.id} className="flex flex-wrap items-center gap-4">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {product.coverImage === null ? (
                    <div className="flex h-full items-center justify-center">
                      <Package className="size-5 text-slate-300" aria-hidden="true" />
                    </div>
                  ) : (
                    <img
                      src={product.coverImage.url}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    to={`/yonetim/urunler/${product.id}`}
                    className="text-sm font-medium text-slate-900 hover:text-brand-orange-600"
                  >
                    {product.title}
                  </Link>

                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{product.category.name}</span>
                    <span aria-hidden="true">·</span>
                    <span>{PRODUCT_CONDITION_LABELS[product.condition].label}</span>
                    {product.brand === null ? null : (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{product.brand.name}</span>
                      </>
                    )}
                  </p>
                </div>

                <p className="shrink-0 font-semibold tabular-nums text-brand-orange-600">
                  {formatPrice(product.price)}
                </p>

                <StatusBadge meta={PRODUCT_STATUS_LABELS[product.status]} />

                {/*
                  Durum değişikliği listede yapılır. Geçiş kuralları sunucuda
                  doğrulanır: satılmış bir ürün taslağa geri döndürülemez.
                */}
                <SelectField
                  label="Durum"
                  className="w-40 shrink-0"
                  value={product.status}
                  /*
                    Kilit YALNIZCA işlem gören satırda. Mutasyon durumu liste
                    boyunca paylaşıldığı için tek bir ürünün durumunu
                    değiştirmek, o sırada bütün satırların seçicisini devre dışı
                    bırakıyordu.
                  */
                  disabled={
                    updateStatus.isPending && updateStatus.variables?.productId === product.id
                  }
                  onChange={(event) => {
                    updateStatus.mutate(
                      { productId: product.id, status: event.target.value as ProductStatus },
                      {
                        onSuccess: () => {
                          toast.success('Ürün durumu güncellendi.');
                        },
                        onError: (failure) => {
                          toast.error(
                            failure instanceof ApiError
                              ? failure.message
                              : 'Durum değiştirilemedi.',
                          );
                        },
                      },
                    );
                  }}
                >
                  {PRODUCT_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {PRODUCT_STATUS_LABELS[value].label}
                    </option>
                  ))}
                </SelectField>
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
