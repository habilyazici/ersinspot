/**
 * Sepet sayfası testleri.
 *
 * Denetlenen şey, sepeti boşaltmanın ULAŞILABİLİR olmasıdır. Sunucu tarafı
 * eksiksizdi — `DELETE /api/cart` ucu, `clearCart` servisi ve kendi testleri
 * yazılmıştı — ve arayüzdeki `useClearCart` kancası da duruyordu; yalnızca o
 * kancayı çağıran bir düğme hiç eklenmemişti. Hiçbir tip hatası, hiçbir test
 * bunu göstermez: çalışan ama ulaşılamayan kod sessizdir.
 *
 * İkinci denetlenen şey, düğmenin tek kalemlik sepette çıkmaması: orada
 * kalemin kendi çöp kutusu zaten aynı işi yapar ve iki düğme, birinin ne
 * yaptığını belirsizleştirir.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cart } from '@ersinspot/shared';
import type * as OrderingModule from '@/features/ordering';

const mockClear = vi.fn();
const mockRemove = vi.fn();

function item(id: string, title: string): Cart['items'][number] {
  return {
    productId: id,
    slug: title.toLowerCase(),
    title,
    coverImageUrl: null,
    condition: 'good',
    price: 800_000,
    isAvailable: true,
  };
}

const cart: { current: Cart } = {
  current: { items: [], subtotal: 0, hasUnavailableItems: false },
};

vi.mock('@/features/ordering', async (importOriginal) => ({
  ...(await importOriginal<typeof OrderingModule>()),
  useCart: () => ({ data: cart.current, isLoading: false, isError: false }),
  useClearCart: () => ({ mutate: mockClear, isPending: false }),
  useRemoveFromCart: () => ({ mutate: mockRemove, isPending: false }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { default: CartPage } = await import('./cart.tsx');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Sepet sayfası', () => {
  beforeEach(() => {
    mockClear.mockClear();
    mockRemove.mockClear();
    cart.current = {
      items: [
        item('11111111-1111-4111-8111-111111111111', 'Buzdolabı'),
        item('22222222-2222-4222-8222-222222222222', 'Çamaşır Makinesi'),
      ],
      subtotal: 1_600_000,
      hasUnavailableItems: false,
    };
  });

  it('sepeti boşaltma düğmesi isteği gönderir', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Sepeti boşalt' }));

    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('tek kalemlik sepette boşaltma düğmesi çıkmaz', () => {
    cart.current = {
      items: [item('11111111-1111-4111-8111-111111111111', 'Buzdolabı')],
      subtotal: 800_000,
      hasUnavailableItems: false,
    };

    renderPage();

    expect(screen.queryByRole('button', { name: 'Sepeti boşalt' })).toBeNull();
    // Kalemin kendi çıkarma düğmesi yerinde durur.
    expect(
      screen.getByRole('button', { name: '"Buzdolabı" ürününü sepetten çıkar' }),
    ).toBeInTheDocument();
  });

  it('boş sepette tek bir h1 gösterir', () => {
    cart.current = { items: [], subtotal: 0, hasUnavailableItems: false };

    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sepetiniz boş');
  });
});
