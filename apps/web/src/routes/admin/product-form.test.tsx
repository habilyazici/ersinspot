/**
 * Ürün formunun testleri.
 *
 * Denetlenen şey BİRİM. Sunucu fiyatı kuruş taşır, personel lira yazar.
 * Düzenleme modunda gelen kuruş değeri kutuya olduğu gibi yazıldığında ekranda
 * 100 katı bir rakam görünüyordu ("2450000 ₺"); onu "düzelten" biri de ürünü
 * yüzde bire indiriyordu. Birim dönüşümü iki yönde de yapılmalıdır.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductDetail } from '@ersinspot/shared';
import type * as CatalogModule from '@/features/catalog';

const PRODUCT: ProductDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'arcelik-buzdolabi',
  title: 'Arçelik No-Frost Buzdolabı',
  description: 'Az kullanılmış, A++ enerji sınıfı, 520 litre kapasiteli buzdolabı.',
  // 24.500 ₺
  price: 2_450_000,
  condition: 'like_new',
  status: 'for_sale',
  warrantyMonths: 12,
  category: { id: '22222222-2222-4222-8222-222222222222', name: 'Buzdolabı', slug: 'buzdolabi' },
  brand: null,
  images: [
    {
      id: 'a',
      url: '/files/a.webp',
      storageKey: 'product_image/2026/08/a.webp',
      altText: '',
      displayOrder: 0,
    },
    {
      id: 'b',
      url: '/files/b.webp',
      storageKey: 'product_image/2026/08/b.webp',
      altText: '',
      displayOrder: 1,
    },
    {
      id: 'c',
      url: '/files/c.webp',
      storageKey: 'product_image/2026/08/c.webp',
      altText: '',
      displayOrder: 2,
    },
  ],
  specs: [],
  viewCount: 0,
  favoriteCount: 0,
  warrantyLabel: '1 Yıl Garanti',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const updateProduct = vi.fn();

vi.mock('@/features/catalog', async (importOriginal) => ({
  ...(await importOriginal<typeof CatalogModule>()),
  useCategories: () => ({
    data: [{ ...PRODUCT.category, displayOrder: 0, productCount: 1, children: [] }],
  }),
  useBrands: () => ({ data: [] }),
  useAdminProduct: () => ({ data: PRODUCT, isLoading: false, isError: false }),
  useCreateProduct: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateProduct: () => ({ mutate: updateProduct, isPending: false }),
  useDeleteProduct: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { default: AdminProductFormPage } = await import('./product-form.tsx');

beforeEach(() => {
  updateProduct.mockClear();
});

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/yonetim/urunler/${PRODUCT.id}`]}>
        <Routes>
          <Route path="/yonetim/urunler/:productId" element={<AdminProductFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function priceInput(): HTMLInputElement {
  return screen.getByLabelText(/fiyat/i);
}

describe('ürün formunda fiyat birimi', () => {
  it('düzenlemede kuruşu değil lirayı gösterir', async () => {
    renderForm();

    await waitFor(() => {
      expect(priceInput().value).not.toBe('');
    });

    // 2.450.000 kuruş = 24.500 ₺. Kutuda kuruş görünmemeli.
    expect(priceInput().value).toBe('24500,00');
  });

  it('değiştirilmeden kaydedildiğinde fiyat aynı kalır', async () => {
    const user = userEvent.setup();
    renderForm();

    await waitFor(() => {
      expect(priceInput().value).toBe('24500,00');
    });

    await user.click(screen.getByRole('button', { name: /kaydet/i }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalled();
    });

    const [payload] = updateProduct.mock.calls[0] as [{ product: { price: number } }];
    expect(payload.product.price).toBe(PRODUCT.price);
  });

  it('yazılan lira tutarını kuruşa çevirir', async () => {
    const user = userEvent.setup();
    renderForm();

    await waitFor(() => {
      expect(priceInput().value).toBe('24500,00');
    });

    await user.clear(priceInput());
    await user.type(priceInput(), '19900,50');
    await user.click(screen.getByRole('button', { name: /kaydet/i }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalled();
    });

    const [payload] = updateProduct.mock.calls[0] as [{ product: { price: number } }];
    expect(payload.product.price).toBe(1_990_050);
  });
});
