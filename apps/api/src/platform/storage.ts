/**
 * Dosya depolama sürücüsü.
 *
 * Veritabanı istemcisi gibi altyapıdır: iş kuralı içermez, yalnızca baytları
 * saklar ve okur. Yükleme politikası (kim yükleyebilir, hangi tür, hangi boyut)
 * ve dosya kayıtlarının sahipliği `files` modülündedir.
 *
 * İki sürücü desteklenir:
 *   local — geliştirmede disk. Kurulum gerektirmez.
 *   s3    — üretimde S3 uyumlu depolama (Cloudflare R2, MinIO, AWS S3).
 *
 * Sürücü `STORAGE_DRIVER` ortam değişkeniyle seçilir; çağıran kod hangisinin
 * kullanıldığını bilmez.
 */

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from './config/env.ts';
import { logger } from './observability/logger.ts';

/**
 * Depolama anahtarı: dosyanın kalıcı kimliği.
 *
 * Biçim: `<amaç>/<yıl>/<ay>/<uuid>.<uzantı>`
 * Örnek: `product_image/2026/08/3f2a....webp`
 *
 * Tarihe göre bölmek, tek klasörde milyonlarca dosya birikmesini engeller ve
 * yedekleme/arşivleme işlemlerini kolaylaştırır.
 */
export type StorageKey = string;

export interface StoredFile {
  readonly key: StorageKey;
  readonly sizeBytes: number;
  readonly contentType: string;
}

/** MIME türünden dosya uzantısı. Kullanıcının verdiği dosya adına güvenilmez. */
const EXTENSION_BY_TYPE: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Yeni bir depolama anahtarı üretir.
 *
 * Dosya adı kullanıcıdan alınmaz; rastgele UUID kullanılır. Bu üç sorunu birden
 * çözer: yol geçişi saldırısı (`../../etc/passwd`), aynı adlı dosyaların
 * çakışması ve dosya adı üzerinden bilgi sızması.
 */
export function createStorageKey(purpose: string, contentType: string): StorageKey {
  const extension = EXTENSION_BY_TYPE[contentType] ?? 'bin';
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');

  return `${purpose}/${year}/${month}/${randomUUID()}.${extension}`;
}

/**
 * Depolama anahtarının geçerli olduğunu doğrular.
 *
 * Yol geçişi (`..`), mutlak yol ve boş segment reddedilir. Bu kontrol, anahtarın
 * veritabanından geldiği durumlarda bile uygulanır: savunma katmanları birbirine
 * güvenmez.
 */
export function isValidStorageKey(key: string): boolean {
  if (key === '' || key.length > 300) return false;
  if (key.startsWith('/') || key.includes('..') || key.includes('\\')) return false;
  if (key.includes('\0')) return false;

  return /^[a-z_]+\/\d{4}\/\d{2}\/[0-9a-f-]+\.[a-z0-9]+$/.test(key);
}

/** Dosyanın görüntüleme adresini üretir. */
export function resolveStorageUrl(key: StorageKey): string {
  return `${env.STORAGE_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
}

// ---------------------------------------------------------------------------
// Yerel disk sürücüsü
// ---------------------------------------------------------------------------

function localPathFor(key: StorageKey): string {
  if (!isValidStorageKey(key)) {
    throw new Error('Geçersiz depolama anahtarı.');
  }
  return path.join(path.resolve(env.STORAGE_LOCAL_DIR), key);
}

async function localWrite(key: StorageKey, data: Uint8Array): Promise<void> {
  const filePath = localPathFor(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

async function localRead(key: StorageKey): Promise<Uint8Array | null> {
  try {
    return await readFile(localPathFor(key));
  } catch {
    return null;
  }
}

async function localDelete(key: StorageKey): Promise<void> {
  try {
    await unlink(localPathFor(key));
  } catch {
    // Dosya zaten yoksa silme başarılı sayılır.
  }
}

// ---------------------------------------------------------------------------
// S3 sürücüsü
// ---------------------------------------------------------------------------

/**
 * S3 uyumlu depolama.
 *
 * Şimdilik yer tutucu: dağıtım hedefi belirlendiğinde `@aws-sdk/client-s3` veya
 * hafif bir imzalama uygulamasıyla doldurulacak. Arayüz sabit kaldığı için
 * çağıran kod değişmeyecek.
 */
function s3NotImplemented(): never {
  throw new Error(
    'S3 sürücüsü henüz uygulanmadı. Dağıtım hedefi belirlendiğinde eklenecek. ' +
      'Geliştirmede STORAGE_DRIVER=local kullanın.',
  );
}

// ---------------------------------------------------------------------------
// Genel arayüz
// ---------------------------------------------------------------------------

/** Dosyayı saklar ve anahtarını döndürür. */
export async function store(
  purpose: string,
  contentType: string,
  data: Uint8Array,
): Promise<StoredFile> {
  const key = createStorageKey(purpose, contentType);

  if (env.STORAGE_DRIVER === 'local') {
    await localWrite(key, data);
  } else {
    s3NotImplemented();
  }

  logger.debug('Dosya saklandı', { key, sizeBytes: data.byteLength, contentType });

  return { key, sizeBytes: data.byteLength, contentType };
}

/** Dosyayı okur. Bulunamazsa null. */
export async function retrieve(key: StorageKey): Promise<Uint8Array | null> {
  if (env.STORAGE_DRIVER === 'local') {
    return localRead(key);
  }
  return s3NotImplemented();
}

/** Dosyayı siler. Zaten yoksa hata vermez. */
export async function remove(key: StorageKey): Promise<void> {
  if (env.STORAGE_DRIVER === 'local') {
    await localDelete(key);
    return;
  }
  s3NotImplemented();
}
