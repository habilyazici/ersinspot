import { describe, expect, it } from 'vitest';
import {
  MoneyError,
  ZERO,
  add,
  compare,
  format,
  fromKurus,
  fromLira,
  multiply,
  parseLira,
  percentage,
  subtract,
  sum,
  toInputValue,
} from './money.ts';

describe('para: yapıcılar', () => {
  it('kuruş cinsinden tam sayı kabul eder', () => {
    expect(fromKurus(12_345)).toBe(12_345);
    expect(fromKurus(0)).toBe(0);
    expect(fromKurus(-500)).toBe(-500);
  });

  it('ondalıklı kuruş değerini reddeder', () => {
    expect(() => fromKurus(10.5)).toThrow(MoneyError);
  });

  it('sonsuz ve NaN değerleri reddeder', () => {
    expect(() => fromKurus(Number.POSITIVE_INFINITY)).toThrow(MoneyError);
    expect(() => fromKurus(Number.NaN)).toThrow(MoneyError);
  });

  it('güvenli tam sayı sınırının dışını reddeder', () => {
    expect(() => fromKurus(Number.MAX_SAFE_INTEGER + 10)).toThrow(MoneyError);
  });

  it('liradan kuruşa çevirir', () => {
    expect(fromLira(1)).toBe(100);
    expect(fromLira(1234.56)).toBe(123_456);
  });

  it('lira çevriminde en yakın kuruşa yuvarlar', () => {
    // 19.99 * 100 kayan noktada 1998.9999999999998 verir; yuvarlama bunu düzeltir.
    expect(fromLira(19.99)).toBe(1_999);
    expect(fromLira(0.07)).toBe(7);
  });
});

describe('para: kullanıcı girdisini ayrıştırma', () => {
  it('Türkçe biçimi okur', () => {
    expect(parseLira('1.234,56')).toBe(123_456);
    expect(parseLira('1234,56')).toBe(123_456);
    expect(parseLira('0,05')).toBe(5);
  });

  it('İngilizce biçimi okur', () => {
    expect(parseLira('1234.56')).toBe(123_456);
  });

  it('ayıraçsız tam sayıyı okur', () => {
    expect(parseLira('2500')).toBe(250_000);
  });

  it('binlik ayıracını ondalık sanmaz', () => {
    // "1.234" üç basamak içerdiği için binlik ayıracıdır, 1,234 lira değil.
    expect(parseLira('1.234')).toBe(123_400);
    expect(parseLira('12.345.678')).toBe(1_234_567_800);
  });

  it('para simgesi ve boşlukları yok sayar', () => {
    expect(parseLira(' 1.500,00 ₺ ')).toBe(150_000);
    expect(parseLira('2500 TL')).toBe(250_000);
  });

  it('negatif değeri okur', () => {
    expect(parseLira('-250,50')).toBe(-25_050);
  });

  it('ikiden fazla ondalık basamağı kırpar', () => {
    expect(parseLira('10,999')).toBe(1_099_900);
  });

  it('geçersiz girdide null döner', () => {
    expect(parseLira('')).toBeNull();
    expect(parseLira('   ')).toBeNull();
    expect(parseLira('abc')).toBeNull();
    expect(parseLira('12a34')).toBeNull();
  });
});

describe('para: aritmetik', () => {
  it('toplar ve çıkarır', () => {
    expect(add(fromLira(10), fromLira(5))).toBe(fromLira(15));
    expect(subtract(fromLira(10), fromLira(15))).toBe(fromLira(-5));
  });

  it('kayan nokta hatası biriktirmez', () => {
    // 0.1 + 0.2 !== 0.3 sorunu kuruş aritmetiğinde oluşmaz.
    const total = add(fromLira(0.1), fromLira(0.2));
    expect(total).toBe(fromLira(0.3));
    expect(total).toBe(30);
  });

  it('yüz kalemi toplarken sapma yapmaz', () => {
    const lines = Array.from({ length: 100 }, () => fromLira(19.99));
    expect(sum(lines)).toBe(fromLira(1999));
  });

  it('tam sayı adetle çarpar', () => {
    expect(multiply(fromLira(24.5), 3)).toBe(fromLira(73.5));
  });

  it('kesirli adedi reddeder', () => {
    expect(() => multiply(fromLira(10), 1.5)).toThrow(MoneyError);
  });

  it('boş listenin toplamı sıfırdır', () => {
    expect(sum([])).toBe(ZERO);
  });

  it('yüzde hesaplar ve yuvarlar', () => {
    expect(percentage(fromLira(100), 20)).toBe(fromLira(20));
    expect(percentage(fromLira(33.33), 18)).toBe(600); // 5.9994 → 6.00 ₺
  });

  it('karşılaştırır', () => {
    expect(compare(fromLira(1), fromLira(2))).toBe(-1);
    expect(compare(fromLira(2), fromLira(2))).toBe(0);
    expect(compare(fromLira(3), fromLira(2))).toBe(1);
  });
});

describe('para: biçimlendirme', () => {
  it('Türkçe para biçiminde yazar', () => {
    // Intl çıktısında bölünemez boşluk kullanılır; karşılaştırmadan önce normalleştirilir.
    // Intl, para simgesiyle sayı arasına bölünemez boşluk (U+00A0) koyar.
    const normalize = (value: string): string => value.replace(/\u00a0/g, ' ');

    expect(normalize(format(fromLira(1234.56)))).toBe('₺1.234,56');
    expect(normalize(format(fromLira(0)))).toBe('₺0,00');
  });

  it('tam liralık tutarlarda kuruşu gizleyebilir', () => {
    // Intl, para simgesiyle sayı arasına bölünemez boşluk (U+00A0) koyar.
    const normalize = (value: string): string => value.replace(/\u00a0/g, ' ');

    expect(normalize(format(fromLira(2500), { hideDecimalsWhenWhole: true }))).toBe('₺2.500');
    expect(normalize(format(fromLira(2500.5), { hideDecimalsWhenWhole: true }))).toBe('₺2.500,50');
  });

  it('form alanı için simgesiz değer üretir', () => {
    expect(toInputValue(fromLira(1234.56))).toBe('1234,56');
    expect(toInputValue(fromLira(10))).toBe('10,00');
    expect(toInputValue(fromLira(-5.5))).toBe('-5,50');
  });

  it('biçimlendirip yeniden okuduğunda aynı değeri verir', () => {
    const original = fromLira(8_432.17);
    const roundTripped = parseLira(toInputValue(original));
    expect(roundTripped).toBe(original);
  });
});
