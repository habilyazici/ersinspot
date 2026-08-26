/**
 * Dosya yükleme uçları.
 *
 * Eski kod tabanında `/upload-image`, `/delete-image` ve `/images` uçlarının
 * üçü de korumasızdı: herkes sınırsız dosya yükleyebiliyor, var olan ürün
 * görsellerini silebiliyor ve tüm dosyaları listeleyebiliyordu.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { MAX_IMAGE_BYTES, uploadRequestSchema } from '@ersinspot/shared';
import type { AuthVariables } from '../../../platform/http/auth.ts';
import { currentUser, requireAuth } from '../../../platform/http/auth.ts';
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
 * Oturum GEREKTİRMEZ: ürün görselleri vitrinde herkese açıktır ve depolama
 * anahtarı rastgele UUID içerdiği için tahmin edilemez. Talep fotoğrafları da
 * aynı yerde durur; bunları korumak gerekirse anahtar bazlı imzalı adres
 * gerekir — o gün geldiğinde burası değişir.
 */
export const localFileRoutes = new Hono();

/** Uzantıdan içerik türü. Kullanıcının bildirdiği türe güvenilmez. */
const CONTENT_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

localFileRoutes.get('/:key{.+}', async (c) => {
  const key = c.req.param('key');

  // Yol geçişi ve biçimsiz anahtar burada da denetlenir: savunma katmanları
  // birbirine güvenmez.
  if (!isValidStorageKey(key)) {
    throw notFound('Dosya');
  }

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
      Dosya adı içeriğe göre bir kez üretilir ve değişmez; uzun önbellek
      güvenlidir. Genel güvenlik middleware'i tüm yanıtlara `no-store` yazar,
      bu yüzden orada bu yol için istisna tanımlıdır.
    */
    'Cache-Control': 'public, max-age=31536000, immutable',
    // Tarayıcı dosyayı indirmek yerine göstersin; tür yukarıda sabitlendi.
    'Content-Disposition': 'inline',
  });
});
