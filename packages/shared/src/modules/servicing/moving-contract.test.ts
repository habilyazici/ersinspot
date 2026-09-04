/**
 * Nakliye talebi doğrulaması.
 *
 * Denetlenen kural: çıkış ve varış adresi aynı olamaz. Kural yalnızca ilçe,
 * sokak ve bina numarasına bakıyordu ve iki meşru taşınmayı reddediyordu —
 * aynı ilçede aynı sokak adı farklı mahallelerde bulunabilir, ve aynı binada
 * daire değiştirmek de bir taşınmadır.
 */

import { describe, expect, it } from 'vitest';
import { createMovingRequestSchema } from './moving-contract.ts';

/** Geçerli bir talep gövdesi; testler yalnızca adresleri değiştirir. */
function movingRequest(from: Record<string, string>, to: Record<string, string>) {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 7);

  const address = (overrides: Record<string, string>) => ({
    district: 'Buca',
    neighborhood: 'Menderes',
    street: 'Atatürk Caddesi',
    buildingNo: '5',
    ...overrides,
  });

  return {
    contact: { fullName: 'Ayşe Yılmaz', phone: '0507 194 05 50' },
    houseSize: '2+1',
    fromLocation: { address: address(from), floor: 0, hasElevator: false },
    toLocation: { address: address(to), floor: 2, hasElevator: true },
    preferredDate: tomorrow.toISOString().slice(0, 10),
    items: [{ name: 'Buzdolabı', quantity: 1, needsDisassembly: false }],
  };
}

describe('nakliye adresleri', () => {
  it('birebir aynı adresi reddeder', () => {
    const result = createMovingRequestSchema.safeParse(movingRequest({}, {}));

    expect(result.success).toBe(false);
  });

  it('yalnızca mahalle farklıysa kabul eder', () => {
    // Aynı ilçede aynı sokak adı iki mahallede birden bulunabilir.
    const result = createMovingRequestSchema.safeParse(
      movingRequest({ neighborhood: 'Menderes' }, { neighborhood: 'Şirinyer' }),
    );

    expect(result.success).toBe(true);
  });

  it('aynı binada daire değişimini kabul eder', () => {
    const result = createMovingRequestSchema.safeParse(
      movingRequest({ apartmentNo: '3' }, { apartmentNo: '7' }),
    );

    expect(result.success).toBe(true);
  });

  it('yalnızca yazım farkını aynı adres sayar', () => {
    // "Atatürk Caddesi" ile "atatürk  caddesi" aynı yerdir.
    const result = createMovingRequestSchema.safeParse(
      movingRequest({ street: 'Atatürk Caddesi' }, { street: 'atatürk  caddesi' }),
    );

    expect(result.success).toBe(false);
  });
});
