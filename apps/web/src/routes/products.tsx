import { useSearchParams } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import {
  PRODUCT_CONDITIONS,
  PRODUCT_CONDITION_LABELS,
  PRODUCT_SORT_LABELS,
  PRODUCT_SORT_OPTIONS,
} from '@ersinspot/shared';
import type { ProductCondition, ProductSort } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { ProductCard, useCategories, useProducts } from '@/features/catalog';

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">İkinci El Ürünler</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kontrol edilmiş, temiz ikinci el beyaz eşya ve elektronik.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        {/* Filtreler */}
        <aside aria-labelledby="filtreler" className="space-y-6">
          <h2 id="filtreler" className="text-sm font-semibold text-slate-900">
            Filtreler
          </h2>

          <div>
            <label htmlFor="arama" className="block text-sm font-medium text-slate-700">
              Ara
            </label>
            <input
              id="arama"
              type="search"
              defaultValue={filters.search ?? ''}
              placeholder="Ürün veya marka"
              onChange={(event) => updateFilter('ara', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

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
                onChange={(event) => updateFilter('sirala', event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                    <ProductCard product={product} />
                  </li>
                ))}
              </ul>

              {data.totalPages > 1 ? (
                <nav aria-label="Sayfalama" className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.page <= 1}
                    onClick={() => updateFilter('sayfa', String(data.page - 1))}
                  >
                    Önceki
                  </Button>

                  <span className="px-3 text-sm text-slate-600">
                    Sayfa {data.page} / {data.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.page >= data.totalPages}
                    onClick={() => updateFilter('sayfa', String(data.page + 1))}
                  >
                    Sonraki
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
