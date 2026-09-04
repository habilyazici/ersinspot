/**
 * Arayüz tutarlılığı.
 *
 * Sayfalar aynı çerçeveyi paylaşmalıdır: aynı genişlik ölçüleri, aynı başlık
 * biçimi, aynı kart görünümü. İçerik sayfadan sayfaya değişir, çerçeve
 * değişmez.
 *
 * Denetimde on bir sayfada SEKİZ farklı kapsayıcı ölçüsü ve üç farklı kart
 * dolgusu bulundu; aynı işi yapan iki ekran farklı görünüyordu. Bu test o
 * durumun geri dönmesini engeller: yeni bir sayfa ortak bileşenleri
 * kullanmazsa düşer.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROUTES = path.resolve(import.meta.dirname, '../../routes');
const COMPONENTS = path.resolve(import.meta.dirname, '..');
const FEATURES = path.resolve(import.meta.dirname, '../../features');

/**
 * Tüm sayfa dosyaları, ALT DİZİNLER DAHİL.
 *
 * İlk sürüm yalnızca `routes/` kökünü tarıyordu; yönetim paneli
 * `routes/admin/` altına yazılınca on bir sayfa sessizce denetim dışı kaldı.
 * Bir tutarlılık testinin kapsamı daralırsa kendisi de bir yanılsama üretir.
 */
function pageFiles(dir: string = ROUTES, prefix = ''): { name: string; source: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return pageFiles(full, `${prefix}${entry.name}/`);
    if (!entry.name.endsWith('.tsx') || entry.name.includes('.test.')) return [];

    return [{ name: `${prefix}${entry.name}`, source: readFileSync(full, 'utf8') }];
  });
}

/**
 * Elle yazılmış sayfa kapsayıcısı arar.
 *
 * Kural, `PageContainer`ın tanımladığı SAYFA ÇERÇEVESİNİ hedefler; genişlikler
 * `page.tsx` içindeki `WIDTHS` kümesinden gelir. Bir metin ölçüsü (duyuru
 * şeridindeki `max-w-3xl` gibi) çerçeve değildir ve kapsam dışıdır.
 *
 * İlk hâli `/mx-auto\s+max-w-/` idi ve yalnızca iki sınıf YAN YANA yazıldığında
 * eşleşiyordu. Aradaki tek bir sınıf kuralı görünmez kılıyordu: anasayfa,
 * başlık ve alt bilgi `mx-auto grid max-w-7xl` yazıp denetimden geçiyordu.
 * Deseni aynı sınıf dizesi içinde, sıradan bağımsız arar.
 */
const CONTAINER_WIDTHS = 'max-w-(?:md|2xl|4xl|5xl|7xl)';

const HAND_ROLLED_CONTAINER = new RegExp(
  `mx-auto[^"'\`]*\\b${CONTAINER_WIDTHS}\\b|\\b${CONTAINER_WIDTHS}\\b[^"'\`]*mx-auto`,
);

/** `components/` ve `features/` altındaki tüm bileşen dosyaları. */
function componentFiles(): { name: string; source: string }[] {
  function walk(dir: string, prefix: string): { name: string; source: string }[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) return walk(full, `${prefix}${entry.name}/`);
      if (!entry.name.endsWith('.tsx') || entry.name.includes('.test.')) return [];

      return [{ name: `${prefix}${entry.name}`, source: readFileSync(full, 'utf8') }];
    });
  }

  return [...walk(COMPONENTS, ''), ...walk(FEATURES, 'features/')];
}

describe('Arayüz tutarlılığı', () => {
  it('hiçbir sayfa kendi kapsayıcı ölçüsünü yazmaz', () => {
    const offenders = pageFiles()
      .filter(({ source }) => HAND_ROLLED_CONTAINER.test(source))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });

  it('her sayfa PageContainer kullanır', () => {
    /*
      Yönetim paneli sayfaları istisnadır: kapsayıcıyı `AdminLayout` sağlar.
      Her sayfa ayrıca bir tane yazsaydı iki kapsayıcı iç içe geçer ve dolgu
      iki katına çıkardı. Düzenin kendisi bir sonraki testte denetlenir.
    */
    const offenders = pageFiles()
      .filter(({ name }) => !name.startsWith('admin/'))
      .filter(({ source }) => !source.includes('<PageContainer'))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });

  it('düzen bileşenleri de kendi kapsayıcı ölçüsünü yazmaz', () => {
    /*
      Kural yalnızca sayfalara uygulansaydı, ölçüyü bir düzene taşımak onu
      denetimden kaçırmanın yolu olurdu — nitekim yönetim düzeni bir süre
      kendi `max-w-7xl` değerini yazdı.
    */
    const LAYOUTS = path.resolve(import.meta.dirname, '../layout');

    const offenders = readdirSync(LAYOUTS)
      .filter((name) => name.endsWith('.tsx') && !name.includes('.test.'))
      .filter((name) => HAND_ROLLED_CONTAINER.test(readFileSync(path.join(LAYOUTS, name), 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('sayfa başlığı elle yazılmaz', () => {
    /*
      `h1` normalde yalnızca `PageHeader` içinde bulunur. İki sayfa bilinçli
      istisnadır ve başlıkları kendi düzenlerinin parçasıdır:

        home.tsx           — kahraman başlığı bir pazarlama metnidir; koyu
                             zemin üzerinde ve diğer sayfaların başlığından
                             büyüktür.
        product-detail.tsx — ürün adı galerinin yanındaki sütunda, fiyat ve
                             rozetlerle birlikte durur; sayfanın üstüne
                             alınırsa düzen bozulur.

      Liste bilinçli olarak kısa: üçüncü bir istisna eklenecekse önce
      `PageHeader`ın o durumu karşılayıp karşılayamayacağı sorulmalıdır.
    */
    const EXEMPT = ['home.tsx', 'product-detail.tsx'];

    const offenders = pageFiles()
      .filter(({ name }) => !EXEMPT.includes(name))
      .filter(({ source }) => source.includes('<h1'))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });

  it('kart görünümü elle yazılmaz', () => {
    const cardClass = /rounded-(?:xl|lg|2xl)\s+border\s+border-slate-200\s+bg-white/;

    const offenders = pageFiles()
      .filter(({ source }) => cardClass.test(source))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });

  it('sayfalar form alanını elle yazmaz', () => {
    /*
      Etiket, yardım metni ve hata mesajının girdiyle ilişkilendirilmesi
      (`htmlFor`, `aria-describedby`, `aria-invalid`) `form-field.tsx` içinde
      bir kez yapılır. Elle yazıldığında bu ilişkilendirmelerden biri kolayca
      unutulur ve ekran okuyucu alanın hangi etikete ait olduğunu bilemez.

      Ayrıca görünüm ayrışır: giriş ve kayıt formları bir süre kendi girdi
      sınıflarını yazdı ve hatalı alan orada kırmızı çerçeve almıyordu.

      `type="checkbox"` ve `type="radio"` için `choice-field.tsx`,
      `type="file"` için `photo-upload.tsx` kullanılır.

      Gizli girdi (`type="hidden"`) istisnadır: görünen bir alan değildir,
      etiketi ve hata mesajı da yoktur — yalnızca formla birlikte taşınan bir
      değerdir.
    */
    const offenders = pageFiles()
      .filter(({ source }) => /<input\b(?![^>]*type="hidden")/.test(source))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });

  it('sayfalar girdi stilini elle yazmaz', () => {
    // Girdi çerçevesi ve dolgusu `form-field.tsx` içinde tanımlıdır.
    const inputClass = /rounded-lg\s+border\s+border-slate-300\s+px-\d/;

    const offenders = pageFiles()
      .filter(({ source }) => inputClass.test(source))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });

  it('kart görünümü yalnızca card.tsx içinde tanımlıdır', () => {
    /*
      Kural `components/ui/` ile sınırlıydı ve özellik modülleri dışarıda
      kalıyordu: ürün kartı kendi kenarlığını, köşe yarıçapını ve zeminini
      yazıyordu — yani kart görünümünün ikinci tanımıydı ve testten habersizce
      ayrışabilirdi. Tarama artık `components/` ve `features/` ağaçlarının
      tamamını kapsar.
    */
    const cardClass = /rounded-(?:xl|lg|2xl)\s+border\s+border-slate-200\s+bg-white/;

    const offenders = componentFiles()
      .filter(({ name }) => name !== 'ui/card.tsx')
      .filter(({ source }) => cardClass.test(source))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });
});
