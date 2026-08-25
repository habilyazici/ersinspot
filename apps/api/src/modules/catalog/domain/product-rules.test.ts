/**
 * Ürün iş kurallarının testleri.
 *
 * Bu testler veritabanı gerektirmez: `domain` katmanı saf fonksiyonlardan oluşur.
 */

import { describe, expect, it } from 'vitest';
import {
  allowedProductTransitions,
  canTransitionProduct,
  formatWarranty,
  isPubliclyVisible,
  isPurchasable,
  normalizeImageOrder,
  slugify,
  withSlugSuffix,
} from './product-rules.ts';

describe('ürün durumu geçişleri', () => {
  it('normal satış akışına izin verir', () => {
    expect(canTransitionProduct('draft', 'in_storage')).toBe(true);
    expect(canTransitionProduct('in_storage', 'for_sale')).toBe(true);
    expect(canTransitionProduct('for_sale', 'reserved')).toBe(true);
    expect(canTransitionProduct('reserved', 'sold')).toBe(true);
  });

  it('sipariş iptalinde rezerve ürünü satışa geri döndürür', () => {
    expect(canTransitionProduct('reserved', 'for_sale')).toBe(true);
  });

  it('satılmış ürün son durumdur', () => {
    expect(allowedProductTransitions('sold')).toHaveLength(0);
    expect(canTransitionProduct('sold', 'for_sale')).toBe(false);
    expect(canTransitionProduct('sold', 'reserved')).toBe(false);
  });

  it('satıştaki ürün doğrudan satılmış yapılamaz', () => {
    // Önce bir siparişe bağlanıp rezerve olmalı; aksi halde stok ile sipariş
    // kayıtları ayrışır.
    expect(canTransitionProduct('for_sale', 'sold')).toBe(false);
  });

  it('taslak ürün doğrudan rezerve edilemez', () => {
    expect(canTransitionProduct('draft', 'reserved')).toBe(false);
    expect(canTransitionProduct('draft', 'sold')).toBe(false);
  });

  it('rezerve ürün depoya alınamaz', () => {
    // Rezerve, bir siparişe bağlı olmak demektir; sipariş çözülmeden depoya
    // geri konamaz.
    expect(canTransitionProduct('reserved', 'in_storage')).toBe(false);
  });
});

describe('görünürlük ve satılabilirlik', () => {
  it('yalnızca satıştaki ve rezerve ürünler vitrinde görünür', () => {
    expect(isPubliclyVisible('for_sale')).toBe(true);
    expect(isPubliclyVisible('reserved')).toBe(true);

    expect(isPubliclyVisible('draft')).toBe(false);
    expect(isPubliclyVisible('in_storage')).toBe(false);
    expect(isPubliclyVisible('sold')).toBe(false);
  });

  it('yalnızca satıştaki ürün sepete eklenebilir', () => {
    expect(isPurchasable('for_sale')).toBe(true);

    // Rezerve ürün vitrinde görünür ama satın alınamaz.
    expect(isPurchasable('reserved')).toBe(false);
    expect(isPurchasable('sold')).toBe(false);
    expect(isPurchasable('draft')).toBe(false);
    expect(isPurchasable('in_storage')).toBe(false);
  });
});

describe('bağlantı adı üretimi', () => {
  it('Türkçe karakterleri doğru çevirir', () => {
    expect(slugify('Arçelik Çamaşır Makinesi')).toBe('arcelik-camasir-makinesi');
    expect(slugify('Işıklı Gösterge')).toBe('isikli-gosterge');
    expect(slugify('Öğütücü Şofben')).toBe('ogutucu-sofben');
    expect(slugify('İkinci El Ürün')).toBe('ikinci-el-urun');
  });

  it('noktalı I ve noktasız ı ayrımını doğru yapar', () => {
    // Türkçe'de "I" küçük harfi "ı", "İ" küçük harfi "i"dir. Standart
    // toLowerCase() bu ayrımı yapamaz; eşleme elle yapılıyor.
    expect(slugify('IŞIK')).toBe('isik');
    expect(slugify('İSTANBUL')).toBe('istanbul');
  });

  it('rakamları korur', () => {
    expect(slugify('Arçelik 9 Kg Çamaşır Makinesi')).toBe('arcelik-9-kg-camasir-makinesi');
  });

  it('noktalama ve fazla boşlukları ayırıcıya çevirir', () => {
    expect(slugify('Buzdolabı  —  A++ (Az Kullanılmış)')).toBe('buzdolabi-a-az-kullanilmis');
  });

  it('baştaki ve sondaki ayırıcıları kırpar', () => {
    expect(slugify('  ...Buzdolabı!!!  ')).toBe('buzdolabi');
  });

  it('uzun başlıkları kısaltır ve sonda ayırıcı bırakmaz', () => {
    const slug = slugify('A'.repeat(200));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('yalnızca noktalamadan oluşan başlıkta boş dize döner', () => {
    expect(slugify('!!!___###')).toBe('');
  });
});

describe('bağlantı adı çakışma eki', () => {
  it('ilk denemede ek koymaz', () => {
    expect(withSlugSuffix('buzdolabi', 1)).toBe('buzdolabi');
    expect(withSlugSuffix('buzdolabi', 0)).toBe('buzdolabi');
  });

  it('sonraki denemelerde sıra numarası ekler', () => {
    expect(withSlugSuffix('buzdolabi', 2)).toBe('buzdolabi-2');
    expect(withSlugSuffix('buzdolabi', 17)).toBe('buzdolabi-17');
  });

  it('ek koyarken uzunluk sınırını aşmaz', () => {
    const long = 'a'.repeat(80);
    const result = withSlugSuffix(long, 12);

    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith('-12')).toBe(true);
  });
});

describe('görsel sıralaması', () => {
  it('sıra numarasına göre düzenler ve boşlukları kapatır', () => {
    const images = [
      { id: 'c', displayOrder: 10 },
      { id: 'a', displayOrder: 0 },
      { id: 'b', displayOrder: 5 },
    ];

    const result = normalizeImageOrder(images);

    expect(result.map((image) => image.id)).toEqual(['a', 'b', 'c']);
    expect(result.map((image) => image.displayOrder)).toEqual([0, 1, 2]);
  });

  it('girdiyi değiştirmez', () => {
    const images = [
      { id: 'b', displayOrder: 5 },
      { id: 'a', displayOrder: 0 },
    ];
    const snapshot = structuredClone(images);

    normalizeImageOrder(images);

    expect(images).toEqual(snapshot);
  });

  it('boş listede boş liste döner', () => {
    expect(normalizeImageOrder([])).toEqual([]);
  });
});

describe('garanti metni', () => {
  it('garantisiz ürünü belirtir', () => {
    expect(formatWarranty(0)).toBe('Garanti Yok');
    expect(formatWarranty(-1)).toBe('Garanti Yok');
  });

  it('bir yıldan kısa süreleri ay olarak yazar', () => {
    expect(formatWarranty(3)).toBe('3 Ay Garanti');
    expect(formatWarranty(11)).toBe('11 Ay Garanti');
  });

  it('tam yılları yıl olarak yazar', () => {
    expect(formatWarranty(12)).toBe('1 Yıl Garanti');
    expect(formatWarranty(24)).toBe('2 Yıl Garanti');
  });

  it('yıl ve ay birleşimini yazar', () => {
    expect(formatWarranty(18)).toBe('1 Yıl 6 Ay Garanti');
    expect(formatWarranty(30)).toBe('2 Yıl 6 Ay Garanti');
  });
});
