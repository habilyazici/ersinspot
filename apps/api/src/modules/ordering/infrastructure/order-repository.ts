/**
 * Sipariş veri erişimi.
 *
 * Yazma işlemleri daima bir işlem (transaction) içinde çağrılır: sipariş, kalemler,
 * adres ve olay kaydı ya birlikte yazılır ya da hiçbiri yazılmaz.
 */

import { and, asc, desc, eq, gte, inArray, lt, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { businessDayEnd, businessDayStart } from '@ersinspot/shared';
import type {
  AdminOrderListQuery,
  DeliveryMethod,
  OrderListQuery,
  OrderStatus,
  PaymentMethod,
  ProductCondition,
  IzmirDistrict,
} from '@ersinspot/shared';
import { contains } from '../../../platform/db/search.ts';
import { db } from '../../../platform/db/client.ts';
import type { Transaction } from '../../../platform/db/client.ts';
import { orderAddresses, orderEvents, orderItems, orders } from './schema.ts';

type Executor = Transaction | typeof db;

// ---------------------------------------------------------------------------
// Satır tipleri
// ---------------------------------------------------------------------------

export interface OrderRow {
  id: string;
  referenceNumber: string;
  userId: string | null;
  status: OrderStatus;
  contactName: string;
  contactPhone: string;
  deliveryMethod: DeliveryMethod;
  deliveryDate: string | null;
  deliveryStartTime: string | null;
  deliveryEndTime: string | null;
  paymentMethod: PaymentMethod;
  subtotalKurus: number;
  deliveryFeeKurus: number;
  totalKurus: number;
  note: string | null;
  staffNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemRow {
  id: string;
  orderId: string;
  productId: string | null;
  titleSnapshot: string;
  imageStorageKeySnapshot: string | null;
  conditionSnapshot: ProductCondition;
  priceKurus: number;
}

export interface OrderAddressRow {
  district: IzmirDistrict;
  neighborhood: string;
  street: string;
  buildingNo: string;
  apartmentNo: string | null;
  directions: string | null;
}

export interface OrderEventRow {
  status: OrderStatus;
  note: string | null;
  actor: 'customer' | 'staff' | 'system';
  createdAt: Date;
}

const orderSelection = {
  id: orders.id,
  referenceNumber: orders.referenceNumber,
  userId: orders.userId,
  status: orders.status,
  contactName: orders.contactName,
  contactPhone: orders.contactPhone,
  deliveryMethod: orders.deliveryMethod,
  deliveryDate: orders.deliveryDate,
  deliveryStartTime: orders.deliveryStartTime,
  deliveryEndTime: orders.deliveryEndTime,
  paymentMethod: orders.paymentMethod,
  subtotalKurus: orders.subtotalKurus,
  deliveryFeeKurus: orders.deliveryFeeKurus,
  totalKurus: orders.totalKurus,
  note: orders.note,
  staffNote: orders.staffNote,
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
} as const;

// ---------------------------------------------------------------------------
// Oluşturma
// ---------------------------------------------------------------------------

export interface CreateOrderRow {
  referenceNumber: string;
  userId: string;
  status: OrderStatus;
  contactName: string;
  contactPhone: string;
  deliveryMethod: DeliveryMethod;
  deliveryDate: string | null;
  deliveryStartTime: string | null;
  deliveryEndTime: string | null;
  paymentMethod: PaymentMethod;
  subtotalKurus: number;
  deliveryFeeKurus: number;
  totalKurus: number;
  note: string | null;
}

export async function insertOrder(row: CreateOrderRow, tx: Transaction): Promise<string> {
  const [created] = await tx.insert(orders).values(row).returning({ id: orders.id });

  if (created === undefined) {
    throw new Error('Sipariş kaydı oluşturulamadı.');
  }

  return created.id;
}

export interface CreateOrderItemRow {
  orderId: string;
  productId: string;
  titleSnapshot: string;
  imageStorageKeySnapshot: string | null;
  conditionSnapshot: ProductCondition;
  priceKurus: number;
}

export async function insertItems(
  rows: readonly CreateOrderItemRow[],
  tx: Transaction,
): Promise<void> {
  if (rows.length === 0) return;
  await tx.insert(orderItems).values([...rows]);
}

export async function insertAddress(
  orderId: string,
  address: OrderAddressRow,
  tx: Transaction,
): Promise<void> {
  await tx.insert(orderAddresses).values({ orderId, ...address });
}

export async function insertEvent(
  orderId: string,
  status: OrderStatus,
  actor: 'customer' | 'staff' | 'system',
  options: { note?: string | null; actorUserId?: string | null },
  tx: Transaction,
): Promise<void> {
  await tx.insert(orderEvents).values({
    orderId,
    status,
    actor,
    note: options.note ?? null,
    actorUserId: options.actorUserId ?? null,
  });
}

// ---------------------------------------------------------------------------
// Okuma
// ---------------------------------------------------------------------------

export async function findById(orderId: string, executor: Executor = db): Promise<OrderRow | null> {
  const rows = await executor
    .select(orderSelection)
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  return rows[0] ?? null;
}

export async function findByReferenceNumber(reference: string): Promise<OrderRow | null> {
  const rows = await db
    .select(orderSelection)
    .from(orders)
    .where(eq(orders.referenceNumber, reference))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Siparişin kalemleri, SABİT bir sırayla.
 *
 * Sıralama olmadan satırların dönüş sırasını tarama planı belirler ve aynı
 * sipariş iki kez açıldığında kalemler farklı sırada görünebilir. Daha
 * kötüsü, sipariş listesindeki önizleme ilk kalemden üretilir
 * (`previewTitle`, `previewImageUrl`): sırasız okumada müşterinin listede
 * gördüğü ürün adı ve fotoğrafı sayfa yenilendikçe değişiyordu.
 *
 * `id` üzerinden sıralamak keyfi ama KARARLI bir sıra verir. Sepetteki ekleme
 * sırasını korumak için ayrı bir sütun gerekirdi; sözleşme böyle bir söz
 * vermiyor, tutarlılık ise gerekiyor.
 */
export async function findItems(orderId: string, executor: Executor = db): Promise<OrderItemRow[]> {
  return executor
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      titleSnapshot: orderItems.titleSnapshot,
      imageStorageKeySnapshot: orderItems.imageStorageKeySnapshot,
      conditionSnapshot: orderItems.conditionSnapshot,
      priceKurus: orderItems.priceKurus,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.id));
}

/**
 * Birden çok siparişin kalemlerini tek sorguda çeker.
 *
 * Liste ekranlarında her sipariş için ayrı sorgu çalıştırmak N+1 sorununa yol
 * açardı; eski kod tabanında bu desenden 14 tane vardı.
 */
export async function findItemsForOrders(
  orderIds: readonly string[],
): Promise<Map<string, OrderItemRow[]>> {
  if (orderIds.length === 0) return new Map();

  const rows = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      titleSnapshot: orderItems.titleSnapshot,
      imageStorageKeySnapshot: orderItems.imageStorageKeySnapshot,
      conditionSnapshot: orderItems.conditionSnapshot,
      priceKurus: orderItems.priceKurus,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, [...orderIds]))
    // Tekil okumayla aynı sıra: liste önizlemesi ile detay sayfası aynı
    // kalemi göstermelidir.
    .orderBy(asc(orderItems.orderId), asc(orderItems.id));

  const grouped = new Map<string, OrderItemRow[]>();

  for (const row of rows) {
    const existing = grouped.get(row.orderId);
    if (existing === undefined) {
      grouped.set(row.orderId, [row]);
    } else {
      existing.push(row);
    }
  }

  return grouped;
}

export async function findAddress(orderId: string): Promise<OrderAddressRow | null> {
  const rows = await db
    .select({
      district: orderAddresses.district,
      neighborhood: orderAddresses.neighborhood,
      street: orderAddresses.street,
      buildingNo: orderAddresses.buildingNo,
      apartmentNo: orderAddresses.apartmentNo,
      directions: orderAddresses.directions,
    })
    .from(orderAddresses)
    .where(eq(orderAddresses.orderId, orderId))
    .limit(1);

  return rows[0] ?? null;
}

export async function findEvents(orderId: string): Promise<OrderEventRow[]> {
  return (
    db
      .select({
        status: orderEvents.status,
        note: orderEvents.note,
        actor: orderEvents.actor,
        createdAt: orderEvents.createdAt,
      })
      .from(orderEvents)
      .where(eq(orderEvents.orderId, orderId))
      // `id` ikincil anahtar: `now()` döneminden kalan eşit damgalı kayıtların
      // sırası da sabit kalsın. Ayrıntı için migration 0008.
      .orderBy(orderEvents.createdAt, orderEvents.id)
  );
}

// ---------------------------------------------------------------------------
// Listeleme
// ---------------------------------------------------------------------------

export interface ListResult {
  readonly rows: readonly OrderRow[];
  readonly totalCount: number;
}

/** Müşterinin kendi siparişleri. */
export async function listForUser(userId: string, query: OrderListQuery): Promise<ListResult> {
  const conditions: SQL[] = [eq(orders.userId, userId)];

  if (query.status !== undefined) {
    conditions.push(eq(orders.status, query.status));
  }

  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select(orderSelection)
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(query.pageSize)
    .offset(offset);

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(...conditions));

  return { rows, totalCount: countRow?.value ?? 0 };
}

/** Yönetim paneli sipariş listesi. */
export async function listForAdmin(query: AdminOrderListQuery): Promise<ListResult> {
  const conditions: SQL[] = [];

  if (query.status !== undefined) {
    conditions.push(eq(orders.status, query.status));
  }
  /*
    Sınırlar İŞLETMENİN saat dilimine göre alınır ve aralık yarı açıktır.

    UTC gece yarısı kullanıldığında bir gün Türkiye'de 03:00'te başlıyordu:
    gece verilen siparişler o günün süzgecinde görünmüyor, ertesi günün
    süzgecinde ise fazladan sayılıyordu.
  */
  if (query.fromDate !== undefined) {
    conditions.push(gte(orders.createdAt, businessDayStart(query.fromDate)));
  }
  if (query.toDate !== undefined) {
    conditions.push(lt(orders.createdAt, businessDayEnd(query.toDate)));
  }

  if (query.search !== undefined && query.search !== '') {
    const searchCondition = or(
      contains(orders.referenceNumber, query.search),
      contains(orders.contactName, query.search),
      contains(orders.contactPhone, query.search),
    );
    if (searchCondition !== undefined) {
      conditions.push(searchCondition);
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select(orderSelection)
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(query.pageSize)
    .offset(offset);

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(orders)
    .where(where);

  return { rows, totalCount: countRow?.value ?? 0 };
}

// ---------------------------------------------------------------------------
// Güncelleme
// ---------------------------------------------------------------------------

export async function updateStatus(
  orderId: string,
  status: OrderStatus,
  tx: Transaction,
): Promise<void> {
  await tx.update(orders).set({ status }).where(eq(orders.id, orderId));
}

/**
 * Personel notunu yazar. Boş metin notu SİLER; talep tarafıyla aynı sözleşme.
 *
 * @returns Böyle bir sipariş varsa `true`.
 */
export async function updateStaffNote(orderId: string, staffNote: string): Promise<boolean> {
  const updated = await db
    .update(orders)
    .set({ staffNote: staffNote === '' ? null : staffNote })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id });

  return updated.length > 0;
}

/**
 * Ödemesi zamanında gelmemiş siparişlerin kimliklerini döndürür.
 *
 * Havale/EFT ile verilen sipariş `pending_payment` durumunda başlar ve
 * ürünleri rezerve eder. Müşteri parayı göndermez ve siparişi de iptal etmezse
 * ürünler satıştan kalıcı olarak çıkardı; bakım görevi bu siparişleri iptal
 * ederek rezervasyonu çözer.
 *
 * @param cutoff Bu andan önce oluşturulmuş siparişler süresi geçmiş sayılır.
 * @param limit Tek turda işlenecek en fazla sipariş.
 */
export async function findExpiredPendingPayment(cutoff: Date, limit: number): Promise<string[]> {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, 'pending_payment'), lt(orders.createdAt, cutoff)))
    .orderBy(asc(orders.createdAt))
    .limit(limit);

  return rows.map((row) => row.id);
}

/**
 * Siparişi kilitleyerek okur.
 *
 * Durum değişikliği yapılmadan önce çağrılır: iki personel aynı anda durum
 * değiştirmeye çalışırsa ikincisi ilkinin sonucunu görür ve geçersiz geçiş
 * yapamaz.
 */
export async function findByIdForUpdate(
  orderId: string,
  tx: Transaction,
): Promise<OrderRow | null> {
  const rows = await tx
    .select(orderSelection)
    .from(orders)
    .where(eq(orders.id, orderId))
    .for('update')
    .limit(1);

  return rows[0] ?? null;
}
