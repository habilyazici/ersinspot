import { describe, expect, it } from 'vitest';
import {
  DELIVERY_FEE_OTHER_DISTRICT,
  FREE_DELIVERY_THRESHOLD,
  calculateDeliveryFee,
  calculateOrderTotals,
  estimateMoving,
} from './pricing.ts';
import { ZERO, fromLira } from './money.ts';

describe('teslimat ücreti', () => {
  it('mağazadan teslim alımda ücret almaz', () => {
    const fee = calculateDeliveryFee({
      method: 'store_pickup',
      district: 'Bornova',
      subtotal: fromLira(1_000),
    });
    expect(fee).toBe(ZERO);
  });

  it('Buca içi teslimat ücretsizdir', () => {
    const fee = calculateDeliveryFee({
      method: 'home_delivery',
      district: 'Buca',
      subtotal: fromLira(1_000),
    });
    expect(fee).toBe(ZERO);
  });

  it('Buca dışına sabit ücret uygular', () => {
    const fee = calculateDeliveryFee({
      method: 'home_delivery',
      district: 'Karşıyaka',
      subtotal: fromLira(1_000),
    });
    expect(fee).toBe(DELIVERY_FEE_OTHER_DISTRICT);
  });

  it('eşik üzerindeki siparişlerde ücret almaz', () => {
    const fee = calculateDeliveryFee({
      method: 'home_delivery',
      district: 'Karşıyaka',
      subtotal: FREE_DELIVERY_THRESHOLD,
    });
    expect(fee).toBe(ZERO);
  });

  it('eşiğin bir kuruş altında ücret alır', () => {
    const fee = calculateDeliveryFee({
      method: 'home_delivery',
      district: 'Karşıyaka',
      subtotal: (FREE_DELIVERY_THRESHOLD - 1) as typeof FREE_DELIVERY_THRESHOLD,
    });
    expect(fee).toBe(DELIVERY_FEE_OTHER_DISTRICT);
  });
});

describe('sipariş toplamı', () => {
  it('kalem fiyatlarını ve teslimat ücretini birleştirir', () => {
    const totals = calculateOrderTotals([fromLira(2_500), fromLira(2_400)], {
      method: 'home_delivery',
      district: 'Bornova',
    });

    expect(totals.subtotal).toBe(fromLira(4_900));
    expect(totals.deliveryFee).toBe(DELIVERY_FEE_OTHER_DISTRICT);
    expect(totals.total).toBe(fromLira(4_900 + 500));
  });

  it('aynı fiyatlı iki kalemi iki kez sayar', () => {
    const totals = calculateOrderTotals([fromLira(100), fromLira(100)], {
      method: 'store_pickup',
      district: 'Buca',
    });

    expect(totals.subtotal).toBe(fromLira(200));
  });

  it('boş sepette sıfır döner', () => {
    const totals = calculateOrderTotals([], { method: 'store_pickup', district: 'Buca' });
    expect(totals.subtotal).toBe(ZERO);
    expect(totals.total).toBe(ZERO);
  });

  it('ücretsiz teslimat eşiğini ara toplama göre değerlendirir', () => {
    const totals = calculateOrderTotals([fromLira(20_000)], {
      method: 'home_delivery',
      district: 'Çeşme',
    });

    expect(totals.deliveryFee).toBe(ZERO);
    expect(totals.total).toBe(fromLira(20_000));
  });
});

describe('nakliye tahmini', () => {
  const base = {
    houseSize: '2+1',
    fromFloor: 0,
    fromHasElevator: false,
    toFloor: 0,
    toHasElevator: false,
    itemCount: 0,
    needsPacking: false,
    needsAssembly: false,
  } as const;

  it('zemin kattan zemin kata taşımada yalnızca temel ücreti uygular', () => {
    const estimate = estimateMoving(base);
    expect(estimate.floorSurcharge).toBe(ZERO);
    expect(estimate.itemSurcharge).toBe(ZERO);
    expect(estimate.total).toBe(estimate.basePrice);
  });

  it('ev büyüdükçe temel ücret artar', () => {
    const small = estimateMoving({ ...base, houseSize: '1+1' });
    const large = estimateMoving({ ...base, houseSize: '4+1' });
    expect(large.basePrice).toBeGreaterThan(small.basePrice);
  });

  it('asansörsüz katlar için ek ücret alır', () => {
    const withoutElevator = estimateMoving({ ...base, fromFloor: 4, fromHasElevator: false });
    const groundFloor = estimateMoving(base);
    expect(withoutElevator.floorSurcharge).toBeGreaterThan(groundFloor.floorSurcharge);
  });

  it('asansör varsa kat ücretini büyük ölçüde azaltır', () => {
    const withElevator = estimateMoving({ ...base, fromFloor: 4, fromHasElevator: true });
    const withoutElevator = estimateMoving({ ...base, fromFloor: 4, fromHasElevator: false });
    expect(withElevator.floorSurcharge).toBeLessThan(withoutElevator.floorSurcharge);
    expect(withElevator.floorSurcharge).toBeGreaterThan(ZERO);
  });

  it('iki adresin kat ücretini toplar', () => {
    const single = estimateMoving({ ...base, fromFloor: 3 });
    const both = estimateMoving({ ...base, fromFloor: 3, toFloor: 3 });
    expect(both.floorSurcharge).toBe(single.floorSurcharge * 2);
  });

  it('eşya sayısına göre ek ücret alır', () => {
    const estimate = estimateMoving({ ...base, itemCount: 10 });
    expect(estimate.itemSurcharge).toBe(fromLira(1_500));
  });

  it('negatif eşya sayısını sıfır kabul eder', () => {
    const estimate = estimateMoving({ ...base, itemCount: -5 });
    expect(estimate.itemSurcharge).toBe(ZERO);
  });

  it('ek hizmetleri toplama ekler', () => {
    const withExtras = estimateMoving({ ...base, needsPacking: true, needsAssembly: true });
    const without = estimateMoving(base);

    expect(withExtras.total).toBe(without.total + withExtras.packingFee + withExtras.assemblyFee);
  });

  it('bileşenlerin toplamı genel toplama eşittir', () => {
    const estimate = estimateMoving({
      houseSize: 'villa',
      fromFloor: 2,
      fromHasElevator: false,
      toFloor: 5,
      toHasElevator: true,
      itemCount: 25,
      needsPacking: true,
      needsAssembly: true,
    });

    const componentSum =
      estimate.basePrice +
      estimate.floorSurcharge +
      estimate.itemSurcharge +
      estimate.packingFee +
      estimate.assemblyFee;

    expect(estimate.total).toBe(componentSum);
  });
});
