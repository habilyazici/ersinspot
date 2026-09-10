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
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useListFilters } from './list-filters.ts';

/** Hook'un ürettiği adresi ve sayfayı teste görünür kılan küçük ekran. */
function Probe() {
  const { params, page, setFilter, clearFilters } = useListFilters();

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

  it('tüm süzgeçleri temizler', async () => {
    renderAt('/liste?durum=received&ara=buzdolabi&sayfa=4');

    await userEvent.click(screen.getByRole('button', { name: 'Temizle' }));

    expect(screen.getByTestId('sorgu').textContent).toBe('');
  });
});
