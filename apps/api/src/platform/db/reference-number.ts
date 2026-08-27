/**
 * Takip numarası üretimi.
 *
 * Numaralar veritabanı dizisinden alınır. Eski kodda `Date.now()` kullanılıyordu;
 * aynı milisaniyede gelen iki istek aynı numarayı alabilirdi ve benzersizlik
 * indeksi çakışmayı ancak yazma anında yakalayabiliyordu.
 *
 * Biçim: ÖN-YIL-SIRA  →  "SIP-2026-000123"
 */

import { sql } from 'drizzle-orm';
import { db } from './client.ts';
import type { Transaction } from './client.ts';

/** Her belge türünün ön eki ve dizisi. */
const SEQUENCES = {
  order: { prefix: 'SIP', sequence: 'order_reference_seq' },
  moving: { prefix: 'NAK', sequence: 'moving_reference_seq' },
  technical_service: { prefix: 'TSV', sequence: 'technical_service_reference_seq' },
  sell_request: { prefix: 'SAT', sequence: 'sell_request_reference_seq' },
} as const;

type DocumentKind = keyof typeof SEQUENCES;

/**
 * Yeni takip numarası üretir.
 *
 * Dizi çağrısı işlem geri alınsa bile ilerler; bu bilinçli bir tercihtir. Numara
 * boşlukları kabul edilebilir, ancak aynı numaranın iki kayda verilmesi kabul edilemez.
 *
 * @param executor İşlem içinde çağrılıyorsa o işlemin bağlamı verilir; böylece
 *   numara ile kayıt aynı bağlantı üzerinden yazılır.
 */
export async function generateReferenceNumber(
  kind: DocumentKind,
  executor: Transaction | typeof db = db,
): Promise<string> {
  const config = SEQUENCES[kind];

  const rows = await executor.execute<{ reference: string }>(
    sql`SELECT next_reference_number(${config.prefix}, ${config.sequence}) AS reference`,
  );

  const reference = rows[0]?.reference;

  if (typeof reference !== 'string') {
    throw new Error(`Takip numarası üretilemedi: ${kind}`);
  }

  return reference;
}
