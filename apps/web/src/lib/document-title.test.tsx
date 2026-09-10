/**
 * Sekme başlığı.
 *
 * Tek sayfalık uygulamada `<title>` yalnızca ilk yüklemede gelir; rota
 * değiştikçe güncellenmezse ekran okuyucu kullanıcısı yer değiştirdiğini
 * duymaz, geçmiş ve yer imleri birbirinden ayırt edilemez.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { PageHeader } from '@/components/ui/page.tsx';
import { documentTitleFor, useDocumentTitle } from './document-title.ts';

/** Modül yüklendiğinde okunan varsayılan; testte de aynı değer beklenir. */
const VARSAYILAN = document.title;

afterEach(() => {
  document.title = VARSAYILAN;
});

function Sayfa({ baslik }: { baslik: string }) {
  return (
    <MemoryRouter>
      <PageHeader title={baslik} />
    </MemoryRouter>
  );
}

function Kancali({ baslik }: { baslik: string | undefined }) {
  useDocumentTitle(baslik);
  return <p>içerik</p>;
}

describe('sekme başlığı', () => {
  it('PageHeader sayfa adını sekmeye yazar', () => {
    render(<Sayfa baslik="İkinci El Ürünler" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('İkinci El Ürünler');
    expect(document.title).toBe('İkinci El Ürünler — Ersin Spot');
  });

  it('sayfadan ayrılınca varsayılana döner', () => {
    const { unmount } = render(<Sayfa baslik="İletişim" />);
    expect(document.title).toBe(documentTitleFor('İletişim'));

    unmount();

    expect(document.title).toBe(VARSAYILAN);
  });

  it('başlık değişince sekme de değişir', () => {
    const { rerender } = render(<Kancali baslik="Blog" />);
    expect(document.title).toBe(documentTitleFor('Blog'));

    rerender(<Kancali baslik="Sıkça Sorulan Sorular" />);

    expect(document.title).toBe(documentTitleFor('Sıkça Sorulan Sorular'));
  });

  it('başlık henüz bilinmiyorken varsayılanı bozmaz', () => {
    /*
      Ürün detayı sayfası kancayı ürün yüklenmeden önce de çağırır; o anda
      geçilen değer `undefined` olur ve sekmede "undefined — Ersin Spot"
      yazmamalıdır.
    */
    render(<Kancali baslik={undefined} />);

    expect(document.title).toBe(VARSAYILAN);
  });
});
