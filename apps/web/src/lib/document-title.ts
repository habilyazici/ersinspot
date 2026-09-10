import { useEffect } from 'react';

/**
 * Sekme başlığı.
 *
 * Uygulama tek sayfalık olduğu için `<title>` yalnızca ilk yüklemede
 * `index.html` içinden gelir ve rota değiştikçe olduğu gibi kalırdı. Sonucu üç
 * yerde görülüyordu:
 *
 *   • Ekran okuyucu, gezinmeden sonra kullanıcının nerede olduğunu başlıktan
 *     duyurur; her sayfada aynı cümleyi duyan kullanıcı yer değiştirdiğini
 *     anlamıyordu.
 *   • Tarayıcı geçmişi ve yer imleri birbirinden ayırt edilemiyordu.
 *   • Arama sonucunda her sayfa aynı başlıkla görünüyordu — ürün ilanları ve
 *     blog yazıları dahil.
 *
 * Sayfa adı `PageHeader`'ın `title` özelliğinde zaten var; başlık oradan
 * türetilir, ayrı bir yerde ikinci kez yazılmaz.
 */

/**
 * `index.html` içindeki başlık.
 *
 * Modül ilk kez yüklendiğinde okunur, sabit olarak kopyalanmaz: ikisi
 * ayrışırsa anasayfa ile sekme başlığı farklı şeyler söylerdi.
 */
const SITE_TITLE = typeof document === 'undefined' ? '' : document.title;

/** Marka son ekiyle birleştirilmiş sekme başlığı. */
export function documentTitleFor(pageTitle: string): string {
  return `${pageTitle} — Ersin Spot`;
}

/**
 * Sayfa görünürken sekme başlığını ayarlar, ayrılırken varsayılana döner.
 *
 * Dönüş, başlık BELİRLEMEYEN sayfalar için gereklidir (anasayfa gibi): temizlik
 * yeni sayfanın etkisinden önce çalıştığı için, başlık ya yeni sayfanınkiyle
 * ya da site varsayılanıyla değişir. Temizlik olmasaydı anasayfaya dönen
 * kullanıcı bir önceki sayfanın başlığını görmeye devam ederdi.
 */
export function useDocumentTitle(pageTitle: string | undefined): void {
  useEffect(() => {
    if (pageTitle === undefined || pageTitle.trim() === '') return undefined;

    document.title = documentTitleFor(pageTitle);

    return () => {
      document.title = SITE_TITLE;
    };
  }, [pageTitle]);
}
