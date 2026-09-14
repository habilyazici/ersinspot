/**
 * Biçimlendirme testleri.
 *
 * Eski kod tabanında `toLocaleString('tr-TR')` 99 yerde, elle yazılmış "₺"
 * 120 yerde tekrarlanıyordu; biçim tutarsızdı ve test edilmiyordu.
 */

import { describe, expect, it } from 'vitest';
import {
  formatAddress,
  formatDate,
  formatDateTime,
  formatPrice,
  formatTimeSlot,
} from './format.ts';

/** Intl, para simgesiyle sayı arasına bölünemez boşluk koyar. */
const normalize = (value: string): string => value.replace(/\u00a0/g, ' ');

describe('fiyat biçimlendirme', () => {
  it('kuruşu Türk lirası biçiminde yazar', () => {
    expect(normalize(formatPrice(2_450_000))).toBe('₺24.500');
  });

  it('kuruşlu tutarlarda ondalık gösterir', () => {
    expect(normalize(formatPrice(2_450_050))).toBe('₺24.500,50');
  });

  it('sıfır tutarı gösterir', () => {
    expect(normalize(formatPrice(0))).toBe('₺0');
  });

  it('compact kapalıyken tam liralık tutarda da ondalık gösterir', () => {
    expect(normalize(formatPrice(100_000, { compact: false }))).toBe('₺1.000,00');
  });
});

describe('saat aralığı', () => {
  it('aralığı yazar', () => {
    expect(formatTimeSlot({ startTime: '09:00', endTime: '11:00' })).toBe('09:00 - 11:00');
  });

  it('aralık yoksa tire gösterir', () => {
    expect(formatTimeSlot(null)).toBe('—');
  });
});

describe('adres biçimlendirme', () => {
  it('tek satırda birleştirir', () => {
    expect(
      formatAddress({
        neighborhood: 'Menderes',
        street: 'Atatürk Caddesi',
        buildingNo: '12',
        apartmentNo: '3',
        district: 'Buca',
      }),
    ).toBe('Menderes, Atatürk Caddesi, No: 12, Daire: 3, Buca / İzmir');
  });

  it('daire numarası yoksa atlar', () => {
    expect(
      formatAddress({
        neighborhood: 'Menderes',
        street: 'Atatürk Caddesi',
        buildingNo: '12',
        district: 'Buca',
      }),
    ).toBe('Menderes, Atatürk Caddesi, No: 12, Buca / İzmir');
  });
});

describe('tarih biçimlendirme', () => {
  /**
   * Tarihler İŞLETMENİN saat diliminde gösterilir, ziyaretçinin değil.
   *
   * Teslimat günü, randevu saati ve teklif geçerliliği mağazanın takvimine
   * göre belirlenir. Tarayıcının saat dilimi kullanılsaydı yurt dışındaki ya
   * da saati yanlış ayarlanmış bir müşteri, mağazanın planladığından başka bir
   * gün görürdü — ve ikisi de kendi ekranında haklı olurdu.
   *
   * Aşağıdaki an tam da sınırdadır: 15 Mart 21:30 UTC, İstanbul'da 16 Mart
   * 00:30'dur. Biçimlendiriciden `timeZone` düşerse bu test, testin koştuğu
   * ortamın saat dilimi ne olursa olsun 15 Mart görür.
   */
  const sinir = '2026-03-15T21:30:00.000Z';

  it('gün sınırında İstanbul gününü yazar', () => {
    expect(formatDate(sinir)).toBe('16 Mart 2026');
  });

  it('saati de İstanbul saatiyle yazar', () => {
    expect(formatDateTime(sinir)).toContain('16 Mart 2026');
    expect(formatDateTime(sinir)).toContain('00:30');
  });

  it('Date nesnesini de aynı şekilde ele alır', () => {
    expect(formatDate(new Date(sinir))).toBe('16 Mart 2026');
  });
});
