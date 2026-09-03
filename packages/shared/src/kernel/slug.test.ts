/**
 * Bağlantı adı üretimi testleri.
 *
 * Bu fonksiyon hem sunucuda (ürün ve blog yazısı kaydederken) hem tarayıcıda
 * (yönetim formunda öneri gösterirken) çalışır. İki taraf aynı sonucu üretmek
 * zorundadır; testler o sözleşmeyi sabitler.
 */

import { describe, expect, it } from 'vitest';
import { MAX_SLUG_LENGTH, slugify, toAsciiLower } from './slug.ts';

describe('slugify', () => {
  it('Türkçe harfleri ASCII karşılığına çevirir', () => {
    expect(slugify('Arçelik 9 Kg Çamaşır Makinesi')).toBe('arcelik-9-kg-camasir-makinesi');
    expect(slugify('Güneş Işığı Öğle')).toBe('gunes-isigi-ogle');
  });

  it('büyük İ ve I harflerini doğru küçültür', () => {
    /*
      `toLowerCase()` tek başına yetmez: İngilizce kurallarında "I" harfi "i"
      olur ama Türkçede "ı" olmalıdır ve "İ" küçültüldüğünde birleştirici bir
      nokta bırakır. Eşleme bu yüzden küçültmeden ÖNCE uygulanır.
    */
    expect(slugify('İzmir')).toBe('izmir');
    expect(slugify('IŞIK')).toBe('isik');
  });

  it('noktalama ve boşlukları tek ayırıcıya indirger', () => {
    expect(slugify('Buzdolabı   —   520 L, No Frost!')).toBe('buzdolabi-520-l-no-frost');
  });

  it('baştaki ve sondaki ayırıcıları atar', () => {
    expect(slugify('  ...Merhaba...  ')).toBe('merhaba');
  });

  it('Latin aksanlarını da kaldırır', () => {
    expect(slugify('Café Créme')).toBe('cafe-creme');
  });

  it('uzunluğu sınırlar ve sonda ayırıcı bırakmaz', () => {
    const long = slugify('kelime '.repeat(40));

    expect(long.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(long.endsWith('-')).toBe(false);
  });

  it('harf veya rakam içermeyen girdide boş dize döner', () => {
    // Çağıran taraf bunu hata olarak ele almalıdır; sessizce "-" üretmek
    // anlamsız bir adres oluştururdu.
    expect(slugify('!!! ???')).toBe('');
  });

  it('aynı girdi için daima aynı sonucu verir', () => {
    const input = 'Bosch Bulaşık Makinesi 6 Programlı';

    expect(slugify(input)).toBe(slugify(input));
  });
});

describe('toAsciiLower', () => {
  it('Türkçe harfleri ASCII karşılığına indirger', () => {
    expect(toAsciiLower('Yılmaz')).toBe('yilmaz');
    expect(toAsciiLower('IŞIK')).toBe('isik');
    expect(toAsciiLower('İstanbul')).toBe('istanbul');
    expect(toAsciiLower('Çağrı Öz')).toBe('cagri oz');
  });

  it('Latin aksanlarını kaldırır', () => {
    expect(toAsciiLower('Café')).toBe('cafe');
  });

  it('slugify gibi kısaltmaz ve ayırıcı koymaz', () => {
    // Şifre karşılaştırmasında kullanılır; noktalama ve uzunluk korunmalıdır.
    const long = 'a'.repeat(200);
    expect(toAsciiLower(long)).toHaveLength(200);
    expect(toAsciiLower('bir iki-üç')).toBe('bir iki-uc');
  });
});
