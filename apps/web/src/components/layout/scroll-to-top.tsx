import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Sayfa değişiminde görünümü başa alır.
 *
 * Tek sayfa uygulamasında gezinme yeni bir belge yüklemez; tarayıcı kaydırma
 * konumunu olduğu gibi bırakır. Uzun bir ürün listesinin dibinden detaya
 * geçen kullanıcı, yeni sayfanın ortasında açılır ve başlığı hiç görmez.
 *
 * Yalnızca yol değiştiğinde çalışır: sorgu dizesiyle yapılan filtreleme
 * (`/urunler?sayfa=2`) aynı sayfada kalır ve kullanıcının yerini korumak
 * doğru davranıştır.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
