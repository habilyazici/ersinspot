/**
 * Ürün listesi testleri.
 *
 * Denetlenen şey sayfalamanın adres çubuğuna gerçekten yazılmasıdır. Süzgeç
 * değiştiğinde ilk sayfaya dönülür; bu sıfırlama koşulsuz yazıldığında sayfa
 * numarasını da siliyordu ve "2. sayfa" düğmesi hiçbir şey yapmıyordu.
 * Yükleniyor/boş durumları değişmediği için hata tip denetiminden ve linten
 * geçiyor, yalnızca tarayıcıda görülüyordu.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { Paginated, ProductSummary } from '@ersinspot/shared';

/** İki sayfalık, tek ürünlük bir sonuç kümesi. */
const page: Paginated<ProductSummary> = {
  items: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      slug: 'arcelik-buzdolabi',
      title: 'Arçelik Buzdolabı',
      price: 800_000,
      condition: 'good',
      status: 'for_sale',
      category: { id: '2', name: 'Beyaz Eşya', slug: 'beyaz-esya' },
      brand: null,
      coverImage: null,
      favoriteCount: 0,
      createdAt: new Date().toISOString(),
    },
  ],
  page: 1,
  pageSize: 24,
  totalItems: 30,
  totalPages: 2,
};

vi.mock('@/features/catalog', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useProducts: () => ({ data: page, isLoading: false, isError: false }),
  useCategories: () => ({ data: [] }),
}));

vi.mock('@/features/ordering', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFavoriteStatus: () => ({ data: new Set<string>() }),
}));

const { default: ProductsPage } = await import('./products.tsx');

/** Adres çubuğundaki sorgu dizesini teste görünür kılar. */
function QueryStringProbe() {
  const [searchParams] = useSearchParams();
  return <output data-testid="sorgu">{searchParams.toString()}</output>;
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/urunler']}>
        <Routes>
          <Route
            path="/urunler"
            element={
              <>
                <ProductsPage />
                <QueryStringProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Ürün listesi', () => {
  it('sayfa değiştirince sayfa numarasını adrese yazar', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Sonraki' }));

    await waitFor(() => {
      expect(screen.getByTestId('sorgu').textContent).toBe('sayfa=2');
    });
  });

  it('süzgeç değişince sayfayı başa alır', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Sonraki' }));
    await waitFor(() => {
      expect(screen.getByTestId('sorgu').textContent).toBe('sayfa=2');
    });

    await userEvent.click(screen.getByRole('button', { name: 'Az Kullanılmış' }));

    await waitFor(() => {
      expect(screen.getByTestId('sorgu').textContent).toBe('durum=like_new');
    });
  });
});
