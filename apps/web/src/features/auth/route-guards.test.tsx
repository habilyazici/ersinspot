/**
 * Rota koruyucularının testleri.
 *
 * Yönetim paneli tek bir koruyucuya dayanır: `RequireStaff` dış rotada durur
 * ve alt sayfalarda yetki tekrar kontrol edilmez. Bu bilinçli bir tercih —
 * iki yerde kontrol etmek, birinin unutulması hâlinde diğerine güvenmeye yol
 * açar — ama tek noktaya dayanmanın bedeli, o noktanın sessizce bozulabilir
 * olmasıdır. Testler tam olarak bunu engeller.
 *
 * Sunucu tarafında yetki zaten `requireStaff` ile kesiliyor ve testleri var;
 * buradaki koruma erişimin ENGELLENMESİ için değil, yetkisiz kullanıcıya
 * çalışmayacak bir arayüz gösterilmemesi içindir.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { CurrentUser, UserRole } from '@ersinspot/shared';
import { hasRoleAtLeast } from '@ersinspot/shared';

/** Testin kontrol ettiği oturum durumu. */
const auth: {
  current: {
    user: CurrentUser | null;
    isAuthenticated: boolean;
    isStaff: boolean;
    isLoading: boolean;
    hasRole: (role: UserRole) => boolean;
  };
} = {
  current: {
    user: null,
    isAuthenticated: false,
    isStaff: false,
    isLoading: false,
    hasRole: () => false,
  },
};

vi.mock('./use-auth.ts', () => ({ useAuth: () => auth.current }));

const { RequireAdmin, RequireAuth, RequireStaff } = await import('./route-guards.tsx');

function makeUser(role: CurrentUser['role']): CurrentUser {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'kisi@ornek.com',
    fullName: 'Test Kişi',
    phone: '+905071940550',
    role,
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };
}

function signedOut(): void {
  auth.current = {
    user: null,
    isAuthenticated: false,
    isStaff: false,
    isLoading: false,
    hasRole: () => false,
  };
}

function signedInAs(role: CurrentUser['role']): void {
  auth.current = {
    user: makeUser(role),
    isAuthenticated: true,
    isStaff: hasRoleAtLeast(role, 'staff'),
    isLoading: false,
    // Gerçek `useAuth` ile aynı hiyerarşi: yönetici, personelin yerine geçer.
    hasRole: (required) => hasRoleAtLeast(role, required),
  };
}

/** Koruyucuyu gerçek bir yönlendirici içinde çalıştırır. */
function renderGuarded(guard: 'auth' | 'staff' | 'admin', at = '/korunan'): void {
  const Guard = guard === 'staff' ? RequireStaff : guard === 'admin' ? RequireAdmin : RequireAuth;

  render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/" element={<p>Anasayfa</p>} />
        <Route path="/giris" element={<p>Giriş sayfası</p>} />
        <Route
          path="/korunan"
          element={
            <Guard>
              <p>Gizli içerik</p>
            </Guard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('oturumsuz kullanıcıyı giriş sayfasına gönderir', () => {
    signedOut();
    renderGuarded('auth');

    expect(screen.getByText('Giriş sayfası')).toBeInTheDocument();
    expect(screen.queryByText('Gizli içerik')).not.toBeInTheDocument();
  });

  it('giriş yapmış kullanıcıyı içeri alır', () => {
    signedInAs('customer');
    renderGuarded('auth');

    expect(screen.getByText('Gizli içerik')).toBeInTheDocument();
  });

  it('oturum kontrolü sürerken içeriği göstermez', () => {
    /*
      Yükleme sırasında içeriği göstermek, yetkisiz kullanıcıya bir an için
      korunan ekranı sızdırırdı; ayrıca oturum sonradan geçersiz çıkarsa
      kullanıcı kısa süre çalışan bir arayüz görüp aniden atılırdı.
    */
    auth.current = {
      user: null,
      isAuthenticated: false,
      isStaff: false,
      isLoading: true,
      hasRole: () => false,
    };
    renderGuarded('auth');

    expect(screen.queryByText('Gizli içerik')).not.toBeInTheDocument();
    expect(screen.queryByText('Giriş sayfası')).not.toBeInTheDocument();
  });
});

describe('RequireStaff', () => {
  it('oturumsuz kullanıcıyı giriş sayfasına gönderir', () => {
    signedOut();
    renderGuarded('staff');

    expect(screen.getByText('Giriş sayfası')).toBeInTheDocument();
  });

  it('MÜŞTERİYİ yönetim paneline sokmaz', () => {
    // Panelin tamamı bu tek kontrole dayanır.
    signedInAs('customer');
    renderGuarded('staff');

    expect(screen.queryByText('Gizli içerik')).not.toBeInTheDocument();
    expect(screen.getByText('Anasayfa')).toBeInTheDocument();
  });

  it('personeli içeri alır', () => {
    signedInAs('staff');
    renderGuarded('staff');

    expect(screen.getByText('Gizli içerik')).toBeInTheDocument();
  });

  it('yöneticiyi içeri alır', () => {
    signedInAs('admin');
    renderGuarded('staff');

    expect(screen.getByText('Gizli içerik')).toBeInTheDocument();
  });

  it('yetki kontrolü sürerken içeriği göstermez', () => {
    auth.current = {
      user: null,
      isAuthenticated: false,
      isStaff: false,
      isLoading: true,
      hasRole: () => false,
    };
    renderGuarded('staff');

    expect(screen.queryByText('Gizli içerik')).not.toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  it('PERSONELİ yönetici bölümüne sokmaz', () => {
    // Menüde bağlantı gizli olsa da adres elle yazılabilir.
    signedInAs('staff');
    renderGuarded('admin');

    expect(screen.queryByText('Gizli içerik')).not.toBeInTheDocument();
    expect(screen.getByText('Anasayfa')).toBeInTheDocument();
  });

  it('yöneticiyi içeri alır', () => {
    signedInAs('admin');
    renderGuarded('admin');

    expect(screen.getByText('Gizli içerik')).toBeInTheDocument();
  });

  it('oturumsuz kullanıcıyı giriş sayfasına gönderir', () => {
    signedOut();
    renderGuarded('admin');

    expect(screen.getByText('Giriş sayfası')).toBeInTheDocument();
  });
});
