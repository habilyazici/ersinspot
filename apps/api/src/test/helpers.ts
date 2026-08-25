/**
 * Test yardımcıları.
 *
 * Her test dosyası kendi verisini oluşturur ve sonunda temizler. Testler arası
 * sızıntı olmaması için `resetDatabase` beforeEach içinde çağrılır.
 */

import { db, sql } from '../platform/db/client.ts';
import { createApp } from '../app.ts';
import { hashPassword } from '../modules/identity/domain/password.ts';
import { resetMemoryRateLimits } from '../modules/identity/application/rate-limit.ts';
import { users } from '../modules/identity/infrastructure/schema.ts';
import type { UserRole } from '@ersinspot/shared';

/**
 * Testler arası yalıtım.
 *
 * Tabloları boşaltır, dizileri sıfırlar ve bellek içi hız sınırı sayaçlarını
 * temizler. Sayaç sıfırlanmazsa bir testteki başarısız giriş denemeleri sonraki
 * testlerin girişini engeller — bu, gerçek bir test kirlenmesi kaynağıdır.
 */
export async function resetDatabase(): Promise<void> {
  resetMemoryRateLimits();

  await sql`
    TRUNCATE TABLE
      login_attempts, sessions, password_reset_tokens, email_verification_tokens,
      customer_addresses,
      cart_items, favorites, payments, order_events, order_items,
      order_addresses, orders,
      request_events, request_appointments, request_quotes, request_photos,
      request_addresses,
      moving_request_items, moving_request_details, technical_service_details,
      sell_request_details, service_requests,
      product_specs, product_images, products, brands, categories,
      contact_messages, blog_post_tags, blog_posts, tags, faqs,
      uploaded_files, site_settings,
      users
    RESTART IDENTITY CASCADE
  `;

  await sql`ALTER SEQUENCE order_reference_seq RESTART WITH 1`;
  await sql`ALTER SEQUENCE moving_reference_seq RESTART WITH 1`;
  await sql`ALTER SEQUENCE technical_service_reference_seq RESTART WITH 1`;
  await sql`ALTER SEQUENCE sell_request_reference_seq RESTART WITH 1`;
}

export const app = createApp();

/** Test kullanıcısı oluşturur ve kimliğini döndürür. */
export async function createTestUser(options?: {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  role?: UserRole;
  emailVerified?: boolean;
}): Promise<{ id: string; email: string; password: string }> {
  const email = options?.email ?? 'test@ersinspot.com';
  const password = options?.password ?? 'guclu-bir-sifre-123';

  const [created] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(password),
      fullName: options?.fullName ?? 'Test Kullanıcı',
      phone: options?.phone ?? '+905071940550',
      role: options?.role ?? 'customer',
      emailVerifiedAt: options?.emailVerified === true ? new Date() : null,
    })
    .returning({ id: users.id });

  if (created === undefined) throw new Error('Test kullanıcısı oluşturulamadı.');

  return { id: created.id, email, password };
}

/** Uygulamaya istek gönderir. Origin başlığı CSRF kontrolünü geçmek için eklenir. */
export async function request(
  path: string,
  init?: RequestInit & { cookie?: string },
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('Origin', 'http://localhost:3001');
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (init?.cookie !== undefined) {
    headers.set('Cookie', init.cookie);
  }

  return app.request(`http://localhost:3000${path}`, { ...init, headers });
}

/** Yanıttan oturum çerezini çıkarır. */
export function extractCookie(response: Response): string | null {
  const setCookie = response.headers.get('Set-Cookie');
  if (setCookie === null) return null;
  const value = setCookie.split(';')[0];
  return value ?? null;
}

/** Giriş yapar ve oturum çerezini döndürür. */
export async function loginAs(email: string, password: string): Promise<string> {
  const response = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const cookie = extractCookie(response);
  if (cookie === null) {
    throw new Error(`Giriş başarısız (${response.status}): ${await response.text()}`);
  }

  return cookie;
}
