/**
 * Sıkça sorulan sorular.
 *
 * Kategori serbest metin değil kapalı kümedir: metin olsaydı "Siparişler" ve
 * "Sipariş" gibi varyasyonlar çoğalır, gruplama bozulurdu.
 */

import { asc, eq } from 'drizzle-orm';
import type { CreateFaqInput, Faq } from '@ersinspot/shared';
import { db } from '../../../platform/db/client.ts';
import { notFound } from '../../../platform/errors/index.ts';
import { faqs } from '../infrastructure/schema.ts';

export async function listPublishedFaqs(): Promise<Faq[]> {
  const rows = await db
    .select()
    .from(faqs)
    .where(eq(faqs.isPublished, true))
    .orderBy(asc(faqs.category), asc(faqs.displayOrder));

  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    displayOrder: row.displayOrder,
  }));
}

export async function listAllFaqs(): Promise<Faq[]> {
  const rows = await db.select().from(faqs).orderBy(asc(faqs.category), asc(faqs.displayOrder));

  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    displayOrder: row.displayOrder,
  }));
}

export async function createFaq(input: CreateFaqInput): Promise<{ faqId: string }> {
  const [created] = await db
    .insert(faqs)
    .values({
      question: input.question,
      answer: input.answer,
      category: input.category,
      displayOrder: input.displayOrder,
    })
    .returning({ id: faqs.id });

  if (created === undefined) {
    throw new Error('SSS kaydı oluşturulamadı.');
  }

  return { faqId: created.id };
}

export async function updateFaq(faqId: string, input: Partial<CreateFaqInput>): Promise<void> {
  const updated = await db
    .update(faqs)
    .set({
      ...(input.question === undefined ? {} : { question: input.question }),
      ...(input.answer === undefined ? {} : { answer: input.answer }),
      ...(input.category === undefined ? {} : { category: input.category }),
      ...(input.displayOrder === undefined ? {} : { displayOrder: input.displayOrder }),
    })
    .where(eq(faqs.id, faqId))
    .returning({ id: faqs.id });

  if (updated.length === 0) {
    throw notFound('Soru');
  }
}

export async function deleteFaq(faqId: string): Promise<void> {
  const deleted = await db.delete(faqs).where(eq(faqs.id, faqId)).returning({ id: faqs.id });

  if (deleted.length === 0) {
    throw notFound('Soru');
  }
}
