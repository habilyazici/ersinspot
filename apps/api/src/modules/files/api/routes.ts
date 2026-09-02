/**
 * Dosya yükleme uçları.
 *
 * Eski kod tabanında `/upload-image`, `/delete-image` ve `/images` uçlarının
 * üçü de korumasızdı: herkes sınırsız dosya yükleyebiliyor, var olan ürün
 * görsellerini silebiliyor ve tüm dosyaları listeleyebiliyordu.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { MAX_IMAGE_BYTES, isPublicUploadPurpose, uploadRequestSchema } from '@ersinspot/shared';
import type { AuthVariables } from '../../../platform/http/auth.ts';
import { attachSession, currentUser, requireAuth } from '../../../platform/http/auth.ts';
import type { ValidatedVariables } from '../../../platform/http/validate.ts';
import { params, validateParams } from '../../../platform/http/validate.ts';
import { rateLimit } from '../../../platform/http/security.ts';
import { fileTooLarge, notFound, validationFailed } from '../../../platform/errors/index.ts';
import { isValidStorageKey, retrieve } from '../../../platform/storage.ts';
import * as uploadService from '../application/upload-service.ts';

type Variables = AuthVariables & ValidatedVariables;

/** Depolama anahtarı yol parametresinde eğik çizgi içerir; yakalama joker'i kullanılır. */
const storageKeyParamSchema = z.object({
  key: z.string().min(1).max(300),
});

/**
 * Çok parçalı gövdenin üst sınırı.
 *
 * Dosya sınırına, sınır dizeleri ve alan başlıkları için pay eklenir.
 */
const MAX_UPLOAD_BODY_BYTES = MAX_IMAGE_BYTES + 64 * 1024;

export const filesRoutes = new Hono<{ Variables: Variables }>();

/**
 * Görsel yükler.
 *
 * Çok parçalı form verisi bekler. Dosya türü hem bildirilen MIME'a hem gerçek
 * içeriğe bakılarak doğrulanır; ikisi uyuşmazsa reddedilir.
 */
filesRoutes.post(
  '/uploads',
  requireAuth,
  rateLimit(60, 60 * 60 * 1000, 'dosya-yukle'),
  async (c) => {
    /*
      Gövde boyutu, İÇERİK OKUNMADAN ÖNCE denetlenir.

      `formData()` tüm gövdeyi belleğe alır; boyut kontrolü ondan sonra
      yapıldığında gigabaytlık bir yükleme sunucunun belleğini tüketebiliyordu.
      Bildirilen uzunluk uydurulabilir ama küçük gösterildiğinde de aşağıdaki
      gerçek boyut kontrolü devrededir; buradaki denetim ucuz olan ilk süzgeçtir.

      Sınır, dosya sınırının bir katı fazlasıdır: çok parçalı gövde dosyanın
      yanında sınır dizeleri ve alan başlıkları da taşır.
    */
    const declaredLength = Number(c.req.header('Content-Length') ?? '0');

    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BODY_BYTES) {
      throw fileTooLarge(MAX_IMAGE_BYTES);
    }

    const form = await c.req.formData().catch(() => null);

    if (form === null) {
      throw validationFailed([{ path: '', message: 'Dosya gönderilmedi.' }]);
    }

    const purposeRaw = form.get('purpose');
    const parsedPurpose = uploadRequestSchema.safeParse({ purpose: purposeRaw });

    if (!parsedPurpose.success) {
      throw validationFailed([{ path: 'purpose', message: 'Geçerli bir yükleme amacı belirtin.' }]);
    }

    const file = form.get('file');

    if (!(file instanceof File)) {
      throw validationFailed([{ path: 'file', message: 'Dosya gönderilmedi.' }]);
    }

    // Boyut, içeriği belleğe almadan önce kabaca denetlenir.
    if (file.size > MAX_IMAGE_BYTES) {
      throw fileTooLarge(MAX_IMAGE_BYTES);
    }

    const data = new Uint8Array(await file.arrayBuffer());

    const result = await uploadService.uploadImage(
      currentUser(c),
      parsedPurpose.data.purpose,
      data,
      file.type,
      file.name,
    );

    return c.json({ file: result }, 201);
  },
);

/**
 * Yüklenen dosyayı siler.
 *
 * Yalnızca yükleyen kişi veya personel silebilir; bir kayda bağlanmış dosya
 * doğrudan silinemez.
 */
filesRoutes.delete(
  '/uploads/:key{.+}',
  requireAuth,
  validateParams(storageKeyParamSchema),
  async (c) => {
    const { key } = params(c, storageKeyParamSchema);
    await uploadService.deleteFile(currentUser(c), key);
    return c.json({ success: true });
  },
);

// ---------------------------------------------------------------------------
// Yerel dosya sunumu
// ---------------------------------------------------------------------------

/**
 * Yerel sürücüde saklanan dosyaları sunar.
 *
 * `STORAGE_DRIVER=local` seçildiğinde dosyalar diskte durur ve onları HTTP'de
 * gösteren bir şey olmalıdır. Denetimde bu eksikti: `STORAGE_PUBLIC_URL`
 * `/files` adresini işaret ediyor, `resolveStorageUrl` o adresi üretiyor ama
 * hiçbir rota onu karşılamıyordu — yerel sürücüyle yüklenen HER görsel 404
 * veriyordu.
 *
 * Üretimde `STORAGE_DRIVER=s3` kullanılır ve dosyalar CDN'den sunulur; bu rota
 * o durumda hiç bağlanmaz (bkz. `app.ts`).
 *
 * YETKİ AMACA GÖRE değişir. Ürün görselleri ve blog kapakları vitrinin
 * parçasıdır; oturumsuz sunulur ve uzun süre önbelleklenir. Talep fotoğrafları
 * kişisel veridir — müşterinin evinin içini gösterir — ve yalnızca yükleyene
 * ve personele açılır.
 *
 * Önceki hâlinde tüm depolama alanı oturumsuz sunuluyordu. Anahtarın rastgele
 * olması "tahmin edilemez" demektir, "yetkisiz erişilemez" demek değildir:
 * bağlantı bir kez paylaşıldığında koruma kalmıyordu.
 */
export const localFileRoutes = new Hono<{ Variables: Variables }>();

/** Uzantıdan içerik türü. Kullanıcının bildirdiği türe güvenilmez. */
const CONTENT_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

localFileRoutes.get('/:key{.+}', attachSession, async (c) => {
  const key = c.req.param('key');

  // Yol geçişi ve biçimsiz anahtar burada da denetlenir: savunma katmanları
  // birbirine güvenmez.
  if (!isValidStorageKey(key)) {
    throw notFound('Dosya');
  }

  const isPublic = isPublicUploadPurpose(uploadService.purposeOf(key));

  await uploadService.assertCanViewFile(c.var.user ?? null, key);

  const data = await retrieve(key);

  if (data === null) {
    throw notFound('Dosya');
  }

  const extension = key.slice(key.lastIndexOf('.') + 1);
  const contentType = CONTENT_TYPE_BY_EXTENSION[extension] ?? 'application/octet-stream';

  /*
    Baytlar yeni bir görünüme KOPYALANIR.

    `retrieve` Node'un `readFile` çıktısını döndürür; küçük dosyalarda bu, çok
    daha büyük ve PAYLAŞILAN bir havuz ArrayBuffer'ının içindeki bir görünümdür.
    Alttaki tamponu doğrudan geçmek (`data.buffer`) ilgisiz bellek içeriğini
    yanıta koyardı. Kopya, yalnızca bu dosyanın baytlarını içerir.
  */
  return c.body(new Uint8Array(data), 200, {
    'Content-Type': contentType,
    /*
      Dosya adı içeriğe göre bir kez üretilir ve değişmez; herkese açık
      dosyalarda uzun önbellek güvenlidir. Genel güvenlik middleware'i tüm
      yanıtlara `no-store` yazar, bu yüzden orada bu yol için istisna tanımlıdır.

      Kişisel dosyalar paylaşılan önbelleklere (vekil, CDN) düşmemelidir:
      `private` işaretlenir ve saklama süresi kısa tutulur.
    */
    'Cache-Control': isPublic
      ? 'public, max-age=31536000, immutable'
      : 'private, max-age=300, must-revalidate',
    // Tarayıcı dosyayı indirmek yerine göstersin; tür yukarıda sabitlendi.
    'Content-Disposition': 'inline',
  });
});
