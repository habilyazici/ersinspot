/**
 * Dosya yükleme.
 *
 * Eski kod tabanında yükleme ve silme uçları tamamen korumasızdı: herkes
 * sınırsız dosya yükleyebiliyor ve var olan ürün görsellerini silebiliyordu.
 * Ayrıca beş depolama alanının hepsi herkese açıktı — profil fotoğrafları ve
 * nakliye için çekilen ev içi fotoğrafları dahil.
 *
 * Yeni tasarımda:
 *
 *  1. Yükleme oturum gerektirir ve amaç bazında yetki denetlenir.
 *  2. Dosya türü ve boyutu hem bildirilen MIME'a hem GERÇEK İÇERİĞE bakılarak
 *     doğrulanır: uzantı ve başlık uydurulabilir, dosyanın ilk baytları değil.
 *  3. Her yükleme kayıt altına alınır; sahibi bilinir, silme yetkisi denetlenir.
 *  4. Bir kayda bağlanmayan yüklemeler yetim kalır ve bakım göreviyle silinir.
 */

import { and, eq, inArray, isNull, lt } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { UploadPurpose, UserRole } from '@ersinspot/shared';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  hasRoleAtLeast,
  isAllowedImageType,
  isPublicUploadPurpose,
} from '@ersinspot/shared';
import { assertCanAccess } from '../../../platform/authorization.ts';
import type { Actor } from '../../../platform/authorization.ts';
import { db } from '../../../platform/db/client.ts';
import type { Transaction } from '../../../platform/db/client.ts';
import {
  fileTooLarge,
  forbidden,
  notFound,
  unauthenticated,
  unsupportedFileType,
  validationFailed,
} from '../../../platform/errors/index.ts';
import { logger } from '../../../platform/observability/logger.ts';
import * as storage from '../../../platform/storage.ts';
import { uploadedFiles } from '../infrastructure/schema.ts';

/**
 * Hangi amaçla yükleme yapmak için hangi yetki gerekir.
 *
 * Ürün görseli ve blog kapağı yalnızca personel tarafından yüklenir; talep
 * fotoğrafı müşteri tarafından.
 */
const REQUIRED_ROLE: Readonly<Record<UploadPurpose, UserRole>> = {
  product_image: 'staff',
  blog_cover: 'staff',
  request_photo: 'customer',
};

/**
 * Dosya imzaları (magic bytes).
 *
 * Tarayıcının bildirdiği `Content-Type` uydurulabilir; bir çalıştırılabilir
 * dosya `image/jpeg` olarak gönderilebilir. Gerçek içeriğin ilk baytlarına
 * bakmak, bunu yakalayan tek güvenilir kontroldür.
 */
const SIGNATURES: readonly { type: string; bytes: readonly number[]; offset: number }[] = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  // WebP: "RIFF" ... "WEBP"
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
];

/** İçeriğin gerçek türünü ilk baytlarından belirler. Tanınmazsa null. */
function detectContentType(data: Uint8Array): string | null {
  for (const signature of SIGNATURES) {
    const matches = signature.bytes.every((byte, index) => data[signature.offset + index] === byte);

    if (!matches) continue;

    // WebP'de ayrıca 8. bayttan itibaren "WEBP" bulunmalı; yalnızca RIFF
    // başlığı başka biçimlerde de kullanılır.
    if (signature.type === 'image/webp') {
      const webp = [0x57, 0x45, 0x42, 0x50];
      const isWebp = webp.every((byte, index) => data[8 + index] === byte);
      if (!isWebp) continue;
    }

    return signature.type;
  }

  return null;
}

export interface UploadResult {
  readonly storageKey: string;
  readonly url: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

/** Yükleme yapan veya dosyaya erişmek isteyen kişi. */
export type Uploader = Actor;

/**
 * Dosyayı doğrular, saklar ve kaydını oluşturur.
 *
 * @param declaredType Tarayıcının bildirdiği tür. Tek başına GÜVENİLMEZ;
 *   gerçek içerikle karşılaştırılır.
 */
export async function uploadImage(
  uploader: Uploader,
  purpose: UploadPurpose,
  data: Uint8Array,
  declaredType: string,
  originalName?: string,
): Promise<UploadResult> {
  // 1) Amaç bazında yetki.
  if (!hasRoleAtLeast(uploader.role, REQUIRED_ROLE[purpose])) {
    throw forbidden('Bu tür dosya yüklemek için yetkiniz yok.');
  }

  // 2) Boyut.
  if (data.byteLength === 0) {
    throw unsupportedFileType([...ALLOWED_IMAGE_TYPES]);
  }

  if (data.byteLength > MAX_IMAGE_BYTES) {
    throw fileTooLarge(MAX_IMAGE_BYTES);
  }

  // 3) Bildirilen tür izinli mi?
  if (!isAllowedImageType(declaredType)) {
    throw unsupportedFileType([...ALLOWED_IMAGE_TYPES]);
  }

  /*
   * 4) GERÇEK içerik türü.
   *
   * Bildirilen tür ile içeriğin kendisi uyuşmuyorsa dosya reddedilir. Bu,
   * "resim" adı altında çalıştırılabilir veya betik dosyası yüklenmesini
   * engeller — depolama alanı herkese açık sunulduğu için önemlidir.
   */
  const actualType = detectContentType(data);

  if (actualType === null || actualType !== declaredType) {
    logger.warn('Dosya türü uyuşmazlığı', {
      userId: uploader.id,
      declaredType,
      actualType: actualType ?? 'tanınmadı',
    });
    throw unsupportedFileType([...ALLOWED_IMAGE_TYPES]);
  }

  // 5) Sakla ve kaydet.
  const stored = await storage.store(purpose, actualType, data);

  await db.insert(uploadedFiles).values({
    storageKey: stored.key,
    purpose,
    contentType: stored.contentType,
    sizeBytes: stored.sizeBytes,
    originalName: originalName ?? null,
    uploadedByUserId: uploader.id,
  });

  logger.info('Dosya yüklendi', {
    storageKey: stored.key,
    purpose,
    sizeBytes: stored.sizeBytes,
    userId: uploader.id,
  });

  return {
    storageKey: stored.key,
    url: storage.resolveStorageUrl(stored.key),
    contentType: stored.contentType,
    sizeBytes: stored.sizeBytes,
  };
}

/**
 * Depolama anahtarının amaç bölümünü okur.
 *
 * Anahtar biçimi `<amaç>/<yıl>/<ay>/<uuid>.<uzantı>`; ilk bölüm dosyanın
 * hangi amaçla yüklendiğini söyler ve yetkilendirme kararının girdisidir.
 */
export function purposeOf(storageKey: string): string {
  const separator = storageKey.indexOf('/');
  return separator === -1 ? '' : storageKey.slice(0, separator);
}

/**
 * Dosyanın görüntülenebilir olup olmadığını denetler.
 *
 * Ürün görselleri ve blog kapakları vitrinin parçasıdır; herkese açıktır.
 * Talep fotoğrafları ise KİŞİSEL VERİDİR — müşterinin evinin içini gösterir —
 * ve yalnızca yükleyene ve personele açılır.
 *
 * Önceden tüm depolama alanı oturumsuz sunuluyordu; anahtarın rastgele olması
 * "tahmin edilemez" demektir, "yetkisiz erişilemez" demek değildir. Bağlantı
 * bir kez paylaşıldığında ya da kayıt dışına sızdığında koruma kalmıyordu.
 *
 * @param viewer Oturum yoksa null.
 */
export async function assertCanViewFile(viewer: Actor | null, storageKey: string): Promise<void> {
  if (isPublicUploadPurpose(purposeOf(storageKey))) return;

  if (viewer === null) {
    throw unauthenticated();
  }

  if (hasRoleAtLeast(viewer.role, 'staff')) return;

  const rows = await db
    .select({ uploadedByUserId: uploadedFiles.uploadedByUserId })
    .from(uploadedFiles)
    .where(eq(uploadedFiles.storageKey, storageKey))
    .limit(1);

  // Kaydı olmayan dosya için varlık bilgisi verilmez.
  if (rows[0]?.uploadedByUserId !== viewer.id) {
    throw notFound('Dosya');
  }
}

/**
 * Dosyayı siler.
 *
 * Yalnızca yükleyen kişi veya personel silebilir. Bir kayda bağlanmış dosya
 * silinemez — önce kayıttan çıkarılması gerekir; aksi halde ürün sayfasında
 * kırık görsel kalırdı.
 */
export async function deleteFile(actor: Uploader, storageKey: string): Promise<void> {
  const rows = await db
    .select({
      uploadedByUserId: uploadedFiles.uploadedByUserId,
      attachedAt: uploadedFiles.attachedAt,
    })
    .from(uploadedFiles)
    .where(eq(uploadedFiles.storageKey, storageKey))
    .limit(1);

  const file = rows[0];

  if (file === undefined) {
    throw notFound('Dosya');
  }

  assertCanAccess(actor, file.uploadedByUserId);

  if (file.attachedAt !== null) {
    throw forbidden('Bir kayda bağlı dosya doğrudan silinemez.');
  }

  await storage.remove(storageKey);
  await db.delete(uploadedFiles).where(eq(uploadedFiles.storageKey, storageKey));

  logger.info('Dosya silindi', { storageKey, userId: actor.id });
}

export interface AttachOptions {
  /** Verilirse yalnızca bu amaçla yüklenmiş dosyalar kabul edilir. */
  readonly purpose?: UploadPurpose;
  /** Verilirse yalnızca bu kullanıcının yüklediği dosyalar kabul edilir. */
  readonly uploaderId?: string;
}

/**
 * Dosyaları bir kayda bağlar.
 *
 * Ürün oluşturulduğunda veya talep kaydedildiğinde çağrılır: yükleme artık
 * yetim değildir ve temizlik görevi tarafından silinmez.
 *
 * BU ÇAĞRI ZORUNLUDUR. Yapılmadığında `cleanupOrphanedFiles` görevi 24 saat
 * sonra dosyayı diskten siler ve kayıt, var olmayan bir anahtarı gösterir:
 * ürün görselleri, blog kapakları ve talep fotoğrafları ertesi gün topluca
 * kaybolur. Fonksiyon baştan yazılmıştı ama hiçbir yerden çağrılmıyordu.
 *
 * Verilen anahtarlardan biri yoksa — ya da `options` ile bildirilen amaç veya
 * yükleyiciyle eşleşmiyorsa — işlem doğrulama hatasıyla reddedilir. Böylece bir
 * kayıt, başkasının yüklemesine ya da hiç var olmayan bir anahtara bağlanamaz.
 *
 * Çağıran işlemin içinde çalışır: bağlama ile kaydın kendisi ya birlikte kalıcı
 * olur ya da hiçbiri.
 */
export async function attachFiles(
  storageKeys: readonly string[],
  tx: Transaction,
  options: AttachOptions = {},
): Promise<void> {
  if (storageKeys.length === 0) return;

  const unique = [...new Set(storageKeys)];

  const conditions: SQL[] = [inArray(uploadedFiles.storageKey, unique)];

  if (options.purpose !== undefined) {
    conditions.push(eq(uploadedFiles.purpose, options.purpose));
  }
  if (options.uploaderId !== undefined) {
    conditions.push(eq(uploadedFiles.uploadedByUserId, options.uploaderId));
  }

  const attached = await tx
    .update(uploadedFiles)
    .set({ attachedAt: new Date() })
    .where(and(...conditions))
    .returning({ storageKey: uploadedFiles.storageKey });

  if (attached.length !== unique.length) {
    throw validationFailed([
      {
        path: 'photos',
        message: 'Yüklenen dosyalardan biri bulunamadı. Fotoğrafları tekrar yükleyin.',
      },
    ]);
  }
}

/**
 * Yetim dosyaları temizler.
 *
 * Yükleme yapılıp form gönderilmezse dosya bir kayda bağlanmaz. Bu dosyalar
 * belirli bir süre sonra silinir; aksi halde depolama alanı, tamamlanmamış
 * form denemeleriyle dolar.
 *
 * Süre cömerttir: kullanıcı fotoğraf yükleyip formu doldurmayı sürdürüyor
 * olabilir.
 */
const ORPHAN_RETENTION_MS = 24 * 60 * 60 * 1000;

export async function cleanupOrphanedFiles(): Promise<number> {
  const cutoff = new Date(Date.now() - ORPHAN_RETENTION_MS);

  const orphans = await db
    .select({ storageKey: uploadedFiles.storageKey })
    .from(uploadedFiles)
    .where(and(isNull(uploadedFiles.attachedAt), lt(uploadedFiles.createdAt, cutoff)))
    .limit(500);

  if (orphans.length === 0) return 0;

  /*
    Depolama silme dosya başınadır (API tek anahtar alır); veritabanı silme ise
    tek ifadeye toplanır. Önceki hâlinde her yetim için ayrı bir DELETE
    gidiyordu: 500 kayıtlık bir bakım turu 500 gidiş-dönüş demekti.

    Depolamadan silme başarısız olsa bile kayıt silinir; kalan dosya bir sonraki
    bakımda tekrar denenmez ama yer kaplar. Bu, tutarsız kayıt bırakmaktan iyidir.
  */
  for (const orphan of orphans) {
    await storage.remove(orphan.storageKey).catch((error: unknown) => {
      logger.warn('Yetim dosya depolamadan silinemedi', {
        storageKey: orphan.storageKey,
        error: String(error),
      });
    });
  }

  await db.delete(uploadedFiles).where(
    inArray(
      uploadedFiles.storageKey,
      orphans.map((orphan) => orphan.storageKey),
    ),
  );

  return orphans.length;
}

/** Depolama anahtarından görüntüleme adresi üretir. */
export function resolveUrl(storageKey: string): string {
  return storage.resolveStorageUrl(storageKey);
}
