/**
 * Ödeme sayfası testleri.
 *
 * Denetlenen asıl şey tutar tutarlılığı: kullanıcının ekranda gördüğü toplam
 * ile sunucuya `expectedTotal` olarak bildirilen değer aynı olmalıdır. Bu ikisi
 * ayrışırsa sunucu siparişi reddeder ve kullanıcı sebebini anlamaz.
 *
 * İkinci denetlenen şey, teslimat yöntemi değişince randevu alanlarının karşı
 * kola taşınması: alanların adı değiştiği için taşıma yapılmazsa ekranda dolu
 * görünen form sessizce geçersiz olur.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cart, CreateOrderInput } from '@ersinspot/shared';
import type * as OrderingModule from '@/features/ordering';

/**
 * Para biçimi eşleştirici.
 *
 * Intl, simge ile sayı arasına bölünemez boşluk koyar; düz dizge karşılaştırması
 * bu yüzden başarısız olur.
 */
const money =
  (expected: string) =>
  (_content: string, element: Element | null): boolean =>
    element?.textContent?.replace(/\u00a0/g, ' ') === expected;

/** Bugünden 30 gün sonrası: randevu için geçerli aralıkta (en fazla 60 gün). */
function validAppointmentDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 30);
  return date.toISOString().slice(0, 10);
}

const mockMutate = vi.fn();
const cart: { current: Cart } = {
  current: {
    items: [
      {
        productId: '11111111-1111-4111-8111-111111111111',
        slug: 'buzdolabi',
        title: 'Arçelik Buzdolabı',
        coverImageUrl: null,
        condition: 'good',
        price: 800_000, // 8.000 TL
        isAvailable: true,
      },
    ],
    subtotal: 800_000,
    hasUnavailableItems: false,
  },
};

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { fullName: 'Ayşe Yılmaz', phone: '+905071940550' } }),
}));

/*
  Yalnızca ağ hook'ları taklit edilir; `OrderTotals` gerçek bileşendir.
  Test ekranda görünen tutarı okuyor — o tutarı üreten kodun taklit olması
  testi anlamsız kılardı.
*/
vi.mock('@/features/ordering', async (importOriginal) => ({
  ...(await importOriginal<typeof OrderingModule>()),
  useCart: () => ({ data: cart.current, isLoading: false }),
  useCreateOrder: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { default: CheckoutPage } = await import('./checkout.tsx');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Gönderilen yükü döndürür; gönderim yapılmadıysa testi düşürür. */
function submittedPayload(): CreateOrderInput {
  expect(mockMutate).toHaveBeenCalled();
  return mockMutate.mock.calls[0]?.[0] as CreateOrderInput;
}

describe('Ödeme sayfası', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('ekranda gösterilen toplam ile gönderilen expectedTotal aynıdır', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText(/İlçe/), 'Bornova');
    await user.type(screen.getByLabelText(/Mahalle/), 'Kazımdirik');
    await user.type(screen.getByLabelText(/Sokak/), '296 Sokak');
    await user.type(screen.getByLabelText(/Bina No/), '12');

    // Bornova ilçe dışı: 500 TL teslimat ücreti eklenir (8.000 TL < 15.000 TL eşik).
    expect(await screen.findByText(money('₺8.500'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Siparişi Onayla/ }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalled());

    // 8.000 TL ürün + 500 TL teslimat = 850.000 kuruş
    expect(submittedPayload().expectedTotal).toBe(850_000);
  });

  it('mağazadan alıma geçince randevu bilgisi kaybolmaz', async () => {
    const user = userEvent.setup();
    renderPage();

    const randevuGunu = validAppointmentDate();

    const tarih = screen.getByLabelText(/Tarih/);
    await user.clear(tarih);
    await user.type(tarih, randevuGunu);
    await user.selectOptions(screen.getByLabelText(/Saat Aralığı/), '13:00');

    await user.click(screen.getByRole('radio', { name: /Mağazadan Teslim/i }));

    // Adres alanları kaybolur; randevu bilgisi korunur.
    await waitFor(() => {
      expect(screen.queryByLabelText(/Mahalle/)).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Tarih/)).toHaveValue(randevuGunu);
    expect(screen.getByLabelText(/Saat Aralığı/)).toHaveValue('13:00');

    await user.click(screen.getByRole('button', { name: /Siparişi Onayla/ }));
    await waitFor(() => expect(mockMutate).toHaveBeenCalled());

    const payload = submittedPayload();
    expect(payload.delivery).toMatchObject({
      method: 'store_pickup',
      pickupDate: randevuGunu,
      pickupTimeSlot: { startTime: '13:00', endTime: '15:00' },
    });

    // Mağazadan alımda teslimat ücreti yoktur.
    expect(payload.expectedTotal).toBe(800_000);
  });

  it('satışta olmayan ürün varsa sipariş adımı açılmaz', () => {
    cart.current = { ...cart.current, hasUnavailableItems: true };
    renderPage();

    expect(screen.getByText(/satışta olmayan ürün var/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Siparişi Onayla/ })).not.toBeInTheDocument();

    cart.current = { ...cart.current, hasUnavailableItems: false };
  });
});
