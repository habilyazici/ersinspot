/**
 * Site başlığı — mobil menü.
 *
 * Panel telefonda ekranın neredeyse tamamını kaplar. Klavye veya ekran
 * okuyucu kullanan biri için tek çıkış yolu listenin sonuna kadar sekmelemek
 * olmamalıdır; Escape kapatır ve odağı açan düğmeye geri verir.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ isAuthenticated: false, isStaff: false, user: null }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/features/ordering', () => ({
  useCartCount: () => ({ data: 0 }),
}));

const { SiteHeader } = await import('./site-header.tsx');

function renderHeader(): void {
  render(
    <MemoryRouter>
      <SiteHeader />
    </MemoryRouter>,
  );
}

function menuButton(): HTMLElement {
  return screen.getByRole('button', { name: /Menüyü/ });
}

describe('mobil menü', () => {
  it('kapalıyken panel çizilmez', () => {
    renderHeader();

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Mobil menü' })).not.toBeInTheDocument();
  });

  it('düğme paneli işaret eder', async () => {
    renderHeader();

    await userEvent.click(menuButton());

    const panel = screen.getByRole('navigation', { name: 'Mobil menü' });
    expect(menuButton()).toHaveAttribute('aria-controls', panel.id);
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
  });

  it('Escape kapatır ve odağı düğmeye geri verir', async () => {
    renderHeader();

    await userEvent.click(menuButton());
    expect(screen.getByRole('navigation', { name: 'Mobil menü' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('navigation', { name: 'Mobil menü' })).not.toBeInTheDocument();
    expect(menuButton()).toHaveFocus();
  });

  it('bağlantıya gidildiğinde kapanır', async () => {
    renderHeader();

    await userEvent.click(menuButton());
    await userEvent.click(
      screen.getByRole('navigation', { name: 'Mobil menü' }).querySelector('a[href="/urunler"]')!,
    );

    expect(screen.queryByRole('navigation', { name: 'Mobil menü' })).not.toBeInTheDocument();
  });
});
