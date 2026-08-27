/**
 * Kullanıcı bilgisi dizini.
 *
 * Diğer modüller kullanıcı adı ve iletişim bilgisine ihtiyaç duyar (siparişte
 * müşteri adını göstermek gibi) ama `users` tablosuna erişemezler. Bu modül,
 * dışarıya açılan okuma yüzeyidir.
 *
 * Dönen görünüm bilinçli olarak dardır: şifre hash'i, oturum bilgisi, kilit
 * durumu gibi alanlar hiçbir koşulda modül dışına çıkmaz.
 */

import { inArray, eq } from 'drizzle-orm';
import type { UserRole } from '@ersinspot/shared';
import { db } from '../../../platform/db/client.ts';
import { users } from '../infrastructure/schema.ts';

export interface UserSummary {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly role: UserRole;
}

/** Tek kullanıcının özetini döndürür. Kullanıcı yoksa veya silinmişse null. */
export async function getUserSummary(userId: string): Promise<UserSummary | null> {
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Birden çok kullanıcının özetini tek sorguda döndürür.
 *
 * Liste ekranlarında N+1 sorgu oluşmasını engeller: önce kimlikler toplanır,
 * sonra tek çağrıyla tümü çekilir.
 */
export async function getUserSummaries(
  userIds: readonly string[],
): Promise<Map<string, UserSummary>> {
  if (userIds.length === 0) return new Map();

  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
    })
    .from(users)
    .where(inArray(users.id, [...userIds]));

  return new Map(rows.map((row) => [row.id, row]));
}
