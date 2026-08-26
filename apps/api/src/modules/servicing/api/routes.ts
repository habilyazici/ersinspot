/**
 * Hizmet talebi HTTP uçları.
 *
 * Yetkilendirme rota tanımında bildirilir.
 *
 * Eski kod tabanında bu modülün uçları en kötü durumdaydı:
 *   - `technical_service.tsx` içindeki dört `/admin/*` ucunda hiç yetki
 *     kontrolü yoktu; kimliksiz herkes tüm servis taleplerini müşteri
 *     bilgileriyle listeleyebiliyor, fiyat girebiliyor ve kayıt silebiliyordu.
 *   - `moving.tsx` içindeki altı `/admin/*` ucu yalnızca "giriş yapmış mı"
 *     bakıyordu; sıradan bir müşteri hesabıyla admin işlemi yapılabiliyordu.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import {
  addStaffNoteSchema,
  adminRequestListQuerySchema,
  cancelRequestSchema,
  convertToProductSchema,
  createMovingRequestSchema,
  createQuoteSchema,
  createSellRequestSchema,
  createTechnicalServiceRequestSchema,
  dateOnlySchema,
  recordDiagnosisSchema,
  requestListQuerySchema,
  respondToQuoteSchema,
  scheduleAppointmentSchema,
  updateRequestStatusSchema,
  uuidSchema,
} from '@ersinspot/shared';
import type { AuthVariables } from '../../../platform/http/auth.ts';
import {
  currentUser,
  requireAuth,
  requireStaff,
  requireVerifiedEmail,
} from '../../../platform/http/auth.ts';
import type { ValidatedVariables } from '../../../platform/http/validate.ts';
import {
  body,
  params,
  query,
  validateBody,
  validateParams,
  validateQuery,
} from '../../../platform/http/validate.ts';
import { rateLimit } from '../../../platform/http/security.ts';
import * as movingService from '../application/moving-service.ts';
import * as requestService from '../application/request-service.ts';
import * as sellRequestService from '../application/sell-request-service.ts';
import * as technicalService from '../application/technical-service.ts';

type Variables = AuthVariables & ValidatedVariables;

const idParamSchema = z.object({ id: uuidSchema });
const dateQuerySchema = z.object({ date: dateOnlySchema });

export const servicingRoutes = new Hono<{ Variables: Variables }>();

/**
 * Talep oluşturma için hız sınırı.
 *
 * İki farklı sınır iki farklı şeyi korur:
 *
 *   Hız sınırı (burada)   — ani yığın istekleri engeller, otomatik araçlara karşı
 *   Açık talep sınırı     — bir kişinin iş kuyruğunu doldurmasını engeller
 *
 * Hız sınırı, iş kuralı sınırından belirgin biçimde YÜKSEK tutulur; aksi halde
 * iş kuralına hiç ulaşılamaz ve kullanıcı "çok fazla istek" hatası alır —
 * oysa asıl neden açık talep sayısıdır ve mesajın bunu söylemesi gerekir.
 */
const createLimit = rateLimit(30, 60 * 60 * 1000, 'talep-olustur');

// ---------------------------------------------------------------------------
// Nakliye
// ---------------------------------------------------------------------------

/**
 * Nakliye fiyat tahmini.
 *
 * Kullanıcı formu doldururken tutarı görebilsin diye; kayıt oluşturmaz.
 * Oturum gerektirmez — henüz üye olmamış bir ziyaretçi de fiyat sorabilmelidir.
 */
const estimateInputSchema = z.object({
  houseSize: createMovingRequestSchema.innerType().shape.houseSize,
  fromFloor: z.coerce.number().int().min(-3).max(50),
  fromHasElevator: z.coerce.boolean(),
  toFloor: z.coerce.number().int().min(-3).max(50),
  toHasElevator: z.coerce.boolean(),
  itemCount: z.coerce.number().int().min(0).max(500),
  needsPacking: z.coerce.boolean(),
  needsAssembly: z.coerce.boolean(),
});

servicingRoutes.get(
  '/moving/estimate',
  rateLimit(60, 15 * 60 * 1000, 'nakliye-tahmin'),
  validateQuery(estimateInputSchema),
  (c) => {
    const input = query(c, estimateInputSchema);
    return c.json({ estimate: movingService.estimateMovingPrice(input) });
  },
);

servicingRoutes.post(
  '/moving/requests',
  requireAuth,
  requireVerifiedEmail,
  createLimit,
  validateBody(createMovingRequestSchema),
  async (c) => {
    const input = body(c, createMovingRequestSchema);
    const result = await movingService.createMovingRequest(currentUser(c).id, input);
    return c.json({ request: result }, 201);
  },
);

servicingRoutes.get(
  '/moving/requests/:id',
  requireAuth,
  validateParams(idParamSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    return c.json({ request: await movingService.getMovingRequest(id, currentUser(c)) });
  },
);

// ---------------------------------------------------------------------------
// Teknik servis
// ---------------------------------------------------------------------------

servicingRoutes.post(
  '/technical-service/requests',
  requireAuth,
  requireVerifiedEmail,
  createLimit,
  validateBody(createTechnicalServiceRequestSchema),
  async (c) => {
    const input = body(c, createTechnicalServiceRequestSchema);
    const result = await technicalService.createTechnicalServiceRequest(currentUser(c).id, input);
    return c.json({ request: result }, 201);
  },
);

servicingRoutes.get(
  '/technical-service/requests/:id',
  requireAuth,
  validateParams(idParamSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    return c.json({
      request: await technicalService.getTechnicalServiceRequest(id, currentUser(c)),
    });
  },
);

// ---------------------------------------------------------------------------
// Ürün satış talebi
// ---------------------------------------------------------------------------

servicingRoutes.post(
  '/sell-requests',
  requireAuth,
  requireVerifiedEmail,
  createLimit,
  validateBody(createSellRequestSchema),
  async (c) => {
    const input = body(c, createSellRequestSchema);
    const result = await sellRequestService.createSellRequest(currentUser(c).id, input);
    return c.json({ request: result }, 201);
  },
);

servicingRoutes.get('/sell-requests/:id', requireAuth, validateParams(idParamSchema), async (c) => {
  const { id } = params(c, idParamSchema);
  return c.json({ request: await sellRequestService.getSellRequest(id, currentUser(c)) });
});

// ---------------------------------------------------------------------------
// Ortak müşteri işlemleri
// ---------------------------------------------------------------------------

/** Müşterinin tüm talepleri — üç tür tek listede. */
servicingRoutes.get('/requests', requireAuth, validateQuery(requestListQuerySchema), async (c) => {
  const filters = query(c, requestListQuerySchema);
  return c.json(await requestService.listMyRequests(currentUser(c).id, filters));
});

servicingRoutes.post(
  '/requests/:id/respond',
  requireAuth,
  validateParams(idParamSchema),
  validateBody(respondToQuoteSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    const input = body(c, respondToQuoteSchema);

    await requestService.respondToQuote(id, input, currentUser(c));
    return c.json({ success: true });
  },
);

servicingRoutes.post(
  '/requests/:id/cancel',
  requireAuth,
  validateParams(idParamSchema),
  validateBody(cancelRequestSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    const input = body(c, cancelRequestSchema);

    await requestService.cancelRequest(id, currentUser(c), input.reason);
    return c.json({ success: true });
  },
);

// ---------------------------------------------------------------------------
// Yönetim
// ---------------------------------------------------------------------------

servicingRoutes.get(
  '/admin/requests',
  requireStaff,
  validateQuery(adminRequestListQuerySchema),
  async (c) => {
    const filters = query(c, adminRequestListQuerySchema);
    return c.json(await requestService.listRequestsForAdmin(filters));
  },
);

servicingRoutes.post(
  '/admin/requests/:id/quote',
  requireStaff,
  validateParams(idParamSchema),
  validateBody(createQuoteSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    const input = body(c, createQuoteSchema);

    await requestService.createQuote(id, input, currentUser(c));
    return c.json({ success: true }, 201);
  },
);

servicingRoutes.post(
  '/admin/requests/:id/appointment',
  requireStaff,
  validateParams(idParamSchema),
  validateBody(scheduleAppointmentSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    const input = body(c, scheduleAppointmentSchema);

    await requestService.scheduleAppointment(id, input, currentUser(c));
    return c.json({ success: true }, 201);
  },
);

servicingRoutes.patch(
  '/admin/requests/:id/status',
  requireStaff,
  validateParams(idParamSchema),
  validateBody(updateRequestStatusSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    const input = body(c, updateRequestStatusSchema);

    await requestService.changeRequestStatus(id, input.status, currentUser(c), input.note);
    return c.json({ success: true });
  },
);

servicingRoutes.put(
  '/admin/requests/:id/staff-note',
  requireStaff,
  validateParams(idParamSchema),
  validateBody(addStaffNoteSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    const input = body(c, addStaffNoteSchema);

    await requestService.setStaffNote(id, input.note);
    return c.json({ success: true });
  },
);

/** Belirli bir gündeki randevular. Yönetim takvimi için. */
servicingRoutes.get(
  '/admin/appointments',
  requireStaff,
  validateQuery(dateQuerySchema),
  async (c) => {
    const { date } = query(c, dateQuerySchema);
    return c.json({ appointments: await requestService.getAppointmentsOnDate(date) });
  },
);

/** Teknisyenin keşif sonrası tespiti. */
servicingRoutes.put(
  '/admin/technical-service/:id/diagnosis',
  requireStaff,
  validateParams(idParamSchema),
  validateBody(recordDiagnosisSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    const input = body(c, recordDiagnosisSchema);

    await technicalService.recordDiagnosis(id, input);
    return c.json({ success: true });
  },
);

/** Kabul edilen satış talebini katalog ürününe dönüştürür. */
servicingRoutes.post(
  '/admin/sell-requests/:id/convert',
  requireStaff,
  validateParams(idParamSchema),
  validateBody(convertToProductSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    const input = body(c, convertToProductSchema);

    const result = await sellRequestService.convertToProduct(id, input, currentUser(c));
    return c.json({ product: result }, 201);
  },
);
