/**
 * Sekme başlığı.
 *
 * Tek sayfalık uygulamada `<title>` yalnızca ilk yüklemede gelir; rota
 * değiştikçe güncellenmezse ekran okuyucu kullanıcısı yer değiştirdiğini
 * duymaz, geçmiş ve yer imleri birbirinden ayırt edilemez.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PageHeader } from '@/components/ui/page.tsx';
import { documentTitleFor, useDocumentTitle, useMetaDescription } from './document-head.ts';

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

describe('arama sonucu açıklaması', () => {
  function oku(secici: string): string | null {
    return document.querySelector(secici)?.getAttribute('content') ?? null;
  }

  function Sayfa({ aciklama }: { aciklama: string | undefined }) {
    useMetaDescription(aciklama);
    return null;
  }

  beforeEach(() => {
    document.head.innerHTML =
      '<meta name="description" content="Site açıklaması." />' +
      '<meta property="og:description" content="Site açıklaması." />';
  });

  it('sayfanın kendi açıklamasını yazar', () => {
    render(<Sayfa aciklama="Arçelik No Frost buzdolabı, az kullanılmış." />);

    expect(oku('meta[name="description"]')).toBe('Arçelik No Frost buzdolabı, az kullanılmış.');
  });

  it('paylaşım önizlemesini de günceller', () => {
    /*
      İkisi ayrışırsa aynı sayfa iki farklı özetle dolaşır: arama sonucunda bir
      cümle, WhatsApp önizlemesinde başka bir cümle.
    */
    render(<Sayfa aciklama="Bosch 9 kg çamaşır makinesi." />);

    expect(oku('meta[property="og:description"]')).toBe('Bosch 9 kg çamaşır makinesi.');
  });

  it('sayfadan ayrılınca site açıklamasına döner', async () => {
    /*
      Açıklama BELİRLEMEYEN sayfalar bir öncekinin metnini devralmamalıdır.

      Site açıklaması modül İLK YÜKLENDİĞİNDE okunur; tarayıcıda `index.html`
      ayrıştırıldıktan sonra çalıştığı için etiket oradadır. Testte sıra terstir,
      bu yüzden etiket kurulup modül yeniden yükleniyor.
    */
    vi.resetModules();
    document.head.innerHTML = '<meta name="description" content="Site açıklaması." />';

    const { useMetaDescription: kanca } = await import('./document-head.ts');

    function Yeni() {
      kanca('Geçici açıklama.');
      return null;
    }

    const { unmount } = render(<Yeni />);
    expect(oku('meta[name="description"]')).toBe('Geçici açıklama.');

    unmount();
    expect(oku('meta[name="description"]')).toBe('Site açıklaması.');
  });

  it('uzun metni kelime sınırında kısaltır', () => {
    const uzun = `${'Buzdolabı '.repeat(30)}son`;

    render(<Sayfa aciklama={uzun} />);
    const yazilan = oku('meta[name="description"]') ?? '';

    expect(yazilan.length).toBeLessThanOrEqual(156);
    expect(yazilan.endsWith('…')).toBe(true);
    // Kelimenin ortasından kesilmemiştir.
    expect(yazilan).not.toMatch(/Buzdo…$/);
  });

  it('boş açıklama etiketi bozmaz', () => {
    render(<Sayfa aciklama={undefined} />);

    expect(oku('meta[name="description"]')).toBe('Site açıklaması.');
  });

  it('anasayfanın iki ayrı varsayılanını karıştırmaz', async () => {
    /*
      `index.html` anasayfa için iki metin yazar: arama sonucu açıklaması uzun,
      paylaşım önizlemesi kısa. Tek varsayılana indirgenirse /urunler'e gidip
      anasayfaya dönen ziyaretçi farklı bir önizleme metni bırakır.
    */
    vi.resetModules();
    document.head.innerHTML =
      '<meta name="description" content="Uzun site açıklaması." />' +
      '<meta property="og:description" content="Kısa paylaşım metni." />';

    const { useMetaDescription: kanca } = await import('./document-head.ts');

    function Yeni() {
      kanca('Sayfa açıklaması.');
      return null;
    }

    const { unmount } = render(<Yeni />);
    unmount();

    expect(oku('meta[name="description"]')).toBe('Uzun site açıklaması.');
    expect(oku('meta[property="og:description"]')).toBe('Kısa paylaşım metni.');
  });
});
