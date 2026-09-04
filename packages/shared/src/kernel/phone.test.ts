import { describe, expect, it } from 'vitest';
import { format, mask, normalize } from './phone.ts';

const CANONICAL = '+905071940550';

describe('telefon: normalleştirme', () => {
  it('aynı numaranın farklı yazımlarını tek biçime indirger', () => {
    // Eski kod tabanında bu varyasyonlar üç ayrı müşteri kaydı oluşturabiliyordu.
    const variants = [
      '0507 194 05 50',
      '05071940550',
      '507 194 05 50',
      '5071940550',
      '+90 507 194 05 50',
      '+905071940550',
      '0090 507 194 05 50',
      '(0507) 194-05-50',
      '0507.194.05.50',
    ];

    for (const variant of variants) {
      expect(normalize(variant), `başarısız girdi: ${variant}`).toBe(CANONICAL);
    }
  });

  it('sabit hat numaralarını reddeder', () => {
    // 5 ile başlamayan numaralar cep telefonu değildir.
    expect(normalize('0232 123 45 67')).toBeNull();
    expect(normalize('2321234567')).toBeNull();
  });

  it('eksik veya fazla haneli numaraları reddeder', () => {
    expect(normalize('0507 194 05')).toBeNull();
    expect(normalize('0507 194 05 50 1')).toBeNull();
  });

  it('boş ve harf içeren girdileri reddeder', () => {
    expect(normalize('')).toBeNull();
    expect(normalize('   ')).toBeNull();
    expect(normalize('telefon yok')).toBeNull();
  });

  it('yabancı ülke kodunu reddeder', () => {
    expect(normalize('+49 151 12345678')).toBeNull();
  });
});

describe('telefon: biçimlendirme', () => {
  it('yerel biçimde yazar', () => {
    expect(format(CANONICAL)).toBe('0507 194 05 50');
  });

  it('geçersiz değeri olduğu gibi döndürür, hata atmaz', () => {
    expect(format('bozuk')).toBe('bozuk');
  });

  it('maskeler', () => {
    expect(mask(CANONICAL)).toBe('0507 *** ** 50');
  });

  it('normalleştirip biçimlendirdiğinde girdiye geri döner', () => {
    const input = '0507 194 05 50';
    const normalized = normalize(input);
    expect(normalized).not.toBeNull();
    expect(format(normalized as string)).toBe(input);
  });
});
