/**
 * Hizmet talebi ortak işlemleri.
 *
 * Üç hizmet türünün paylaştığı yaşam döngüsü: teklif verme, teklife yanıt,
 * randevu planlama, durum değişikliği ve iptal. Bir kez yazılır; nakliye,
 * teknik servis ve satış talebi aynı davranır.
 *
 * Eski kod tabanında bu akışlar üç ayrı yerde yazılmıştı ve ayrışmıştı:
 * nakliye yönetiminde `status === 'pending'` karşılaştırması yedi ayrı yerde
 * hiçbir zaman doğru olamıyordu.
 */

import type {
  AdminRequestListQuery,
  CreateQuoteInput,
  Paginated,
  RequestListQuery,
  RequestStatus,
  RespondToQuoteInput,
  ScheduleAppointmentInput,
  ServiceRequestSummary,
  UserRole,
} from '@ersinspot/shared';
import { paginate } from '@ersinspot/shared';
import { db } from '../../../platform/db/client.ts';
import { logger } from '../../../platform/observability/logger.ts';
import {
  businessRule,
  forbidden,
  invalidTransition,
  notFound,
} from '../../../platform/errors/index.ts';
import {
  MAX_ACTIVE_REQUESTS_PER_CUSTOMER,
  canCancelRequest,
  canRespondToQuote,
  canTransitionRequest,
  isQuoteExpired,
  requiresAppointment,
  requiresQuote,
} from '../domain/request-rules.ts';
import * as detailRepository from '../infrastructure/detail-repository.ts';
import * as repository from '../infrastructure/request-repository.ts';
import type { RequestRow } from '../infrastructure/request-repository.ts';

export interface Actor {
  readonly id: string;
  readonly role: UserRole;
}

function isStaff(role: UserRole): boolean {
  return role === 'staff' || role === 'admin';
}

/**
 * Talebi getirir ve erişim yetkisini denetler.
 *
 * IDOR koruması: müşteri yalnızca kendi talebini görebilir. Eski kodda
 * nakliye ve teknik servis yönetim uçları sahiplik kontrolü hiç yapmıyordu —
 * `moving.tsx` içindeki altı `/admin/*` ucu yalnızca "giriş yapmış mı"
 * bakıyordu, "personel mi" bakmıyordu.
 */
export async function loadRequestForViewer(requestId: string, viewer: Actor): Promise<RequestRow> {
  const row = await repository.findById(requestId);

  if (row === null) {
    throw notFound('Talep');
  }

  if (!isStaff(viewer.role) && row.userId !== viewer.id) {
    throw forbidden();
  }

  return row;
}

// ---------------------------------------------------------------------------
// Listeleme
// ---------------------------------------------------------------------------

/** Liste görünümünde gösterilecek kısa başlığı türe göre üretir. */
async function buildTitle(row: RequestRow): Promise<string> {
  switch (row.kind) {
    case 'moving': {
      const detail = await detailRepository.findMovingDetail(row.id);
      return detail === null ? 'Nakliye' : `${detail.houseSize} Nakliye`;
    }
    case 'technical_service': {
      const detail = await detailRepository.findTechnicalDetail(row.id);
      if (detail === null) return 'Teknik Servis';
      const device = detail.customDeviceType ?? detail.deviceType;
      return `${detail.brand} ${device}`;
    }
    case 'sell_request': {
      const detail = await detailRepository.findSellDetail(row.id);
      return detail?.title ?? 'Ürün Satış Talebi';
    }
  }
}

async function toSummaries(rows: readonly RequestRow[]): Promise<ServiceRequestSummary[]> {
  const ids = rows.map((row) => row.id);

  // Teklif ve randevular tek sorguda toplanır; N+1 oluşmaz.
  const [quotes, appointments] = await Promise.all([
    repository.findCurrentQuotesForRequests(ids),
    repository.findAppointmentsForRequests(ids),
  ]);

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      referenceNumber: row.referenceNumber,
      kind: row.kind,
      status: row.status,
      title: await buildTitle(row),
      quotedAmount: quotes.get(row.id)?.amountKurus ?? null,
      appointmentDate: appointments.get(row.id)?.scheduledDate ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  );
}

export async function listMyRequests(
  userId: string,
  query: RequestListQuery,
): Promise<Paginated<ServiceRequestSummary>> {
  const { rows, totalCount } = await repository.listForUser(userId, query);
  return paginate(await toSummaries(rows), totalCount, query);
}

export async function listRequestsForAdmin(
  query: AdminRequestListQuery,
): Promise<Paginated<ServiceRequestSummary>> {
  const { rows, totalCount } = await repository.listForAdmin(query);
  return paginate(await toSummaries(rows), totalCount, query);
}

// ---------------------------------------------------------------------------
// Teklif
// ---------------------------------------------------------------------------

/**
 * Fiyat teklifi verir.
 *
 * Önceki teklif geçersiz kılınır ama silinmez: "bize şu fiyatı vermiştiniz"
 * tartışmalarında kaydın korunması gerekir.
 *
 * Talep `pending` veya `reviewing` durumundayken teklif verilebilir; `quoted`
 * durumundayken revize teklif verilebilir.
 */
export async function createQuote(
  requestId: string,
  input: CreateQuoteInput,
  actor: Actor,
): Promise<void> {
  await db.transaction(async (tx) => {
    const row = await repository.findByIdForUpdate(requestId, tx);

    if (row === null) {
      throw notFound('Talep');
    }

    // `quoted` durumunda revize teklif verilebilir; durum değişmez.
    const isRevision = row.status === 'quoted';

    if (!isRevision && !canTransitionRequest(row.status, 'quoted')) {
      // İncelemeye alınmamış talepte önce durumu ilerlet.
      if (canTransitionRequest(row.status, 'reviewing')) {
        await repository.updateStatus(requestId, 'reviewing', tx);
        await repository.insertEvent(
          requestId,
          'reviewing',
          'staff',
          { actorUserId: actor.id },
          tx,
        );
      } else {
        throw invalidTransition(row.status, 'quoted', 'Talep');
      }
    }

    await repository.insertQuote(
      {
        requestId,
        amountKurus: input.amount,
        validUntil: input.validUntil,
        note: input.note ?? null,
        createdByUserId: actor.id,
      },
      tx,
    );

    if (!isRevision) {
      await repository.updateStatus(requestId, 'quoted', tx);
    }

    await repository.insertEvent(
      requestId,
      'quoted',
      'staff',
      { note: input.note ?? null, actorUserId: actor.id },
      tx,
    );

    logger.info('Teklif verildi', {
      requestId,
      amountKurus: input.amount,
      isRevision,
      actorUserId: actor.id,
    });
  });
}

/**
 * Müşterinin teklife yanıtı.
 *
 * Kabul edilirse talep randevu planlamaya hazır hale gelir; reddedilirse süreç
 * sonlanır. Süresi dolmuş teklif kabul edilemez.
 */
export async function respondToQuote(
  requestId: string,
  input: RespondToQuoteInput,
  actor: Actor,
): Promise<void> {
  await db.transaction(async (tx) => {
    const row = await repository.findByIdForUpdate(requestId, tx);

    if (row === null) {
      throw notFound('Talep');
    }

    // Sahiplik denetimi: müşteri yalnızca kendi talebine yanıt verebilir.
    if (!isStaff(actor.role) && row.userId !== actor.id) {
      throw forbidden();
    }

    if (!canRespondToQuote(row.status)) {
      throw businessRule(
        'Bu talep için yanıtlanabilecek bir teklif yok. Teklif henüz verilmemiş ya da daha önce yanıtlanmış olabilir.',
      );
    }

    const quote = await repository.findCurrentQuote(requestId, tx);

    if (quote === null) {
      throw businessRule('Bu talep için geçerli bir teklif bulunamadı.');
    }

    if (input.decision === 'accept' && isQuoteExpired(quote.validUntil)) {
      throw businessRule(
        'Teklifin geçerlilik süresi dolmuş. Yeni bir teklif için bizimle iletişime geçin.',
      );
    }

    const newStatus: RequestStatus = input.decision === 'accept' ? 'accepted' : 'rejected';
    const note = input.decision === 'accept' ? input.note : input.reason;

    await repository.updateStatus(requestId, newStatus, tx);
    await repository.insertEvent(
      requestId,
      newStatus,
      'customer',
      { note: note ?? null, actorUserId: actor.id },
      tx,
    );

    logger.info('Teklife yanıt verildi', { requestId, decision: input.decision });
  });
}

// ---------------------------------------------------------------------------
// Randevu
// ---------------------------------------------------------------------------

/**
 * Randevu planlar.
 *
 * Yalnızca teklifi kabul edilmiş talepler için; önceki randevu varsa iptal
 * edilir ve yenisi oluşturulur. Takvim geçmişi korunur.
 */
export async function scheduleAppointment(
  requestId: string,
  input: ScheduleAppointmentInput,
  actor: Actor,
): Promise<void> {
  await db.transaction(async (tx) => {
    const row = await repository.findByIdForUpdate(requestId, tx);

    if (row === null) {
      throw notFound('Talep');
    }

    const isReschedule = row.status === 'scheduled';

    if (!isReschedule && !canTransitionRequest(row.status, 'scheduled')) {
      throw invalidTransition(row.status, 'scheduled', 'Talep');
    }

    await repository.insertAppointment(
      {
        requestId,
        scheduledDate: input.date,
        startTime: input.timeSlot.startTime,
        endTime: input.timeSlot.endTime,
        note: input.note ?? null,
        createdByUserId: actor.id,
      },
      tx,
    );

    if (!isReschedule) {
      await repository.updateStatus(requestId, 'scheduled', tx);
    }

    await repository.insertEvent(
      requestId,
      'scheduled',
      'staff',
      { note: input.note ?? null, actorUserId: actor.id },
      tx,
    );

    logger.info('Randevu planlandı', {
      requestId,
      date: input.date,
      isReschedule,
    });
  });
}

/** Belirli bir gündeki randevular. Yönetim takvimi için. */
export async function getAppointmentsOnDate(date: string) {
  return repository.findAppointmentsOnDate(date);
}

// ---------------------------------------------------------------------------
// Durum değişikliği ve iptal
// ---------------------------------------------------------------------------

export async function changeRequestStatus(
  requestId: string,
  newStatus: RequestStatus,
  actor: Actor,
  note?: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const row = await repository.findByIdForUpdate(requestId, tx);

    if (row === null) {
      throw notFound('Talep');
    }

    if (!canTransitionRequest(row.status, newStatus)) {
      throw invalidTransition(row.status, newStatus, 'Talep');
    }

    /*
      Durum makinesi geçişin SIRASINI belirler, ön koşulunu değil.

      `createQuote` ve `scheduleAppointment` durumu kendileri ilerletir ve
      ilgili satırı da yazarlar. Ama durum bu uçtan da değiştirilebildiği için
      teklif satırı olmadan "kabul edildi", randevu satırı olmadan "randevu
      verildi" yazmak mümkündü: müşteri fiyatı olmayan bir kabul veya tarihi
      olmayan bir randevu görürdü.

      Kurallar (`requiresQuote`, `requiresAppointment`) baştan yazılmıştı ama
      hiçbir yerden çağrılmıyordu; denetimde bulundu.
    */
    if (requiresQuote(newStatus)) {
      const quote = await repository.findCurrentQuote(requestId, tx);

      if (quote === null) {
        throw businessRule('Bu talep için geçerli bir teklif yok. Önce teklif oluşturun.');
      }
    }

    if (requiresAppointment(newStatus)) {
      const appointment = await repository.findCurrentAppointment(requestId, tx);

      if (appointment === null) {
        throw businessRule('Bu talep için planlanmış bir randevu yok. Önce randevu oluşturun.');
      }
    }

    await repository.updateStatus(requestId, newStatus, tx);
    await repository.insertEvent(
      requestId,
      newStatus,
      'staff',
      { note: note ?? null, actorUserId: actor.id },
      tx,
    );

    logger.info('Talep durumu değişti', {
      requestId,
      from: row.status,
      to: newStatus,
      actorUserId: actor.id,
    });
  });
}

export async function cancelRequest(
  requestId: string,
  actor: Actor,
  reason?: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const row = await repository.findByIdForUpdate(requestId, tx);

    if (row === null) {
      throw notFound('Talep');
    }

    if (!isStaff(actor.role) && row.userId !== actor.id) {
      throw forbidden();
    }

    if (!canCancelRequest(row.status, actor.role)) {
      throw businessRule('Bu talep artık iptal edilemez.');
    }

    await repository.updateStatus(requestId, 'cancelled', tx);
    await repository.insertEvent(
      requestId,
      'cancelled',
      isStaff(actor.role) ? 'staff' : 'customer',
      { note: reason ?? null, actorUserId: actor.id },
      tx,
    );

    logger.info('Talep iptal edildi', { requestId, previousStatus: row.status });
  });
}

export async function setStaffNote(requestId: string, note: string): Promise<void> {
  const row = await repository.findById(requestId);

  if (row === null) {
    throw notFound('Talep');
  }

  await repository.updateStaffNote(requestId, note);
}

// ---------------------------------------------------------------------------
// Kötüye kullanım sınırı
// ---------------------------------------------------------------------------

/**
 * Müşterinin açık talep sınırını denetler.
 *
 * Yeni talep oluşturulmadan önce çağrılır; bir kişi yüzlerce talep açıp iş
 * kuyruğunu dolduramaz.
 */
export async function assertCanCreateRequest(userId: string): Promise<void> {
  const active = await repository.countActiveForUser(userId);

  if (active >= MAX_ACTIVE_REQUESTS_PER_CUSTOMER) {
    throw businessRule(
      `Aynı anda en fazla ${MAX_ACTIVE_REQUESTS_PER_CUSTOMER} açık talebiniz olabilir. ` +
        'Mevcut taleplerinizden biri sonuçlandığında yeni talep oluşturabilirsiniz.',
    );
  }
}

/** Talep türüne göre kaç açık talep olduğunu döndürür. Müşteri paneli sayaçları için. */
export async function getActiveRequestCount(userId: string): Promise<number> {
  return repository.countActiveForUser(userId);
}
