/**
 * Liste süzgeçleri.
 *
 * Bu yardımcı altı ekranda kopyalanmıştı ve kopyalar ayrışmıştı; ayrışmanın
 * iki sonucu da kullanıcıya yansıyordu (vitrindeki sayfalama hiç çalışmıyor,
 * mesaj listesi tarayıcı geçmişini kirletiyordu). Kural tek yere alındı;
 * denetim de burada.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { enumParam, useListFilters } from './list-filters.ts';

/** Hook'un ürettiği adresi ve sayfayı teste görünür kılan küçük ekran. */
function Probe() {
  const { params, page, setFilter, setFilters, clearFilters } = useListFilters();
  const navigate = useNavigate();

  return (
    <>
      <output data-testid="sorgu">{params.toString()}</output>
      <output data-testid="sayfa">{page}</output>

      <button type="button" onClick={() => setFilter('sayfa', '2')}>
        Sayfa 2
      </button>
      <button type="button" onClick={() => setFilter('durum', 'received')}>
        Süz
      </button>
      <button type="button" onClick={() => setFilter('durum', undefined)}>
        Süzgeci kaldır
      </button>
      <button type="button" onClick={clearFilters}>
        Temizle
      </button>
      <button
        type="button"
        onClick={() => {
          setFilters({ etiket: undefined, kategori: 'rehber' });
        }}
      >
        Değiştir
      </button>
      <button
        type="button"
        onClick={() => {
          void navigate(-1);
        }}
      >
        Geri
      </button>
    </>
  );
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/liste" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('liste süzgeçleri', () => {
  it('sayfa numarasını yazar', async () => {
    renderAt('/liste');

    await userEvent.click(screen.getByRole('button', { name: 'Sayfa 2' }));

    expect(screen.getByTestId('sorgu').textContent).toBe('sayfa=2');
    expect(screen.getByTestId('sayfa').textContent).toBe('2');
  });

  it('süzgeç değişince sayfayı başa alır', async () => {
    renderAt('/liste?sayfa=3');

    await userEvent.click(screen.getByRole('button', { name: 'Süz' }));

    expect(screen.getByTestId('sorgu').textContent).toBe('durum=received');
  });

  it('boş değer süzgeci kaldırır', async () => {
    renderAt('/liste?durum=received');

    await userEvent.click(screen.getByRole('button', { name: 'Süzgeci kaldır' }));

    expect(screen.getByTestId('sorgu').textContent).toBe('');
  });

  it('anlamsız sayfa numarasını ilk sayfaya düşürür', () => {
    /*
      `Number('abc')` `NaN` üretiyor ve bu değer sorguya konduğunda sunucu
      isteği reddediyordu: elle yazılmış bir bağlantı listeyi hata ekranına
      çeviriyordu.
    */
    renderAt('/liste?sayfa=abc');
    expect(screen.getByTestId('sayfa').textContent).toBe('1');
  });

  it('sıfır ve negatif sayfayı kabul etmez', () => {
    renderAt('/liste?sayfa=0');
    expect(screen.getByTestId('sayfa').textContent).toBe('1');
  });

  it('sayfa değişimini geçmişe yazar, geri tuşu bir önceki sayfaya döner', async () => {
    /*
      Sayfa değişimi de süzgeç gibi mevcut geçmiş kaydını değiştirseydi, 2.
      sayfadaki müşteri geri tuşuna bastığında 1. sayfaya değil listeden
      tamamen dışarı çıkardı.
    */
    renderAt('/liste');

    await userEvent.click(screen.getByRole('button', { name: 'Sayfa 2' }));
    expect(screen.getByTestId('sayfa').textContent).toBe('2');

    await userEvent.click(screen.getByRole('button', { name: 'Geri' }));
    expect(screen.getByTestId('sayfa').textContent).toBe('1');
  });

  it('süzgeç değişimini geçmişe yazmaz', async () => {
    /*
      Aksi halde her süzgeç dokunuşu bir geçmiş adımı olur; geri tuşu
      kullanıcıyı sayfadan çıkarmak yerine süzgeçler arasında gezdirirdi.
      Burada listeye iki kayıtlı bir geçmişle girilir: geri tuşu süzgeçten
      önceki hâle değil, listeden öncesine götürmelidir.
    */
    render(
      <MemoryRouter initialEntries={['/baslangic', '/liste']} initialIndex={1}>
        <Routes>
          <Route path="/liste" element={<Probe />} />
          <Route path="/baslangic" element={<p>başlangıç</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Süz' }));
    expect(screen.getByTestId('sorgu').textContent).toBe('durum=received');

    await userEvent.click(screen.getByRole('button', { name: 'Geri' }));
    expect(screen.getByText('başlangıç')).toBeInTheDocument();
  });

  it('tüm süzgeçleri temizler', async () => {
    renderAt('/liste?durum=received&ara=buzdolabi&sayfa=4');

    await userEvent.click(screen.getByRole('button', { name: 'Temizle' }));

    expect(screen.getByTestId('sorgu').textContent).toBe('');
  });
});

describe('kapalı küme süzgeçleri', () => {
  /*
    Tanınmayan değer olduğu gibi sunucuya geçirildiğinde şema onu reddediyor ve
    sayfa kalıcı bir hata ekranına dönüyordu: "Tekrar dene" aynı adresi
    çağırdığı için çıkışı da yoktu. Eskimiş bir yer imi bunun için yeter.
  */
  const durumlar = ['light_use', 'good', 'fair'] as const;

  it('kümedeki değeri geçirir', () => {
    expect(enumParam('good', durumlar)).toBe('good');
  });

  it('kümede olmayan değeri süzgeç saymaz', () => {
    expect(enumParam('xyz', durumlar)).toBeUndefined();
  });

  it('eksik değeri süzgeç saymaz', () => {
    expect(enumParam(null, durumlar)).toBeUndefined();
    expect(enumParam(undefined, durumlar)).toBeUndefined();
  });

  it('boş dizgeyi süzgeç saymaz', () => {
    expect(enumParam('', durumlar)).toBeUndefined();
  });
});

describe('çoklu süzgeç yazımı', () => {
  it('birbirini dışlayan iki süzgeci tek yazımda değiştirir', async () => {
    /*
      Ardışık iki `setFilter` çağrısı ikisi de aynı `params` değerinden türer;
      ikinci yazım birincisini siler. Kategori seçen blog okuru etiketin
      kalktığını değil, kategorinin hiç yazılmadığını görürdü.
    */
    renderAt('/liste?etiket=buzdolabi');

    await userEvent.click(screen.getByRole('button', { name: 'Değiştir' }));

    expect(screen.getByTestId('sorgu').textContent).toBe('kategori=rehber');
  });
});
