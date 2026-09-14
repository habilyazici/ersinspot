/**
 * Uygulama hata sınırı.
 *
 * Son çare ağıdır: bir bileşen çizim sırasında çökerse ekranın bomboş
 * kalmasını engeller. İki davranışı denetlenir ve ikisi de yanlış çalıştığında
 * sessizdir — beyaz ekranı kimse raporlamaz, sızan bir hata metnini de kimse
 * fark etmez.
 */

import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './error-boundary.tsx';

/** Çizim sırasında patlayan bileşen. */
function Patlayan(): never {
  throw new Error('veritabanı bağlantısı reddedildi: user=ersinspot host=10.0.0.4');
}

afterEach(() => {
  window.removeEventListener('error', engelle);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/**
 * Çöken çizimin ürettiği gürültüyü susturur.
 *
 * Üç kaynak var: sınırın kendi `console.error` çağrısı, React'in geliştirme
 * uyarısı ve jsdom'un `reportError` üzerinden yeniden fırlattığı hata. Sonuncusu
 * susturulmazsa geçen bir koşu bile altı satır kırmızı hata basar ve gerçek
 * bir arıza bu gürültünün içinde kaybolur.
 */
function sustur(): void {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  /*
    jsdom, sınırın yakaladığı hatayı pencerenin `error` olayı olarak yeniden
    yayar ve sanal konsola basar. `preventDefault`, "bu hata ele alındı" demenin
    yoludur.
  */
  window.addEventListener('error', engelle);
}

function engelle(event: ErrorEvent): void {
  event.preventDefault();
}

describe('hata sınırı', () => {
  it('sağlam ağaçta çocuklarını çizer', () => {
    render(
      <AppErrorBoundary>
        <p>içerik</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText('içerik')).toBeInTheDocument();
  });

  it('çöken bileşende beyaz ekran yerine açıklama gösterir', () => {
    sustur();

    render(
      <AppErrorBoundary>
        <Patlayan />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bir şeyler ters gitti');
    expect(screen.getByRole('button', { name: 'Sayfayı yenile' })).toBeInTheDocument();
  });

  it('üretimde hata metnini ekrana koymaz', () => {
    /*
      Hata mesajı veritabanı kullanıcı adı, sunucu adresi ya da sorgu metni
      taşıyabilir. Geliştirmede gösterilir — orada faydalıdır — ama üretimde
      ekrana basılması, kullanıcının göremeyeceği bir şeyi ona vermektir.
    */
    vi.stubEnv('DEV', false);
    sustur();

    const { container } = render(
      <AppErrorBoundary>
        <Patlayan />
      </AppErrorBoundary>,
    );

    expect(container.textContent).not.toContain('veritabanı bağlantısı reddedildi');
    expect(container.textContent).not.toContain('10.0.0.4');
    expect(container.querySelector('pre')).toBeNull();
  });

  it('geliştirmede hata metnini gösterir', () => {
    vi.stubEnv('DEV', true);
    sustur();

    const { container } = render(
      <AppErrorBoundary>
        <Patlayan />
      </AppErrorBoundary>,
    );

    expect(container.querySelector('pre')?.textContent).toContain(
      'veritabanı bağlantısı reddedildi',
    );
  });
});
