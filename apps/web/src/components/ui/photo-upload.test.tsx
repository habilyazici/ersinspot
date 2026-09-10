/**
 * Fotoğraf yükleme.
 *
 * Buradaki asıl denetim TEK SEFERDE ÇOKLU SEÇİM: bileşen dosyaları sırayla
 * yüklüyor ve her yüklemeden sonra forma yazıyor. Yazarken render sırasında
 * yakalanmış `value` dizisini kullanırsa, her tur bir öncekini siler ve
 * kullanıcı üç fotoğraf seçtiğinde formda yalnızca sonuncusu kalır. Satış
 * talebi üç fotoğraf zorunlu kıldığı için o form hiç gönderilemez hâle gelirdi.
 */

import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoUpload } from './photo-upload.tsx';

const apiUpload = vi.hoisted(() => vi.fn());
const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({ apiUpload, apiRequest }));

/** Bileşeni gerçek bir form gibi kontrol eden sarmalayıcı. */
function Host() {
  const [photos, setPhotos] = useState<{ storageKey: string }[]>([]);

  return (
    <>
      <PhotoUpload
        label="Ürün Fotoğrafları"
        purpose="request_photo"
        value={photos}
        onChange={setPhotos}
        min={3}
      />
      <output data-testid="anahtarlar">{photos.map((photo) => photo.storageKey).join(',')}</output>
    </>
  );
}

function dosya(ad: string): File {
  return new File(['x'], ad, { type: 'image/png' });
}

describe('fotoğraf yükleme', () => {
  beforeEach(() => {
    apiUpload.mockReset();
    apiRequest.mockReset();
    apiUpload.mockImplementation((_path: string, file: File) =>
      Promise.resolve({
        file: { storageKey: `anahtar/${file.name}`, url: `http://ornek/${file.name}` },
      }),
    );
  });

  it('tek seferde seçilen fotoğrafların HEPSİNİ forma yazar', async () => {
    render(<Host />);

    await userEvent.upload(screen.getByLabelText(/Ürün Fotoğrafları/), [
      dosya('bir.png'),
      dosya('iki.png'),
      dosya('uc.png'),
    ]);

    await waitFor(() => {
      expect(screen.getByTestId('anahtarlar').textContent).toBe(
        'anahtar/bir.png,anahtar/iki.png,anahtar/uc.png',
      );
    });

    expect(apiUpload).toHaveBeenCalledTimes(3);
  });

  it('başarısız yüklemeyi listeye yazmaz, diğerlerini korur', async () => {
    apiUpload.mockImplementation((_path: string, file: File) =>
      file.name === 'iki.png'
        ? Promise.reject(new Error('yükleme koptu'))
        : Promise.resolve({
            file: { storageKey: `anahtar/${file.name}`, url: `http://ornek/${file.name}` },
          }),
    );

    render(<Host />);

    await userEvent.upload(screen.getByLabelText(/Ürün Fotoğrafları/), [
      dosya('bir.png'),
      dosya('iki.png'),
      dosya('uc.png'),
    ]);

    await waitFor(() => {
      expect(screen.getByTestId('anahtarlar').textContent).toBe('anahtar/bir.png,anahtar/uc.png');
    });

    expect(screen.getByText('Fotoğraf yüklenemedi. Lütfen tekrar deneyin.')).toBeInTheDocument();
  });

  it('üst sınırı aşan seçimi kırpar', async () => {
    render(
      (() => {
        function Sinirli() {
          const [photos, setPhotos] = useState<{ storageKey: string }[]>([]);
          return (
            <>
              <PhotoUpload
                label="Ürün Fotoğrafları"
                purpose="request_photo"
                value={photos}
                onChange={setPhotos}
                max={2}
              />
              <output data-testid="anahtarlar">
                {photos.map((photo) => photo.storageKey).join(',')}
              </output>
            </>
          );
        }
        return <Sinirli />;
      })(),
    );

    await userEvent.upload(screen.getByLabelText(/Ürün Fotoğrafları/), [
      dosya('bir.png'),
      dosya('iki.png'),
      dosya('uc.png'),
    ]);

    await waitFor(() => {
      expect(screen.getByTestId('anahtarlar').textContent).toBe('anahtar/bir.png,anahtar/iki.png');
    });

    expect(apiUpload).toHaveBeenCalledTimes(2);
  });
});
