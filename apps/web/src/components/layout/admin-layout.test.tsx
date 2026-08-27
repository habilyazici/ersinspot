/**
 * Yönetim düzeni testleri.
 *
 * İki davranış denetlenir:
 *
 * 1. Ayarlar bağlantısı yalnızca YÖNETİCİYE görünür. Personelin tıklayıp 403
 *    alması işlevsel bir hata değildir ama kötü bir arayüzdür: kullanıcıya
 *    yapamayacağı bir işlem gösterilmemelidir. Asıl koruma sunucudadır
 *    (`requireAdmin`) ve onun ayrı testi var.
 *
 * 2. Okunmamış mesaj rozeti yalnızca sayı sıfırdan büyükken çıkar. Sıfır
 *    yazan bir rozet, dikkat isteyen bir şey varmış izlenimi verir.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '@ersinspot/shared';

const state: { role: CurrentUser['role']; unread: number | undefined } = {
  role: 'staff',
  unread: 0,
};

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'kisi@ornek.com',
      fullName: 'Test Kişi',
      phone: '+905071940550',
      role: state.role,
      emailVerified: true,
      createdAt: new Date().toISOString(),
    },
    isAuthenticated: true,
    isStaff: true,
    isLoading: false,
  }),
}));

vi.mock('@/features/content', () => ({
  useUnreadMessageCount: () => ({ data: state.unread }),
}));

const { AdminLayout } = await import('./admin-layout.tsx');

function renderLayout(): void {
  render(
    <MemoryRouter initialEntries={['/yonetim']}>
      <Routes>
        <Route path="/yonetim" element={<AdminLayout />}>
          <Route index element={<p>Panel içeriği</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Yönetim düzeni', () => {
  it('personele ayarlar bağlantısını göstermez', () => {
    state.role = 'staff';
    state.unread = 0;
    renderLayout();

    expect(screen.getByRole('link', { name: /Siparişler/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ayarlar/ })).not.toBeInTheDocument();
  });

  it('yöneticiye ayarlar bağlantısını gösterir', () => {
    state.role = 'admin';
    state.unread = 0;
    renderLayout();

    expect(screen.getByRole('link', { name: /Ayarlar/ })).toBeInTheDocument();
  });

  it('okunmamış mesaj yokken rozet göstermez', () => {
    state.role = 'staff';
    state.unread = 0;
    renderLayout();

    const link = screen.getByRole('link', { name: /Mesajlar/ });
    expect(link.textContent).toBe('Mesajlar');
  });

  it('okunmamış mesaj sayısını rozette gösterir', () => {
    state.role = 'staff';
    state.unread = 3;
    renderLayout();

    expect(screen.getByRole('link', { name: /Mesajlar/ }).textContent).toContain('3');
  });

  it('alt sayfayı düzenin içinde gösterir', () => {
    state.role = 'staff';
    state.unread = 0;
    renderLayout();

    expect(screen.getByText('Panel içeriği')).toBeInTheDocument();
  });
});
