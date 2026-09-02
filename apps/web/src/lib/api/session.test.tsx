/**
 * Oturumsuz ziyaretçi davranışı.
 *
 * Vitrin herkese açıktır; misafir bir ziyaretçi anasayfayı açtığında giriş
 * sayfasına ATILMAMALIDIR.
 *
 * Bu test bir gerilemeyi kapatıyor: API istemcisi 401 aldığında doğrudan
 * `/giris` adresine yönlendiriyordu. Misafirde de 401 dönen uçlar var —
 * başlıktaki sepet sayacı ve oturum sorgusu her sayfada çalışır — ve sonuç,
 * siteyi açan HERKESİN giriş formuna düşmesiydi. Yönlendirme artık yalnızca
 * rota koruyucusunun işi; istemci sadece oturum önbelleğini düşürür.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '@/App.tsx';
import { queryClient } from '@/lib/api';

/** Oturum gerektiren uçlar 401, herkese açık olanlar boş liste döndürür. */
function stubServer(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      const unauthenticated =
        url.includes('/api/auth/me') || url.includes('/api/cart') || url.includes('/api/orders');

      if (unauthenticated) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ error: { code: 'unauthenticated', message: 'Giriş gerekiyor.' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            items: [],
            page: 1,
            pageSize: 24,
            totalItems: 0,
            totalPages: 1,
            settings: {},
            categories: [],
            brands: [],
            faqs: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    }),
  );
}

beforeEach(() => {
  queryClient.clear();
  window.history.pushState({}, '', '/');
  stubServer();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it('misafir ziyaretçiyi anasayfadan giriş sayfasına atmaz', async () => {
  render(<App />);

  // Oturum sorgusu tamamlanana kadar bekle: yönlendirme olacaksa burada olur.
  await waitFor(() => {
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(window.location.pathname).toBe('/');
  });

  // Giriş bağlantısı görünür ama giriş SAYFASI açılmamış olmalı.
  expect(screen.getByRole('link', { name: /giriş yap/i })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/');
});
