/**
 * Fiyatlandırma kuralları.
 *
 * Bu modül saf fonksiyonlardan oluşur ve hem sunucu hem tarayıcı tarafından kullanılır.
 * Tarayıcı bunu yalnızca kullanıcıya tahmini tutarı *göstermek* için çağırır.
 *
 * ÖNEMLİ: Bir siparişin veya teklifin bağlayıcı tutarı daima sunucuda, veritabanından
 * okunan fiyatlarla yeniden hesaplanır. Tarayıcıdan gelen hiçbir tutar güvenilmez kabul
 * edilir. Eski kod tabanında sipariş toplamı istemcinin gönderdiği `item.price`
 * değerlerinden hesaplanıyordu; bu, herhangi bir ürünün 1 ₺'ye sipariş edilmesine
 * izin veriyordu.
 */

import type { Kurus } from './money.ts';
import { ZERO, add, fromKurus, fromLira, multiply, sum } from './money.ts';
import type { DeliveryMethod } from './status.ts';
import type { IzmirDistrict } from './locations.ts';
import { HOME_DISTRICT } from './locations.ts';

// ---------------------------------------------------------------------------
// Teslimat ücreti
// ---------------------------------------------------------------------------

/** Buca içi teslimat ücretsizdir. */
export const DELIVERY_FEE_HOME_DISTRICT: Kurus = ZERO;

/** Buca dışındaki İzmir ilçelerine sabit teslimat ücreti. */
export const DELIVERY_FEE_OTHER_DISTRICT: Kurus = fromLira(500);

/** Bu tutarın üzerindeki siparişlerde teslimat ücreti alınmaz. */
export const FREE_DELIVERY_THRESHOLD: Kurus = fromLira(15_000);

export interface DeliveryFeeInput {
  readonly method: DeliveryMethod;
  readonly district: IzmirDistrict;
  /** Ürünlerin ara toplamı — ücretsiz teslimat eşiğini kontrol etmek için. */
  readonly subtotal: Kurus;
}

/**
 * Teslimat ücretini hesaplar.
 *
 * Mağazadan teslim alımda ücret yoktur. Adrese teslimatta Buca içi ücretsizdir,
 * diğer ilçelerde sabit ücret uygulanır; ancak ara toplam ücretsiz teslimat eşiğini
 * geçiyorsa ücret alınmaz.
 */
export function calculateDeliveryFee(input: DeliveryFeeInput): Kurus {
  if (input.method === 'store_pickup') return ZERO;
  if (input.district === HOME_DISTRICT) return DELIVERY_FEE_HOME_DISTRICT;
  if (input.subtotal >= FREE_DELIVERY_THRESHOLD) return ZERO;
  return DELIVERY_FEE_OTHER_DISTRICT;
}

// ---------------------------------------------------------------------------
// Sipariş toplamı
// ---------------------------------------------------------------------------

export interface OrderTotals {
  readonly subtotal: Kurus;
  readonly deliveryFee: Kurus;
  readonly total: Kurus;
}

/**
 * Sipariş toplamlarını hesaplar.
 *
 * Girdi, kalem fiyatlarının listesidir; adet yoktur. İkinci el ürünler tekildir
 * ve bir üründen yalnızca bir tane satılabilir — adet parametresi "ileride
 * lazım olur" diye duruyordu ve tek etkisi, doğrudan API'ye istek atan birinin
 * tek bir ürün için birden çok kez ücretlendirilmesiydi.
 *
 * Hem sunucu hem tarayıcı bu fonksiyonu çağırır; iki tarafın hesabı yapısal
 * olarak aynıdır.
 */
export function calculateOrderTotals(
  prices: readonly Kurus[],
  delivery: Omit<DeliveryFeeInput, 'subtotal'>,
): OrderTotals {
  const subtotal = sum(prices);
  const deliveryFee = calculateDeliveryFee({ ...delivery, subtotal });

  return {
    subtotal,
    deliveryFee,
    total: add(subtotal, deliveryFee),
  };
}

// ---------------------------------------------------------------------------
// Nakliye tahmini
// ---------------------------------------------------------------------------

export const HOUSE_SIZES = ['1+0', '1+1', '2+1', '3+1', '4+1', '5+1', 'villa', 'office'] as const;
export type HouseSize = (typeof HOUSE_SIZES)[number];

export const HOUSE_SIZE_LABELS: Readonly<Record<HouseSize, string>> = {
  '1+0': 'Stüdyo (1+0)',
  '1+1': '1+1',
  '2+1': '2+1',
  '3+1': '3+1',
  '4+1': '4+1',
  '5+1': '5+1 ve üzeri',
  villa: 'Villa / Müstakil',
  office: 'İş Yeri / Ofis',
};

/** Ev büyüklüğüne göre temel fiyat çarpanı. */
const HOUSE_SIZE_MULTIPLIER: Readonly<Record<HouseSize, number>> = {
  '1+0': 1.0,
  '1+1': 1.2,
  '2+1': 1.5,
  '3+1': 1.9,
  '4+1': 2.3,
  '5+1': 2.8,
  villa: 3.2,
  office: 2.5,
};

export const MOVING_BASE_PRICE: Kurus = fromLira(4_000);

/** Asansörsüz binalarda kat başına eklenen ücret. */
export const MOVING_FLOOR_SURCHARGE: Kurus = fromLira(350);

/** Asansör kullanılabiliyorsa kat ücreti bu oranda uygulanır. */
const ELEVATOR_DISCOUNT_FACTOR = 0.2;

/** Eşya listesindeki her kalem için eklenen ücret. */
export const MOVING_ITEM_SURCHARGE: Kurus = fromLira(150);

/** Ambalajlama hizmeti seçilirse eklenen sabit ücret. */
export const MOVING_PACKING_FEE: Kurus = fromLira(2_500);

/** Montaj/demontaj hizmeti seçilirse eklenen sabit ücret. */
export const MOVING_ASSEMBLY_FEE: Kurus = fromLira(1_800);

export interface MovingEstimateInput {
  readonly houseSize: HouseSize;
  /** Çıkış adresinin bulunduğu kat. Zemin kat için 0. */
  readonly fromFloor: number;
  readonly fromHasElevator: boolean;
  readonly toFloor: number;
  readonly toHasElevator: boolean;
  /** Taşınacak eşya kalemi sayısı. */
  readonly itemCount: number;
  readonly needsPacking: boolean;
  readonly needsAssembly: boolean;
}

export interface MovingEstimate {
  readonly basePrice: Kurus;
  readonly floorSurcharge: Kurus;
  readonly itemSurcharge: Kurus;
  readonly packingFee: Kurus;
  readonly assemblyFee: Kurus;
  readonly total: Kurus;
}

function floorCost(floor: number, hasElevator: boolean): Kurus {
  if (floor <= 0) return ZERO;
  const raw = MOVING_FLOOR_SURCHARGE * floor;
  const adjusted = hasElevator ? raw * ELEVATOR_DISCOUNT_FACTOR : raw;

  /*
    `as Kurus` yerine yapıcı kullanılır. Markalı tipin tüm anlamı, para
    değerinin doğrulamadan geçmeden üretilememesidir; dönüşümle atlandığında
    tip bir belge notundan ibaret kalır.
  */
  return fromKurus(Math.round(adjusted));
}

/**
 * Nakliye için tahmini fiyat üretir.
 *
 * Bu bir tahmindir, teklif değildir. Bağlayıcı fiyat, talep incelendikten sonra
 * yönetim panelinden girilir ve müşteriye ayrıca bildirilir. Arayüzde daima
 * "tahmini" ibaresiyle gösterilmelidir.
 */
export function estimateMoving(input: MovingEstimateInput): MovingEstimate {
  const multiplier = HOUSE_SIZE_MULTIPLIER[input.houseSize];
  const basePrice = fromKurus(Math.round(MOVING_BASE_PRICE * multiplier));

  const floorSurcharge = add(
    floorCost(input.fromFloor, input.fromHasElevator),
    floorCost(input.toFloor, input.toHasElevator),
  );

  const itemSurcharge = multiply(MOVING_ITEM_SURCHARGE, Math.max(0, input.itemCount));
  const packingFee = input.needsPacking ? MOVING_PACKING_FEE : ZERO;
  const assemblyFee = input.needsAssembly ? MOVING_ASSEMBLY_FEE : ZERO;

  return {
    basePrice,
    floorSurcharge,
    itemSurcharge,
    packingFee,
    assemblyFee,
    total: sum([basePrice, floorSurcharge, itemSurcharge, packingFee, assemblyFee]),
  };
}

// ---------------------------------------------------------------------------
// Teknik servis
// ---------------------------------------------------------------------------

/**
 * Keşif ücreti. Onarım kabul edilirse toplam tutardan düşülür; müşteri onarımı
 * reddederse yalnızca bu ücret tahsil edilir.
 */
export const INSPECTION_FEE: Kurus = fromLira(750);
