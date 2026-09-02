/**
 * Talep görünümünün ortak kısmını kurar.
 *
 * Üç hizmet türü de aynı taban alanları paylaşır: takip numarası, durum,
 * iletişim bilgisi, fotoğraflar, teklif, randevu ve zaman çizelgesi. Bu dosya
 * onları bir kez toplar; türe özgü servisler yalnızca kendi alanlarını ekler.
 */

import type { ServiceRequestBase, UserRole } from '@ersinspot/shared';
import { isStaff } from '../../../platform/authorization.ts';
import { resolveStorageUrl } from '../../../platform/storage.ts';
import * as repository from '../infrastructure/request-repository.ts';
import type { RequestRow } from '../infrastructure/request-repository.ts';

/**
 * @param viewerRole Personel notu yalnızca personel ve yöneticiye döner;
 *   müşteri yanıtlarında alan hiç bulunmaz.
 */
export async function buildCommonView(
  row: RequestRow,
  viewerRole: UserRole,
): Promise<ServiceRequestBase> {
  const [photos, quote, appointment, events] = await Promise.all([
    repository.findPhotos(row.id),
    repository.findCurrentQuote(row.id),
    repository.findCurrentAppointment(row.id),
    repository.findEvents(row.id),
  ]);

  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    kind: row.kind,
    status: row.status,

    contactName: row.contactName,
    contactPhone: row.contactPhone,

    photos: photos.map((photo) => ({
      id: photo.id,
      url: resolveStorageUrl(photo.storageKey),
      caption: photo.caption,
    })),

    quote:
      quote === null
        ? null
        : {
            amount: quote.amountKurus,
            validUntil: quote.validUntil,
            note: quote.note,
            createdAt: quote.createdAt.toISOString(),
          },

    appointment:
      appointment === null
        ? null
        : {
            date: appointment.scheduledDate,
            timeSlot: {
              startTime: appointment.startTime.slice(0, 5),
              endTime: appointment.endTime.slice(0, 5),
            },
            note: appointment.note,
          },

    timeline: events.map((event) => ({
      status: event.status,
      note: event.note,
      actor: event.actor,
      occurredAt: event.createdAt.toISOString(),
    })),

    customerNote: row.customerNote,
    ...(isStaff(viewerRole) ? { staffNote: row.staffNote } : {}),

    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
