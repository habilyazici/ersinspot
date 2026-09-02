/**
 * Nakliye talebi formunun testleri.
 *
 * Denetlenen asıl şey, EKRANDAKİ TAHMİN İLE SUNUCUNUN KAYDEDECEĞİ TAHMİNİN
 * aynı olması. İkisi de `estimateMoving` fonksiyonunu çağırır ama girdileri
 * ayrı yerlerde kurulur; sunucu eşya ADEDİNİ toplarken form bir süre SATIR
 * SAYISINI geçiriyordu. "1 satır × 5 adet" durumunda müşteri bir tutar görüp
 * kaydında başka bir tutar buluyordu.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { estimateMoving, money } from '@ersinspot/shared';
import type * as ServicingModule from '@/features/servicing';

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { fullName: 'Ayşe Yılmaz', phone: '+905071940550' } }),
}));

vi.mock('@/features/servicing', async (importOriginal) => ({
  ...(await importOriginal<typeof ServicingModule>()),
  useCreateMovingRequest: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { default: MovingPage } = await import('./moving.tsx');

/** Ekrandaki tutarlar bölünemez boşluk taşır; düz karşılaştırma için sadeleştirilir. */
function normalize(text: string): string {
  return text.replace(/\u00a0/g, ' ');
}

/**
 * Özet listesindeki "Tahmin" satırının tutarı.
 *
 * `dt`/`dd` çiftinde etiketten değere geçmenin doğrudan bir sorgusu yok; metni
 * tam eşleşmeyle bulup kardeş öğeyi okumak en az varsayım yapan yol.
 */
function shownTotal(): string {
  const label = screen.getByText('Tahmin', { selector: 'dt' });
  return normalize(label.nextElementSibling?.textContent ?? '');
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MovingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Sunucunun aynı girdiyle kaydedeceği tahmin. */
function serverEstimate(itemCount: number): string {
  return money.format(
    estimateMoving({
      houseSize: '2+1',
      fromFloor: 0,
      fromHasElevator: false,
      toFloor: 0,
      toHasElevator: false,
      itemCount,
      needsPacking: false,
      needsAssembly: false,
    }).total,
    { hideDecimalsWhenWhole: true },
  );
}

describe('nakliye tahmini', () => {
  it('tek eşyada sunucunun hesabıyla aynı tutarı gösterir', () => {
    renderPage();

    expect(shownTotal()).toBe(normalize(serverEstimate(1)));
  });

  it('adet artırıldığında satır sayısını değil ADEDİ sayar', async () => {
    const user = userEvent.setup();
    renderPage();

    const quantity = screen.getByLabelText(/adet/i);
    await user.clear(quantity);
    await user.type(quantity, '5');

    expect(shownTotal()).toBe(normalize(serverEstimate(5)));
  });

  it('adet alanı boşaltıldığında çökmez', async () => {
    const user = userEvent.setup();
    renderPage();

    // Boş sayı girdisi `NaN` üretir; para fonksiyonları bunu istisna ile reddeder.
    await user.clear(screen.getByLabelText(/adet/i));

    expect(shownTotal()).toBe(normalize(serverEstimate(0)));
  });
});
