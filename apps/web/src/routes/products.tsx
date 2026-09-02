import { useSearchParams } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import {
  PRODUCT_CONDITIONS,
  PRODUCT_CONDITION_LABELS,
  PRODUCT_SORT_LABELS,
  PRODUCT_SORT_OPTIONS,
} from '@ersinspot/shared';
import type { ProductCondition, ProductSort } from '@ersinspot/shared';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { TextField, fieldControlClass } from '@/components/ui/form-field.tsx';
import { cn } from '@/lib/utils.ts';
import { Pagination } from '@/components/ui/pagination.tsx';
import { Button } from '@/components/ui/button.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { ProductCard, useCategories, useProducts } from '@/features/catalog';
import { FavoriteButton, useFavoriteStatus } from '@/features/ordering';

/**
 * Ürün listesi.
 *
 * Filtreler adres çubuğunda tutulur: kullanıcı bağlantıyı paylaşabilir, geri
 * tuşu beklendiği gibi çalışır ve sayfa yenilenince filtreler kaybolmaz.
 */
export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    page: Number(searchParams.get('sayfa') ?? '1'),
    categorySlug: searchParams.get('kategori') ?? undefined,
    condition: (searchParams.get('durum') as ProductCondition | null) ?? undefined,
    search: searchParams.get('ara') ?? undefined,
    sort: (searchParams.get('sirala') as ProductSort | null) ?? 'newest',
  };

  const { data, isLoading, isError, error, refetch } = useProducts(filters);

  /*
    Sayfadaki ürünlerin favori durumu TEK istekte sorulur. Kart başına ayrı
    istek, 24 ürünlük bir sayfada 24 çağrı demekti.
  */
  const { data: favorites } = useFavoriteStatus(data?.items.map((product) => product.id) ?? []);
  const { data: categories } = useCategories();

  function updateFilter(key: string, value: string | undefined): void {
    const next = new URLSearchParams(searchParams);

    if (value === undefined || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    // Filtre değişince ilk sayfaya dön: üçüncü sayfada filtre daraltılırsa
    // boş sonuç görünürdü.
    next.delete('sayfa');
    setSearchParams(next);
  }

  return (
    <PageContainer width="wide">
      <PageHeader
        className="mb-8"
        title="İkinci El Ürünler"
        description="Kontrol edilmiş, temiz ikinci el beyaz eşya ve elektronik."
      />

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        {/* Filtreler */}
        <aside aria-labelledby="filtreler" className="space-y-6">
          <h2 id="filtreler" className="text-sm font-semibold text-slate-900">
            Filtreler
          </h2>

          <TextField
            label="Ara"
            type="search"
            defaultValue={filters.search ?? ''}
            placeholder="Ürün veya marka"
            onChange={(event) => {
              updateFilter('ara', event.target.value);
            }}
          />

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Kategori</legend>
            <div className="mt-2 space-y-1">
              <Button
                variant={filters.categorySlug === undefined ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => updateFilter('kategori', undefined)}
              >
                Tümü
              </Button>

              {(categories ?? []).map((category) => (
                <div key={category.id}>
                  <Button
                    variant={filters.categorySlug === category.slug ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => updateFilter('kategori', category.slug)}
                  >
                    <span>{category.name}</span>
                    <span className="text-xs opacity-70">{category.productCount}</span>
                  </Button>

                  {category.children.map((child) => (
                    <Button
                      key={child.id}
                      variant={filters.categorySlug === child.slug ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-between pl-6"
                      onClick={() => updateFilter('kategori', child.slug)}
                    >
                      <span>{child.name}</span>
                      <span className="text-xs opacity-70">{child.productCount}</span>
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Durum</legend>
            <div className="mt-2 space-y-1">
              <Button
                variant={filters.condition === undefined ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => updateFilter('durum', undefined)}
              >
                Tümü
              </Button>

              {PRODUCT_CONDITIONS.map((condition) => (
                <Button
                  key={condition}
                  variant={filters.condition === condition ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => updateFilter('durum', condition)}
                >
                  {PRODUCT_CONDITION_LABELS[condition].label}
                </Button>
              ))}
            </div>
          </fieldset>
        </aside>

        {/* Sonuçlar */}
        <section aria-live="polite">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              {data === undefined ? '—' : `${data.totalItems} ürün`}
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="siralama" className="text-sm text-slate-600">
                Sırala
              </label>
              <select
                id="siralama"
                value={filters.sort}
                onChange={(event) => {
                  updateFilter('sirala', event.target.value);
                }}
                className={cn(fieldControlClass, 'w-auto py-2')}
              >
                {PRODUCT_SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {PRODUCT_SORT_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner label="Ürünler yükleniyor" />
            </div>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : data === undefined || data.items.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="Aradığınız kriterlerde ürün bulunamadı"
              description="Filtreleri değiştirerek tekrar deneyin."
              action={
                <Button variant="outline" onClick={() => setSearchParams(new URLSearchParams())}>
                  Filtreleri temizle
                </Button>
              }
            />
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {data.items.map((product) => (
                  <li key={product.id}>
                    <ProductCard
                      product={product}
                      action={
                        <FavoriteButton
                          productId={product.id}
                          productTitle={product.title}
                          isFavorite={favorites?.has(product.id) ?? false}
                        />
                      }
                    />
                  </li>
                ))}
              </ul>

              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={(next) => {
                  updateFilter('sayfa', String(next));
                }}
              />
            </>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
