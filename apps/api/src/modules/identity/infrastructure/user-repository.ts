/**
 * Kimlik veri erişimi.
 *
 * Bu sorgular `api/routes.ts` içinde duruyordu: HTTP katmanı `db` istemcisini
 * ve tablo şemasını doğrudan içe aktarıyor, işlem açıyor, satır güncelliyordu.
 * Altı modülden yalnızca bu modül öyleydi — diğer beşinin rota dosyasında tek
 * bir veritabanı çağrısı yok. Mimari belgesindeki bağımlılık yönü
 * `api → application → infrastructure` diyor; kimlik modülü ortadaki adımı
 * atlıyordu.
 *
 * Katman yalnızca sorgu kurar. Kural burada değil, `application/` içindedir:
 * hangi durumda hangi sorgunun çağrılacağına orası karar verir.
 */

import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../../platform/db/client.ts';
import type { Transaction } from '../../../platform/db/client.ts';
import { emailVerificationTokens, passwordResetTokens, users } from './schema.ts';

type Executor = Transaction | typeof db;

/** Kullanıcının istemciye gönderilebilir alanları. Şifre özeti burada yoktur. */
const PUBLIC_COLUMNS = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  phone: users.phone,
  role: users.role,
  emailVerifiedAt: users.emailVerifiedAt,
  createdAt: users.createdAt,
} as const;

export interface PublicUserRow {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'customer' | 'staff' | 'admin';
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

/** Giriş denetimi için gereken alanlar: şifre özeti ve kilit durumu dahil. */
export interface CredentialRow extends PublicUserRow {
  passwordHash: string;
  lockedUntil: Date | null;
}

/** Tek kullanımlık jeton kaydı. Hangi tablodan geldiğine bakılmaz. */
export interface TokenRow {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Kullanıcı
// ---------------------------------------------------------------------------

/**
 * Adrese göre SİLİNMEMİŞ kullanıcıyı getirir.
 *
 * Adres `emailSchema` tarafından kırpılıp küçük harfe çevrilmiş olarak gelir;
 * tekillik indeksi de `lower(email)` üzerinde tanımlıdır.
 */
export async function findCredentialsByEmail(email: string): Promise<CredentialRow | undefined> {
  const rows = await db
    .select({ ...PUBLIC_COLUMNS, passwordHash: users.passwordHash, lockedUntil: users.lockedUntil })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  return rows[0];
}

/** Adres kayıtlı mı? Yalnızca varlık bilgisi okunur. */
export async function existsByEmail(email: string): Promise<boolean> {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  return rows.length > 0;
}

/** Şifre sıfırlama için: silinmemiş kullanıcının kimliği ve adı. */
export async function findActiveByEmail(
  email: string,
): Promise<{ id: string; fullName: string } | undefined> {
  const rows = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  return rows[0];
}

export async function findPublicById(userId: string): Promise<PublicUserRow | undefined> {
  const rows = await db.select(PUBLIC_COLUMNS).from(users).where(eq(users.id, userId)).limit(1);

  return rows[0];
}

export async function findPasswordHash(userId: string): Promise<string | undefined> {
  const rows = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0]?.passwordHash;
}

export async function insertUser(row: {
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
}): Promise<{ id: string; email: string; fullName: string } | undefined> {
  const created = await db
    .insert(users)
    .values({ ...row, role: 'customer' })
    .returning({ id: users.id, email: users.email, fullName: users.fullName });

  return created[0];
}

export async function updatePasswordHash(
  userId: string,
  passwordHash: string,
  executor: Executor = db,
): Promise<void> {
  await executor.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

/**
 * Şifreyi sıfırlar ve kilidi kaldırır.
 *
 * Başarısız deneme sayacı da sıfırlanır: sıfırlama bağlantısını kullanan kişi
 * adresin sahibidir, önceki başarısız denemeler onu cezalandırmamalıdır.
 */
export async function resetPasswordAndUnlock(
  userId: string,
  passwordHash: string,
  executor: Executor = db,
): Promise<void> {
  await executor
    .update(users)
    .set({ passwordHash, failedLoginCount: 0, lockedUntil: null })
    .where(eq(users.id, userId));
}

export async function updateProfile(
  userId: string,
  fields: { fullName: string; phone: string },
): Promise<PublicUserRow | undefined> {
  const updated = await db
    .update(users)
    .set(fields)
    .where(eq(users.id, userId))
    .returning(PUBLIC_COLUMNS);

  return updated[0];
}

export async function markEmailVerified(userId: string, executor: Executor = db): Promise<void> {
  await executor.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// Tek kullanımlık jetonlar
// ---------------------------------------------------------------------------

export async function insertPasswordResetToken(row: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  requestedFromIp: string | null;
}): Promise<void> {
  await db.insert(passwordResetTokens).values(row);
}

export async function findPasswordResetToken(tokenHash: string): Promise<TokenRow | undefined> {
  const rows = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  return rows[0];
}

/** Kullanıcının bekleyen sıfırlama jetonlarını geçersiz kılar. */
export async function supersedePasswordResetTokens(userId: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
}

export async function consumePasswordResetToken(
  tokenId: string,
  executor: Executor = db,
): Promise<void> {
  await executor
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}

export async function insertEmailVerificationToken(row: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await db.insert(emailVerificationTokens).values(row);
}

export async function findEmailVerificationToken(tokenHash: string): Promise<TokenRow | undefined> {
  const rows = await db
    .select({
      id: emailVerificationTokens.id,
      userId: emailVerificationTokens.userId,
      expiresAt: emailVerificationTokens.expiresAt,
      usedAt: emailVerificationTokens.usedAt,
    })
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, tokenHash))
    .limit(1);

  return rows[0];
}

export async function supersedeEmailVerificationTokens(userId: string): Promise<void> {
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt)));
}

export async function consumeEmailVerificationToken(
  tokenId: string,
  executor: Executor = db,
): Promise<void> {
  await executor
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, tokenId));
}

/** İşlem açar. Şifre sıfırlama ve e-posta doğrulama iki tabloyu birlikte yazar. */
export async function transaction<T>(run: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(run);
}
