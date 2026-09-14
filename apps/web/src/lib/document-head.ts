import { useEffect } from 'react';

/**
 * Belge başı: sekme başlığı ve arama sonucu açıklaması.
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

/**
 * `index.html` içindeki açıklamalar.
 *
 * Başlıkta olduğu gibi ilk yüklemede okunur; sayfa açıklamasını kaldıran her
 * rota bunlara döner.
 *
 * İKİSİ AYRI TUTULUR. `index.html` anasayfa için iki farklı metin yazar: arama
 * sonucu açıklaması uzun, paylaşım önizlemesi kısa. Tek bir varsayılana
 * indirgemek, /urunler'e gidip anasayfaya dönen ziyaretçinin og metnini
 * sessizce değiştirirdi — aynı sayfa, gezinme geçmişine göre farklı önizleme.
 */
const SITE_DESCRIPTIONS = {
  meta: readMeta('meta[name="description"]'),
  og: readMeta('meta[property="og:description"]'),
} as const;

function readMeta(selector: string): string {
  if (typeof document === 'undefined') return '';
  return document.querySelector(selector)?.getAttribute('content') ?? '';
}

/**
 * Arama sonucunda görünecek uzunluğa kısaltır.
 *
 * Arama motorları yaklaşık 160 karakter gösterir; gerisi kesilir. Kesme
 * KELİME SINIRINDA yapılır, yoksa snippet cümlenin ortasında yarım kalır.
 */
function shorten(text: string, limit = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;

  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');

  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Sayfanın arama sonucu açıklaması.
 *
 * Başlıkla aynı sorun buradaydı ve daha görünürdü: `<title>` rota başına
 * ayarlandıktan sonra bile `<meta name="description">` `index.html`'den geleni
 * koruyordu. Arama sonucunda her sayfanın altında aynı iki cümle yazıyordu —
 * ürün ilanları ve blog yazıları dahil. Başlık ayrı, açıklama aynı olduğunda
 * kullanıcı hangi sonucun ne olduğunu açıklamadan anlayamaz.
 *
 * `og:description` de birlikte güncellenir: bağlantı WhatsApp'ta ya da bir
 * sosyal ağda paylaşıldığında önizlemede o okunur. İkisinin ayrışması, aynı
 * sayfanın iki farklı özetle dolaşması demektir.
 */
export function useMetaDescription(description: string | undefined): void {
  useEffect(() => {
    if (description === undefined || description.trim() === '') return undefined;

    const metin = shorten(description);
    apply(metin, metin);

    return () => {
      apply(SITE_DESCRIPTIONS.meta, SITE_DESCRIPTIONS.og);
    };
  }, [description]);
}

/** Açıklamayı hem arama motoru hem paylaşım önizlemesi etiketine yazar. */
function apply(metaContent: string, ogContent: string): void {
  set('meta[name="description"]', 'name', 'description', metaContent);
  set('meta[property="og:description"]', 'property', 'og:description', ogContent);
}

function set(selector: string, attribute: string, key: string, content: string): void {
  let element = document.querySelector(selector);

  if (element === null) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }

  element.setAttribute('content', content);
}
