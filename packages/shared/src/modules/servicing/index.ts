export * from './request-contract.ts';
export * from './moving-contract.ts';
export * from './technical-service-contract.ts';
export * from './sell-request-contract.ts';

// ---------------------------------------------------------------------------
// Birleşik talep görünümü
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { movingRequestSchema } from './moving-contract.ts';
import { sellRequestSchema } from './sell-request-contract.ts';
import { technicalServiceRequestSchema } from './technical-service-contract.ts';

/**
 * Türü ne olursa olsun bir hizmet talebi.
 *
 * Müşterinin TEK bir talep listesi vardır; detayı okumak için talebin
 * içeride hangi tabloya yazıldığını bilmesi gerekmemelidir. Ayrım
 * `kind` alanıyla yapılır ve TypeScript hangi alanların mevcut olduğunu
 * o alandan çıkarır.
 */
export const serviceRequestSchema = z.discriminatedUnion('kind', [
  movingRequestSchema,
  technicalServiceRequestSchema,
  sellRequestSchema,
]);

export type ServiceRequest = z.infer<typeof serviceRequestSchema>;
