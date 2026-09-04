/**
 * İletişim mesajları.
 *
 * Form oturum gerektirmez: henüz üye olmamış bir ziyaretçi de yazabilmelidir.
 * Bu yüzden IP bazlı hız sınırı ve bot tuzağı ile korunur.
 */

import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type {
  ContactMessage,
  ContactMessageListQuery,
  CreateContactMessageInput,
  Paginated,
  ReplyToContactMessageInput,
} from '@ersinspot/shared';
import { paginate } from '@ersinspot/shared';
import { db } from '../../../platform/db/client.ts';
import { notFound } from '../../../platform/errors/index.ts';
import { logger } from '../../../platform/observability/logger.ts';
import { sendEmail } from '../../../platform/mailer.ts';
import { isLikelyBot } from '../domain/content-rules.ts';
import { contactMessages } from '../infrastructure/schema.ts';

/**
 * Mesajı kaydeder.
 *
 * Bot tuzağı doldurulmuşsa kayıt oluşturulmaz ama başarılı yanıt döner:
 * otomatik aracın engellendiğini anlayıp yeni yöntem denemesi istenmez.
 */
export async function submitMessage(
  input: CreateContactMessageInput,
  context: { userId: string | null; ipAddress: string | null },
): Promise<void> {
  if (isLikelyBot(input.website)) {
    logger.info('İletişim formunda bot tuzağı tetiklendi', { ip: context.ipAddress });
    return;
  }

  await db.insert(contactMessages).values({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
    subject: input.subject,
    message: input.message,
    userId: context.userId,
    submittedFromIp: context.ipAddress,
  });

  logger.info('İletişim mesajı alındı', { subject: input.subject });
}

function toView(row: typeof contactMessages.$inferSelect): ContactMessage {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    isRead: row.isRead,
    readAt: row.readAt?.toISOString() ?? null,
    replyNote: row.replyNote,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listMessages(
  query: ContactMessageListQuery,
): Promise<Paginated<ContactMessage>> {
  const conditions: SQL[] = [];

  if (query.subject !== undefined) {
    conditions.push(eq(contactMessages.subject, query.subject));
  }
  if (query.isRead !== undefined) {
    conditions.push(eq(contactMessages.isRead, query.isRead));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select()
    .from(contactMessages)
    .where(where)
    // Okunmamışlar önce, sonra en yeniden eskiye. Kimlik kararlı son
    // anahtardır: aynı anda gelen iki mesaj sayfalar arasında kaymaz.
    .orderBy(contactMessages.isRead, desc(contactMessages.createdAt), asc(contactMessages.id))
    .limit(query.pageSize)
    .offset(offset);

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(contactMessages)
    .where(where);

  return paginate(rows.map(toView), countRow?.value ?? 0, query);
}

export async function markAsRead(messageId: string, staffUserId: string): Promise<void> {
  const updated = await db
    .update(contactMessages)
    // Veritabanı kısıtı okunma bayrağı ile zamanın tutarlı olmasını zorunlu kılar.
    .set({ isRead: true, readAt: new Date(), readByUserId: staffUserId })
    .where(eq(contactMessages.id, messageId))
    .returning({ id: contactMessages.id });

  if (updated.length === 0) {
    throw notFound('Mesaj');
  }
}

/** Mesaja yanıt verir ve müşteriye e-posta gönderir. */
export async function reply(
  messageId: string,
  input: ReplyToContactMessageInput,
  staffUserId: string,
): Promise<void> {
  const rows = await db
    .select({ email: contactMessages.email, fullName: contactMessages.fullName })
    .from(contactMessages)
    .where(eq(contactMessages.id, messageId))
    .limit(1);

  const message = rows[0];

  if (message === undefined) {
    throw notFound('Mesaj');
  }

  await db
    .update(contactMessages)
    .set({
      replyNote: input.replyNote,
      repliedAt: new Date(),
      repliedByUserId: staffUserId,
      isRead: true,
      readAt: new Date(),
      readByUserId: staffUserId,
    })
    .where(eq(contactMessages.id, messageId));

  await sendEmail({
    to: message.email,
    subject: 'Mesajınıza yanıt — Ersin Spot',
    text: `Merhaba ${message.fullName},\n\n${input.replyNote}\n\nErsin Spot`,
  });

  logger.info('İletişim mesajına yanıt verildi', { messageId });
}

/** Okunmamış mesaj sayısı. Yönetim panelindeki rozet için. */
export async function countUnread(): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(contactMessages)
    .where(eq(contactMessages.isRead, false));

  return row?.value ?? 0;
}
