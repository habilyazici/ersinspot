/**
 * Hizmet taleplerinin ortak tabanı.
 *
 * Nakliye, teknik servis ve satış talebi aynı yaşam döngüsünü izler: talep gelir,
 * incelenir, teklif verilir, müşteri yanıtlar, randevu planlanır, iş tamamlanır.
 * Ortak alanlar burada bir kez tanımlanır; her modül yalnızca kendine özgü
 * alanları ekler.
 *
 * Eski kod tabanında bu üç akış birbirinden bağımsız yazılmıştı; sonuç olarak
 * durum listeleri birbirini tutmuyor, arayüzleri farklı davranıyordu.
 */

import { z } from 'zod';
import {
  appointmentDateSchema,
  fullNameSchema,
  optionalText,
  paginationSchema,
  phoneSchema,
  referenceNumberSchema,
  requiredText,
  timeSlotSchema,
  uuidSchema,
} from '../../kernel/validation.ts';
import { REQUEST_STATUSES, SERVICE_KINDS } from '../../kernel/status.ts';

/** Talebi oluşturan kişiyle iletişim bilgileri. Oturum sahibinden farklı olabilir. */
export const requestContactSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
});

export type RequestContact = z.infer<typeof requestContactSchema>;

/** Yüklenen fotoğrafın depolama anahtarı ve açıklaması. */
export const requestPhotoInputSchema = z.object({
  storageKey: z.string().min(1),
  caption: optionalText(200),
});

export const requestPhotoSchema = z.object({
  id: uuidSchema,
  url: z.string().url(),
  caption: z.string().nullable(),
});

export type RequestPhoto = z.infer<typeof requestPhotoSchema>;

/**
 * Talebin geçmişindeki bir olay. Hem durum değişikliklerini hem de taraflar
 * arasındaki notları taşır; müşteri kendi talebinin akışını buradan izler.
 */
export const requestEventSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  note: z.string().nullable(),
  /** Olayı kimin oluşturduğu. Müşteriye "Ersin Spot" veya "Siz" olarak gösterilir. */
  actor: z.enum(['customer', 'staff', 'system']),
  occurredAt: z.string().datetime(),
});

export type RequestEvent = z.infer<typeof requestEventSchema>;

/** Yönetim tarafından girilen fiyat teklifi. */
export const requestQuoteSchema = z.object({
  /** Kuruş cinsinden teklif tutarı. */
  amount: z.number().int(),
  /** Teklifin geçerlilik tarihi. */
  validUntil: z.string(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type RequestQuote = z.infer<typeof requestQuoteSchema>;

/** Planlanmış randevu. */
export const requestAppointmentSchema = z.object({
  date: z.string(),
  timeSlot: z.string(),
  note: z.string().nullable(),
});

export type RequestAppointment = z.infer<typeof requestAppointmentSchema>;

/**
 * Her hizmet talebinde ortak olan alanlar. Modüle özgü şemalar bunu `extend` eder.
 */
export const serviceRequestBaseSchema = z.object({
  id: uuidSchema,
  referenceNumber: referenceNumberSchema,
  kind: z.enum(SERVICE_KINDS),
  status: z.enum(REQUEST_STATUSES),

  contactName: z.string(),
  contactPhone: z.string(),

  photos: z.array(requestPhotoSchema),
  quote: requestQuoteSchema.nullable(),
  appointment: requestAppointmentSchema.nullable(),
  timeline: z.array(requestEventSchema),

  customerNote: z.string().nullable(),
  /** Yalnızca personelin gördüğü not; müşteri yanıtlarında bulunmaz. */
  staffNote: z.string().nullable().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ServiceRequestBase = z.infer<typeof serviceRequestBaseSchema>;

/** Listelerde kullanılan hafif özet. */
export const serviceRequestSummarySchema = z.object({
  id: uuidSchema,
  referenceNumber: referenceNumberSchema,
  kind: z.enum(SERVICE_KINDS),
  status: z.enum(REQUEST_STATUSES),
  /** Listede gösterilecek kısa başlık, örn. "3+1 Nakliye" veya "Buzdolabı Onarımı". */
  title: z.string(),
  quotedAmount: z.number().int().nullable(),
  appointmentDate: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type ServiceRequestSummary = z.infer<typeof serviceRequestSummarySchema>;

// ---------------------------------------------------------------------------
// Ortak işlemler
// ---------------------------------------------------------------------------

/** Müşterinin teklife yanıtı. Reddederken gerekçe istenir ama zorunlu değildir. */
export const respondToQuoteSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('accept'),
    note: optionalText(500),
  }),
  z.object({
    decision: z.literal('reject'),
    reason: optionalText(500),
  }),
]);

export type RespondToQuoteInput = z.infer<typeof respondToQuoteSchema>;

export const cancelRequestSchema = z.object({
  reason: optionalText(500),
});

export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;

// ---------------------------------------------------------------------------
// Yönetim işlemleri
// ---------------------------------------------------------------------------

export const createQuoteSchema = z.object({
  amount: z
    .number()
    .int({ message: 'Tutar kuruş cinsinden tam sayı olmalıdır.' })
    .positive({ message: 'Teklif tutarı sıfırdan büyük olmalıdır.' }),
  validUntil: appointmentDateSchema,
  note: optionalText(1000),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const scheduleAppointmentSchema = z.object({
  date: appointmentDateSchema,
  timeSlot: timeSlotSchema,
  note: optionalText(500),
});

export type ScheduleAppointmentInput = z.infer<typeof scheduleAppointmentSchema>;

export const updateRequestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  note: optionalText(1000),
});

export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;

export const addStaffNoteSchema = z.object({
  note: requiredText('Not', 1, 2000),
});

export type AddStaffNoteInput = z.infer<typeof addStaffNoteSchema>;

// ---------------------------------------------------------------------------
// Listeleme
// ---------------------------------------------------------------------------

export const requestListQuerySchema = paginationSchema.extend({
  status: z.enum(REQUEST_STATUSES).optional(),
  kind: z.enum(SERVICE_KINDS).optional(),
});

export type RequestListQuery = z.infer<typeof requestListQuerySchema>;

export const adminRequestListQuerySchema = requestListQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type AdminRequestListQuery = z.infer<typeof adminRequestListQuerySchema>;
