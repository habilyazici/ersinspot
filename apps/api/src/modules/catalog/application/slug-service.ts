/**
 * Benzersiz bağlantı adı üretimi.
 *
 * Başlıktan üretilen bağlantı adı çakışabilir ("Buzdolabı" adında iki ürün
 * olabilir). Bu modül, veritabanında kullanımda olmayan bir ad bulana kadar
 * sonuna sıra numarası ekler.
 *
 * Yarış durumu: iki istek aynı anda aynı adı boş bulup ikisi de yazmaya
 * çalışabilir. Benzersizlik indeksi bunu yakalar ve ikinci yazma hata verir;
 * merkezi hata işleyici bunu `already_exists` olarak çevirir. Burada döngü
 * yapmak, çakışma olasılığını pratikte sıfıra indirir ama tek güvence değildir —
 * asıl güvence veritabanı kısıtıdır.
 */

import { businessRule } from '../../../platform/errors/index.ts';
import { slugify, withSlugSuffix } from '../domain/product-rules.ts';
import * as repository from '../infrastructure/product-repository.ts';

/**
 * Denenecek en fazla varyasyon sayısı.
 *
 * Aynı başlıkla 50'den fazla ürün olması gerçekçi değildir; bu sınıra ulaşmak
 * neredeyse kesinlikle bir hata belirtisidir ve sessizce garip adlar üretmek
 * yerine hata vermek doğrudur.
 */
const MAX_ATTEMPTS = 50;

/**
 * Başlıktan benzersiz bir bağlantı adı üretir.
 *
 * @param excludeProductId Güncelleme sırasında ürünün kendi adını çakışma
 *   saymamak için verilir.
 */
export async function generateUniqueSlug(
  title: string,
  excludeProductId?: string,
): Promise<string> {
  const base = slugify(title);

  if (base === '') {
    throw businessRule(
      'Ürün başlığından bağlantı adı üretilemedi. Başlıkta en az bir harf veya rakam bulunmalıdır.',
      [{ path: 'title', message: 'Başlık en az bir harf veya rakam içermelidir.' }],
    );
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const candidate = withSlugSuffix(base, attempt);
    const taken = await repository.slugExists(candidate, excludeProductId);

    if (!taken) return candidate;
  }

  throw businessRule(
    'Bu başlık için benzersiz bir bağlantı adı üretilemedi. Başlığı biraz değiştirin.',
    [{ path: 'title', message: 'Bu başlık çok fazla kez kullanılmış.' }],
  );
}
