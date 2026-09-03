/**
 * Hizmet talebi veri erişimi — ortak taban.
 *
 * Üç hizmet türünün paylaştığı işlemler burada: taban kayıt, adresler,
 * fotoğraflar, teklifler, randevular ve zaman çizelgesi. Türe özgü detay
 * tabloları kendi repository dosyalarındadır.
 */

import { and, desc, eq, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { businessDayEnd, businessDayStart } from '@ersinspot/shared';
import type {
  AdminRequestListQuery,
  IzmirDistrict,
  RequestListQuery,
  RequestStatus,
  ServiceKind,
} from '@ersinspot/shared';
import { contains } from '../../../platform/db/search.ts';
import { db } from '../../../platform/db/client.ts';
import type { Transaction } from '../../../platform/db/client.ts';
import {
  requestAddresses,
  requestAppointments,
  requestEvents,
  requestPhotos,
  requestQuotes,
  serviceRequests,
} from './schema.ts';

type Executor = Transaction | typeof db;

export type AddressRole = 'moving_from' | 'moving_to' | 'service_location' | 'pickup';

// ---------------------------------------------------------------------------
// Satır tipleri
// ---------------------------------------------------------------------------

export interface RequestRow {
  id: string;
  referenceNumber: string;
  kind: ServiceKind;
  userId: string | null;
  status: RequestStatus;
  contactName: string;
  contactPhone: string;
  customerNote: string | null;
  staffNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddressRow {
  role: AddressRole;
  district: IzmirDistrict;
  neighborhood: string;
  street: string;
  buildingNo: string;
  apartmentNo: string | null;
  directions: string | null;
}

export interface PhotoRow {
  id: string;
  storageKey: string;
  caption: string | null;
  displayOrder: number;
}

export interface QuoteRow {
  id: string;
  amountKurus: number;
  validUntil: string;
  note: string | null;
  supersededAt: Date | null;
  createdAt: Date;
}

export interface AppointmentRow {
  id: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  note: string | null;
  cancelledAt: Date | null;
}

export interface EventRow {
  status: RequestStatus;
  note: string | null;
  actor: 'customer' | 'staff' | 'system';
  createdAt: Date;
}

const requestSelection = {
  id: serviceRequests.id,
  referenceNumber: serviceRequests.referenceNumber,
  kind: serviceRequests.kind,
  userId: serviceRequests.userId,
  status: serviceRequests.status,
  contactName: serviceRequests.contactName,
  contactPhone: serviceRequests.contactPhone,
  customerNote: serviceRequests.customerNote,
  staffNote: serviceRequests.staffNote,
  createdAt: serviceRequests.createdAt,
  updatedAt: serviceRequests.updatedAt,
} as const;

// ---------------------------------------------------------------------------
// Oluşturma
// ---------------------------------------------------------------------------

export async function insertRequest(
  row: {
    referenceNumber: string;
    kind: ServiceKind;
    userId: string;
    contactName: string;
    contactPhone: string;
    customerNote: string | null;
  },
  tx: Transaction,
): Promise<string> {
  const [created] = await tx
    .insert(serviceRequests)
    .values(row)
    .returning({ id: serviceRequests.id });

  if (created === undefined) {
    throw new Error('Hizmet talebi kaydı oluşturulamadı.');
  }

  return created.id;
}

export interface AddressInsert {
  role: AddressRole;
  district: IzmirDistrict;
  neighborhood: string;
  street: string;
  buildingNo: string;
  apartmentNo: string | null;
  directions: string | null;
}

export async function insertAddresses(
  requestId: string,
  addresses: readonly AddressInsert[],
  tx: Transaction,
): Promise<void> {
  if (addresses.length === 0) return;

  await tx.insert(requestAddresses).values(addresses.map((address) => ({ requestId, ...address })));
}

export async function insertPhotos(
  requestId: string,
  photos: readonly { storageKey: string; caption: string | null }[],
  tx: Transaction,
): Promise<void> {
  if (photos.length === 0) return;

  await tx.insert(requestPhotos).values(
    photos.map((photo, index) => ({
      requestId,
      storageKey: photo.storageKey,
      caption: photo.caption,
      displayOrder: index,
    })),
  );
}

export async function insertEvent(
  requestId: string,
  status: RequestStatus,
  actor: 'customer' | 'staff' | 'system',
  options: { note?: string | null; actorUserId?: string | null },
  tx: Transaction,
): Promise<void> {
  await tx.insert(requestEvents).values({
    requestId,
    status,
    actor,
    note: options.note ?? null,
    actorUserId: options.actorUserId ?? null,
  });
}

// ---------------------------------------------------------------------------
// Okuma
// ---------------------------------------------------------------------------

export async function findById(
  requestId: string,
  executor: Executor = db,
): Promise<RequestRow | null> {
  const rows = await executor
    .select(requestSelection)
    .from(serviceRequests)
    .where(eq(serviceRequests.id, requestId))
    .limit(1);

  return rows[0] ?? null;
}

export async function findByReferenceNumber(reference: string): Promise<RequestRow | null> {
  const rows = await db
    .select(requestSelection)
    .from(serviceRequests)
    .where(eq(serviceRequests.referenceNumber, reference))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Talebi kilitleyerek okur.
 *
 * Durum değişikliği yapılmadan önce çağrılır: iki personel aynı anda işlem
 * yaparsa ikincisi ilkinin sonucunu görür ve geçersiz geçiş yapamaz.
 */
export async function findByIdForUpdate(
  requestId: string,
  tx: Transaction,
): Promise<RequestRow | null> {
  const rows = await tx
    .select(requestSelection)
    .from(serviceRequests)
    .where(eq(serviceRequests.id, requestId))
    .for('update')
    .limit(1);

  return rows[0] ?? null;
}

export async function findAddresses(requestId: string): Promise<AddressRow[]> {
  return db
    .select({
      role: requestAddresses.role,
      district: requestAddresses.district,
      neighborhood: requestAddresses.neighborhood,
      street: requestAddresses.street,
      buildingNo: requestAddresses.buildingNo,
      apartmentNo: requestAddresses.apartmentNo,
      directions: requestAddresses.directions,
    })
    .from(requestAddresses)
    .where(eq(requestAddresses.requestId, requestId));
}

export async function findPhotos(requestId: string): Promise<PhotoRow[]> {
  return db
    .select({
      id: requestPhotos.id,
      storageKey: requestPhotos.storageKey,
      caption: requestPhotos.caption,
      displayOrder: requestPhotos.displayOrder,
    })
    .from(requestPhotos)
    .where(eq(requestPhotos.requestId, requestId))
    .orderBy(requestPhotos.displayOrder);
}

/** Geçerli teklif: yerine yenisi verilmemiş en son teklif. */
export async function findCurrentQuote(
  requestId: string,
  executor: Executor = db,
): Promise<QuoteRow | null> {
  const rows = await executor
    .select({
      id: requestQuotes.id,
      amountKurus: requestQuotes.amountKurus,
      validUntil: requestQuotes.validUntil,
      note: requestQuotes.note,
      supersededAt: requestQuotes.supersededAt,
      createdAt: requestQuotes.createdAt,
    })
    .from(requestQuotes)
    .where(and(eq(requestQuotes.requestId, requestId), isNull(requestQuotes.supersededAt)))
    .orderBy(desc(requestQuotes.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

/** Planlanmış randevu: iptal edilmemiş en son randevu. */
export async function findCurrentAppointment(
  requestId: string,
  executor: Executor = db,
): Promise<AppointmentRow | null> {
  const rows = await executor
    .select({
      id: requestAppointments.id,
      scheduledDate: requestAppointments.scheduledDate,
      startTime: requestAppointments.startTime,
      endTime: requestAppointments.endTime,
      note: requestAppointments.note,
      cancelledAt: requestAppointments.cancelledAt,
    })
    .from(requestAppointments)
    .where(
      and(eq(requestAppointments.requestId, requestId), isNull(requestAppointments.cancelledAt)),
    )
    .orderBy(desc(requestAppointments.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Talebin zaman çizelgesi, eskiden yeniye.
 *
 * `id` ikincil sıralama anahtarıdır. Damga artık `clock_timestamp()` ile
 * yazıldığı için yeni kayıtlarda eşitlik pratikte oluşmaz; ama `now()`
 * döneminden kalan satırlar aynı damgayı taşır ve tek anahtarla sıralandığında
 * sıraları her okumada değişebilirdi. İkinci anahtar o kayıtların sırasını da
 * en azından SABİT tutar.
 */
export async function findEvents(requestId: string): Promise<EventRow[]> {
  return db
    .select({
      status: requestEvents.status,
      note: requestEvents.note,
      actor: requestEvents.actor,
      createdAt: requestEvents.createdAt,
    })
    .from(requestEvents)
    .where(eq(requestEvents.requestId, requestId))
    .orderBy(requestEvents.createdAt, requestEvents.id);
}

/** Birden çok talebin geçerli tekliflerini tek sorguda çeker (N+1 önlenir). */
export async function findCurrentQuotesForRequests(
  requestIds: readonly string[],
): Promise<Map<string, QuoteRow>> {
  if (requestIds.length === 0) return new Map();

  const rows = await db
    .select({
      requestId: requestQuotes.requestId,
      id: requestQuotes.id,
      amountKurus: requestQuotes.amountKurus,
      validUntil: requestQuotes.validUntil,
      note: requestQuotes.note,
      supersededAt: requestQuotes.supersededAt,
      createdAt: requestQuotes.createdAt,
    })
    .from(requestQuotes)
    .where(
      and(inArray(requestQuotes.requestId, [...requestIds]), isNull(requestQuotes.supersededAt)),
    );

  const result = new Map<string, QuoteRow>();

  for (const row of rows) {
    const existing = result.get(row.requestId);
    // Aynı talebe birden fazla geçerli teklif olmamalı; yine de en yenisi seçilir.
    if (existing === undefined || row.createdAt > existing.createdAt) {
      result.set(row.requestId, row);
    }
  }

  return result;
}

/** Birden çok talebin randevularını tek sorguda çeker. */
export async function findAppointmentsForRequests(
  requestIds: readonly string[],
): Promise<Map<string, AppointmentRow>> {
  if (requestIds.length === 0) return new Map();

  const rows = await db
    .select({
      requestId: requestAppointments.requestId,
      id: requestAppointments.id,
      scheduledDate: requestAppointments.scheduledDate,
      startTime: requestAppointments.startTime,
      endTime: requestAppointments.endTime,
      note: requestAppointments.note,
      cancelledAt: requestAppointments.cancelledAt,
    })
    .from(requestAppointments)
    .where(
      and(
        inArray(requestAppointments.requestId, [...requestIds]),
        isNull(requestAppointments.cancelledAt),
      ),
    );

  return new Map(rows.map((row) => [row.requestId, row]));
}

// ---------------------------------------------------------------------------
// Listeleme
// ---------------------------------------------------------------------------

export interface ListResult {
  readonly rows: readonly RequestRow[];
  readonly totalCount: number;
}

export async function listForUser(userId: string, query: RequestListQuery): Promise<ListResult> {
  const conditions: SQL[] = [eq(serviceRequests.userId, userId)];

  if (query.status !== undefined) {
    conditions.push(eq(serviceRequests.status, query.status));
  }
  if (query.kind !== undefined) {
    conditions.push(eq(serviceRequests.kind, query.kind));
  }

  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select(requestSelection)
    .from(serviceRequests)
    .where(and(...conditions))
    .orderBy(desc(serviceRequests.createdAt))
    .limit(query.pageSize)
    .offset(offset);

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(serviceRequests)
    .where(and(...conditions));

  return { rows, totalCount: countRow?.value ?? 0 };
}

export async function listForAdmin(query: AdminRequestListQuery): Promise<ListResult> {
  const conditions: SQL[] = [];

  if (query.status !== undefined) {
    conditions.push(eq(serviceRequests.status, query.status));
  }
  if (query.kind !== undefined) {
    conditions.push(eq(serviceRequests.kind, query.kind));
  }
  // Sınırlar işletmenin saat dilimine göre; sipariş listesiyle aynı kural.
  if (query.fromDate !== undefined) {
    conditions.push(gte(serviceRequests.createdAt, businessDayStart(query.fromDate)));
  }
  if (query.toDate !== undefined) {
    conditions.push(lt(serviceRequests.createdAt, businessDayEnd(query.toDate)));
  }

  if (query.search !== undefined && query.search !== '') {
    const searchCondition = or(
      contains(serviceRequests.referenceNumber, query.search),
      contains(serviceRequests.contactName, query.search),
      contains(serviceRequests.contactPhone, query.search),
    );
    if (searchCondition !== undefined) {
      conditions.push(searchCondition);
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select(requestSelection)
    .from(serviceRequests)
    .where(where)
    .orderBy(desc(serviceRequests.createdAt))
    .limit(query.pageSize)
    .offset(offset);

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(serviceRequests)
    .where(where);

  return { rows, totalCount: countRow?.value ?? 0 };
}

/** Müşterinin açık talep sayısı. Kötüye kullanım sınırı için. */
export async function countActiveForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.userId, userId),
        inArray(serviceRequests.status, [
          'pending',
          'reviewing',
          'quoted',
          'accepted',
          'scheduled',
        ]),
      ),
    );

  return row?.value ?? 0;
}

// ---------------------------------------------------------------------------
// Güncelleme
// ---------------------------------------------------------------------------

export async function updateStatus(
  requestId: string,
  status: RequestStatus,
  tx: Transaction,
): Promise<void> {
  await tx.update(serviceRequests).set({ status }).where(eq(serviceRequests.id, requestId));
}

/**
 * Personel notunu yazar. Boş metin notu SİLER.
 *
 * Boş dize ile `null` arasındaki ayrım burada kapanır: sözleşme boş metni
 * "notu kaldır" olarak tanımlar, veritabanı ise yokluğu `null` ile gösterir.
 */
export async function updateStaffNote(requestId: string, staffNote: string): Promise<void> {
  await db
    .update(serviceRequests)
    .set({ staffNote: staffNote === '' ? null : staffNote })
    .where(eq(serviceRequests.id, requestId));
}

/**
 * Yeni teklif ekler ve öncekini geçersiz kılar.
 *
 * Geçmiş teklifler silinmez: "bize şu fiyatı vermiştiniz" tartışmalarında kaydın
 * korunması gerekir.
 */
export async function insertQuote(
  row: {
    requestId: string;
    amountKurus: number;
    validUntil: string;
    note: string | null;
    createdByUserId: string;
  },
  tx: Transaction,
): Promise<void> {
  await tx
    .update(requestQuotes)
    .set({ supersededAt: new Date() })
    .where(and(eq(requestQuotes.requestId, row.requestId), isNull(requestQuotes.supersededAt)));

  await tx.insert(requestQuotes).values(row);
}

export async function insertAppointment(
  row: {
    requestId: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    note: string | null;
    createdByUserId: string;
  },
  tx: Transaction,
): Promise<void> {
  // Önceki randevu varsa iptal edilir; takvim geçmişi korunur.
  await tx
    .update(requestAppointments)
    .set({ cancelledAt: new Date() })
    .where(
      and(
        eq(requestAppointments.requestId, row.requestId),
        isNull(requestAppointments.cancelledAt),
      ),
    );

  await tx.insert(requestAppointments).values(row);
}

/**
 * Belirli bir gündeki randevuları döndürür.
 *
 * Yönetim takviminde doluluk göstermek ve çakışan randevu verilmesini
 * engellemek için.
 */
export async function findAppointmentsOnDate(date: string): Promise<
  {
    requestId: string;
    referenceNumber: string;
    kind: ServiceKind;
    startTime: string;
    endTime: string;
  }[]
> {
  return db
    .select({
      requestId: requestAppointments.requestId,
      referenceNumber: serviceRequests.referenceNumber,
      kind: serviceRequests.kind,
      startTime: requestAppointments.startTime,
      endTime: requestAppointments.endTime,
    })
    .from(requestAppointments)
    .innerJoin(serviceRequests, eq(requestAppointments.requestId, serviceRequests.id))
    .where(
      and(eq(requestAppointments.scheduledDate, date), isNull(requestAppointments.cancelledAt)),
    )
    .orderBy(requestAppointments.startTime);
}
