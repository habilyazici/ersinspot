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
import { fileTooLarge, validationFailed } from '../../../platform/errors/index.ts';
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
