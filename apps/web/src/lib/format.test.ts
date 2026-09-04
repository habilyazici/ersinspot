/**
 * Biçimlendirme testleri.
 *
 * Eski kod tabanında `toLocaleString('tr-TR')` 99 yerde, elle yazılmış "₺"
 * 120 yerde tekrarlanıyordu; biçim tutarsızdı ve test edilmiyordu.
 */

import { describe, expect, it } from 'vitest';
import { formatAddress, formatPrice, formatTimeSlot } from './format.ts';

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
