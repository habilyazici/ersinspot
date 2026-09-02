/**
 * Türe özgü detay tablolarının veri erişimi.
 *
 * Taban tablo (`service_requests`) ortak yaşam döngüsünü taşır; bu dosya
 * nakliye, teknik servis ve satış talebine özgü alanları yönetir.
 *
 * Veritabanı tetikleyicisi, her talebin türüne uygun tam bir detay satırı
 * olmasını zorunlu kılar; ertelenmiş çalıştığı için taban ve detay aynı işlem
 * içinde herhangi bir sırayla yazılabilir.
 */

import { eq, inArray } from 'drizzle-orm';
import type {
  DeviceType,
  HouseSize,
  ProblemCategory,
  ProductCondition,
  WarrantyStatus,
} from '@ersinspot/shared';
import { db } from '../../../platform/db/client.ts';
import type { Transaction } from '../../../platform/db/client.ts';
import {
  movingRequestDetails,
  movingRequestItems,
  sellRequestDetails,
  technicalServiceDetails,
} from './schema.ts';

type Executor = Transaction | typeof db;

// ---------------------------------------------------------------------------
// Nakliye
// ---------------------------------------------------------------------------

export interface MovingDetailRow {
  houseSize: HouseSize;
  fromFloor: number;
  fromHasElevator: boolean;
  toFloor: number;
  toHasElevator: boolean;
  preferredDate: string;
  preferredStartTime: string | null;
  preferredEndTime: string | null;
  needsPacking: boolean;
  needsAssembly: boolean;
  estimatedTotalKurus: number;
}

export interface MovingItemRow {
  id: string;
  name: string;
  quantity: number;
  needsDisassembly: boolean;
  note: string | null;
}

export async function insertMovingDetail(
  requestId: string,
  detail: MovingDetailRow,
  tx: Transaction,
): Promise<void> {
  await tx.insert(movingRequestDetails).values({ requestId, ...detail });
}

export async function insertMovingItems(
  requestId: string,
  items: readonly {
    name: string;
    quantity: number;
    needsDisassembly: boolean;
    note: string | null;
  }[],
  tx: Transaction,
): Promise<void> {
  if (items.length === 0) return;

  await tx
    .insert(movingRequestItems)
    .values(items.map((item, index) => ({ requestId, ...item, displayOrder: index })));
}

export async function findMovingDetail(
  requestId: string,
  executor: Executor = db,
): Promise<MovingDetailRow | null> {
  const rows = await executor
    .select({
      houseSize: movingRequestDetails.houseSize,
      fromFloor: movingRequestDetails.fromFloor,
      fromHasElevator: movingRequestDetails.fromHasElevator,
      toFloor: movingRequestDetails.toFloor,
      toHasElevator: movingRequestDetails.toHasElevator,
      preferredDate: movingRequestDetails.preferredDate,
      preferredStartTime: movingRequestDetails.preferredStartTime,
      preferredEndTime: movingRequestDetails.preferredEndTime,
      needsPacking: movingRequestDetails.needsPacking,
      needsAssembly: movingRequestDetails.needsAssembly,
      estimatedTotalKurus: movingRequestDetails.estimatedTotalKurus,
    })
    .from(movingRequestDetails)
    .where(eq(movingRequestDetails.requestId, requestId))
    .limit(1);

  return rows[0] ?? null;
}

export async function findMovingItems(requestId: string): Promise<MovingItemRow[]> {
  return db
    .select({
      id: movingRequestItems.id,
      name: movingRequestItems.name,
      quantity: movingRequestItems.quantity,
      needsDisassembly: movingRequestItems.needsDisassembly,
      note: movingRequestItems.note,
    })
    .from(movingRequestItems)
    .where(eq(movingRequestItems.requestId, requestId))
    .orderBy(movingRequestItems.displayOrder);
}

// ---------------------------------------------------------------------------
// Teknik servis
// ---------------------------------------------------------------------------

export interface TechnicalDetailRow {
  deviceType: DeviceType;
  customDeviceType: string | null;
  brand: string;
  model: string | null;
  warrantyStatus: WarrantyStatus;
  problemCategory: ProblemCategory;
  problemDescription: string;
  preferredDate: string;
  preferredStartTime: string | null;
  preferredEndTime: string | null;
  inspectionFeeKurus: number;
  diagnosis: string | null;
}

export async function insertTechnicalDetail(
  requestId: string,
  detail: Omit<TechnicalDetailRow, 'diagnosis'>,
  tx: Transaction,
): Promise<void> {
  await tx.insert(technicalServiceDetails).values({ requestId, ...detail });
}

export async function findTechnicalDetail(
  requestId: string,
  executor: Executor = db,
): Promise<TechnicalDetailRow | null> {
  const rows = await executor
    .select({
      deviceType: technicalServiceDetails.deviceType,
      customDeviceType: technicalServiceDetails.customDeviceType,
      brand: technicalServiceDetails.brand,
      model: technicalServiceDetails.model,
      warrantyStatus: technicalServiceDetails.warrantyStatus,
      problemCategory: technicalServiceDetails.problemCategory,
      problemDescription: technicalServiceDetails.problemDescription,
      preferredDate: technicalServiceDetails.preferredDate,
      preferredStartTime: technicalServiceDetails.preferredStartTime,
      preferredEndTime: technicalServiceDetails.preferredEndTime,
      inspectionFeeKurus: technicalServiceDetails.inspectionFeeKurus,
      diagnosis: technicalServiceDetails.diagnosis,
    })
    .from(technicalServiceDetails)
    .where(eq(technicalServiceDetails.requestId, requestId))
    .limit(1);

  return rows[0] ?? null;
}

/** Teknisyenin keşif sonrası girdiği tespiti kaydeder. */
export async function updateDiagnosis(requestId: string, diagnosis: string): Promise<void> {
  await db
    .update(technicalServiceDetails)
    .set({ diagnosis })
    .where(eq(technicalServiceDetails.requestId, requestId));
}

// ---------------------------------------------------------------------------
// Satış talebi
// ---------------------------------------------------------------------------

export interface SellDetailRow {
  title: string;
  categoryId: string;
  brand: string;
  model: string | null;
  condition: ProductCondition;
  purchaseYear: number | null;
  description: string;
  hasBox: boolean;
  hasAccessories: boolean;
  hasWarranty: boolean;
  askingPriceKurus: number | null;
  resultingProductId: string | null;
}

export async function insertSellDetail(
  requestId: string,
  detail: Omit<SellDetailRow, 'resultingProductId'>,
  tx: Transaction,
): Promise<void> {
  await tx.insert(sellRequestDetails).values({ requestId, ...detail });
}

export async function findSellDetail(
  requestId: string,
  executor: Executor = db,
): Promise<SellDetailRow | null> {
  const rows = await executor
    .select({
      title: sellRequestDetails.title,
      categoryId: sellRequestDetails.categoryId,
      brand: sellRequestDetails.brand,
      model: sellRequestDetails.model,
      condition: sellRequestDetails.condition,
      purchaseYear: sellRequestDetails.purchaseYear,
      description: sellRequestDetails.description,
      hasBox: sellRequestDetails.hasBox,
      hasAccessories: sellRequestDetails.hasAccessories,
      hasWarranty: sellRequestDetails.hasWarranty,
      askingPriceKurus: sellRequestDetails.askingPriceKurus,
      resultingProductId: sellRequestDetails.resultingProductId,
    })
    .from(sellRequestDetails)
    .where(eq(sellRequestDetails.requestId, requestId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Liste ekranında gösterilecek başlıkları TEK sorgu turunda toplar.
 *
 * Başlık türe göre farklı tablodan gelir: nakliyede ev büyüklüğü, teknik
 * serviste marka ve cihaz, satış talebinde ürün adı. Talep başına ayrı sorgu
 * çalıştırmak, sayfa boyutu kadar gidiş-dönüş demekti (sayfa başına 100'e
 * kadar) — üç sorguya iner.
 *
 * @returns Talep kimliğinden başlığa eşleme. Detayı bulunamayan talep haritada
 *   yer almaz; çağıran taraf türe göre bir yedek başlık kullanır.
 */
export async function findTitlesForRequests(
  requestIds: readonly string[],
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();

  if (requestIds.length === 0) return titles;

  const ids = [...requestIds];

  const [moving, technical, sell] = await Promise.all([
    db
      .select({
        requestId: movingRequestDetails.requestId,
        houseSize: movingRequestDetails.houseSize,
      })
      .from(movingRequestDetails)
      .where(inArray(movingRequestDetails.requestId, ids)),

    db
      .select({
        requestId: technicalServiceDetails.requestId,
        brand: technicalServiceDetails.brand,
        deviceType: technicalServiceDetails.deviceType,
        customDeviceType: technicalServiceDetails.customDeviceType,
      })
      .from(technicalServiceDetails)
      .where(inArray(technicalServiceDetails.requestId, ids)),

    db
      .select({ requestId: sellRequestDetails.requestId, title: sellRequestDetails.title })
      .from(sellRequestDetails)
      .where(inArray(sellRequestDetails.requestId, ids)),
  ]);

  for (const row of moving) {
    titles.set(row.requestId, `${row.houseSize} Nakliye`);
  }
  for (const row of technical) {
    titles.set(row.requestId, `${row.brand} ${row.customDeviceType ?? row.deviceType}`);
  }
  for (const row of sell) {
    titles.set(row.requestId, row.title);
  }

  return titles;
}

/**
 * Talep kabul edilip ürün teslim alındığında, oluşturulan katalog kaydını bağlar.
 *
 * Satış talebi ile envanter arasındaki izlenebilirliği sağlar: bu ürün nereden
 * geldi sorusunun cevabı kayıtlı kalır.
 */
export async function linkResultingProduct(
  requestId: string,
  productId: string,
  tx: Transaction,
): Promise<void> {
  await tx
    .update(sellRequestDetails)
    .set({ resultingProductId: productId })
    .where(eq(sellRequestDetails.requestId, requestId));
}
