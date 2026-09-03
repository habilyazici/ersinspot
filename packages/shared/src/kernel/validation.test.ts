/**
 * Tarih ve doğrulama kurallarının testleri.
 *
 * Asıl denetlenen şey SAAT DİLİMİ. "Bugün" UTC'den okunduğunda Türkiye'de gece
 * yarısı ile 03:00 arası bir önceki güne düşülüyordu: yönetim panelindeki
 * "bugünün randevuları" dün olanları gösteriyor, randevu formunun en erken günü
 * bir gün geri kayıyordu. Testler tam o saat aralığını sabitler.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_APPOINTMENT_LEAD_DAYS,
  appointmentDateSchema,
  businessDayEnd,
  businessDayStart,
  dateAfterDays,
  dateOnlySchema,
  timeSlotSchema,
  today,
} from './validation.ts';

afterEach(() => {
  vi.useRealTimers();
});

/** Belirli bir ana sabitlenir. Girdi UTC olarak yorumlanır. */
function freeze(isoUtc: string): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(isoUtc));
}

describe('today', () => {
  it('işletmenin saat dilimine göre gün döndürür', () => {
    // 14 Mart 22:30 UTC = 15 Mart 01:30 İstanbul.
    freeze('2026-03-14T22:30:00Z');
    expect(today()).toBe('2026-03-15');
  });

  it('gün ortasında UTC ile aynı sonucu verir', () => {
    freeze('2026-03-15T09:00:00Z');
    expect(today()).toBe('2026-03-15');
  });
});

describe('dateAfterDays', () => {
  it('takvim günü ekler', () => {
    freeze('2026-03-15T09:00:00Z');
    expect(dateAfterDays(0)).toBe('2026-03-15');
    expect(dateAfterDays(2)).toBe('2026-03-17');
  });

  it('ay sınırını doğru geçer', () => {
    freeze('2026-03-30T09:00:00Z');
    expect(dateAfterDays(3)).toBe('2026-04-02');
  });

  it('artık yılı doğru sayar', () => {
    freeze('2028-02-28T09:00:00Z');
    expect(dateAfterDays(1)).toBe('2028-02-29');
  });

  it('gece yarısından sonra bir gün geri kaymaz', () => {
    // 14 Mart 22:30 UTC = 15 Mart 01:30 İstanbul; iki gün sonrası 17 Mart'tır.
    freeze('2026-03-14T22:30:00Z');
    expect(dateAfterDays(2)).toBe('2026-03-17');
  });
});

describe('appointmentDateSchema', () => {
  it('bugünü kabul eder', () => {
    freeze('2026-03-15T09:00:00Z');
    expect(appointmentDateSchema.safeParse(today()).success).toBe(true);
  });

  it('geçmiş günü reddeder', () => {
    freeze('2026-03-15T09:00:00Z');
    expect(appointmentDateSchema.safeParse('2026-03-14').success).toBe(false);
  });

  it('gece yarısından sonra bugünü hâlâ kabul eder', () => {
    // UTC'ye bakan bir kontrol burada "geçmiş tarih" derdi.
    freeze('2026-03-14T22:30:00Z');
    expect(appointmentDateSchema.safeParse('2026-03-15').success).toBe(true);
  });

  it('üst sınırı kabul eder, bir gün fazlasını reddeder', () => {
    freeze('2026-03-15T09:00:00Z');

    expect(appointmentDateSchema.safeParse(dateAfterDays(MAX_APPOINTMENT_LEAD_DAYS)).success).toBe(
      true,
    );
    expect(
      appointmentDateSchema.safeParse(dateAfterDays(MAX_APPOINTMENT_LEAD_DAYS + 1)).success,
    ).toBe(false);
  });
});

describe('dateOnlySchema', () => {
  it('var olmayan takvim gününü reddeder', () => {
    expect(dateOnlySchema.safeParse('2026-02-30').success).toBe(false);
    expect(dateOnlySchema.safeParse('2026-13-01').success).toBe(false);
  });

  it('biçimsiz metni reddeder', () => {
    expect(dateOnlySchema.safeParse('15.03.2026').success).toBe(false);
    expect(dateOnlySchema.safeParse('2026-3-5').success).toBe(false);
  });
});

describe('iş günü sınırları', () => {
  /*
    Süzgeç sınırları UTC gece yarısından alındığında bir gün, Türkiye'de
    03:00'te başlayıp ertesi sabah 03:00'te bitiyordu: gece verilen siparişler
    o günün listesinde görünmüyor, bir sonrakinde iki kez sayılıyordu.
  */
  it('gün İstanbul gece yarısında başlar', () => {
    expect(businessDayStart('2026-03-15').toISOString()).toBe('2026-03-14T21:00:00.000Z');
  });

  it('gün ertesi günün başlangıcında biter', () => {
    expect(businessDayEnd('2026-03-15').toISOString()).toBe('2026-03-15T21:00:00.000Z');
  });

  it('aralık tam olarak 24 saattir', () => {
    const start = businessDayStart('2026-03-15').getTime();
    const end = businessDayEnd('2026-03-15').getTime();

    expect(end - start).toBe(24 * 60 * 60 * 1000);
  });

  it('gece yarısından hemen sonrası günün içinde kalır', () => {
    // 14 Mart 21:30 UTC = 15 Mart 00:30 İstanbul.
    const justAfterMidnight = new Date('2026-03-14T21:30:00Z').getTime();

    expect(justAfterMidnight).toBeGreaterThanOrEqual(businessDayStart('2026-03-15').getTime());
    expect(justAfterMidnight).toBeLessThan(businessDayEnd('2026-03-15').getTime());
  });

  it('ay ve yıl sınırını doğru geçer', () => {
    expect(businessDayEnd('2026-03-31').toISOString()).toBe('2026-03-31T21:00:00.000Z');
    expect(businessDayEnd('2026-12-31').toISOString()).toBe('2026-12-31T21:00:00.000Z');
  });
});

describe('timeSlotSchema', () => {
  it('bitişi başlangıçtan önce olan aralığı reddeder', () => {
    expect(timeSlotSchema.safeParse({ startTime: '11:00', endTime: '09:00' }).success).toBe(false);
    expect(timeSlotSchema.safeParse({ startTime: '09:00', endTime: '09:00' }).success).toBe(false);
  });

  it('geçerli aralığı kabul eder', () => {
    expect(timeSlotSchema.safeParse({ startTime: '09:00', endTime: '11:00' }).success).toBe(true);
  });
});
