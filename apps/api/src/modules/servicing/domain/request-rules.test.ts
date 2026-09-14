/**
 * Hizmet talebi iş kurallarının testleri.
 *
 * Bu testler veritabanı gerektirmez: `domain` katmanı saf fonksiyonlardan
 * oluşur. Katalog tarafının karşılığı vardı, talep tarafının yoktu — oysa üç
 * hizmet türü de bu dosyadaki kararlara güveniyor.
 *
 * Asıl denetlenen şey teklif geçerliliğinin SINIRI. Müşteriye "15 Mart'a kadar
 * geçerli" denip sunucunun 16 Mart sabah 03:00'e kadar kabul etmesi, iki
 * tarafın farklı bir günü konuşması demektir.
 */

import { describe, expect, it } from 'vitest';
import {
  canCancelRequest,
  canRespondToQuote,
  canTransitionRequest,
  requiresAppointment,
  requiresQuote,
} from './request-rules.ts';

describe('talep durumu geçişleri', () => {
  it('normal akışa izin verir', () => {
    expect(canTransitionRequest('pending', 'reviewing')).toBe(true);
    expect(canTransitionRequest('reviewing', 'quoted')).toBe(true);
    expect(canTransitionRequest('quoted', 'accepted')).toBe(true);
    expect(canTransitionRequest('accepted', 'scheduled')).toBe(true);
    expect(canTransitionRequest('scheduled', 'completed')).toBe(true);
  });

  it('adım atlamaya izin vermez', () => {
    expect(canTransitionRequest('pending', 'accepted')).toBe(false);
    expect(canTransitionRequest('reviewing', 'scheduled')).toBe(false);
  });

  it('tamamlanmış, reddedilmiş ve iptal edilmiş talep son durumdur', () => {
    for (const terminal of ['completed', 'rejected', 'cancelled'] as const) {
      expect(canTransitionRequest(terminal, 'reviewing')).toBe(false);
      expect(canTransitionRequest(terminal, 'cancelled')).toBe(false);
    }
  });
});

describe('iptal yetkisi', () => {
  it('müşteri işlem sürerken iptal edebilir', () => {
    expect(canCancelRequest('pending', 'customer')).toBe(true);
    expect(canCancelRequest('quoted', 'customer')).toBe(true);
    expect(canCancelRequest('scheduled', 'customer')).toBe(true);
  });

  it('müşteri kapanmış talebi iptal edemez', () => {
    expect(canCancelRequest('completed', 'customer')).toBe(false);
    expect(canCancelRequest('rejected', 'customer')).toBe(false);
    expect(canCancelRequest('cancelled', 'customer')).toBe(false);
  });

  it('personel de kapanmış talebi geri açamaz', () => {
    // Yetki, durum makinesinin izin verdiği yerle sınırlıdır.
    expect(canCancelRequest('completed', 'staff')).toBe(false);
    expect(canCancelRequest('scheduled', 'staff')).toBe(true);
  });
});

describe('teklife yanıt', () => {
  it('yalnızca teklif verilmiş talep yanıtlanabilir', () => {
    expect(canRespondToQuote('quoted')).toBe(true);
    expect(canRespondToQuote('reviewing')).toBe(false);
    expect(canRespondToQuote('accepted')).toBe(false);
  });

  it('kabul ve ret geçerli bir teklif gerektirir', () => {
    expect(requiresQuote('accepted')).toBe(true);
    expect(requiresQuote('rejected')).toBe(true);
    expect(requiresQuote('scheduled')).toBe(false);
  });

  it('randevu durumu planlanmış bir randevu gerektirir', () => {
    expect(requiresAppointment('scheduled')).toBe(true);
    expect(requiresAppointment('accepted')).toBe(false);
  });
});

/*
  Teklif geçerliliği artık paylaşılan pakette (`@ersinspot/shared`) tanımlı ve
  testi de orada: kuralı arayüz de uyguluyor. Buradan yalnızca yeniden dışa
  aktarılıyor, dolayısıyla aynı senaryoyu ikinci kez denemenin bir karşılığı
  yok — iki kopya test, kural değiştiğinde birinin güncellenmemesi demektir.
*/
