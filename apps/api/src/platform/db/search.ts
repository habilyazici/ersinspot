/**
 * Metin arama desenleri.
 *
 * Liste ekranlarındaki arama kutuları `ILIKE` ile kısmi eşleşme yapar. Desen
 * parametreli gönderilir, yani SQL enjeksiyonu söz konusu değildir — ama
 * `LIKE` dilinin kendi joker karakterleri (`%` ve `_`) kullanıcının yazdığı
 * metnin İÇİNDE de anlamlıdır:
 *
 *   "%"    → her kaydı eşler; arama kutusu süzgeç olmaktan çıkar
 *   "50%"  → "50" ile başlayan her şeyi eşler, "50%" yazan kaydı değil
 *   "a_b"  → "axb" ile de eşleşir
 *
 * Kullanıcı bu karakterleri joker olarak değil, düz metin olarak yazar. Bu
 * yüzden kaçırılırlar ve `ESCAPE` yan tümcesiyle hangi karakterin kaçış
 * işareti olduğu açıkça bildirilir.
 *
 * Beş liste (vitrin ürünleri, yönetimdeki ürün, sipariş, talep ve blog
 * listeleri) aynı deseni elle kuruyordu; kural tek yerde tanımlıdır.
 */

import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Kaçış işareti.
 *
 * Ters eğik çizgi yerine `!` seçildi: `standard_conforming_strings` kapalı bir
 * oturumda ters eğik çizgi bir kez de dize düzeyinde yorumlanır ve desen
 * beklenenden farklı çalışır.
 */
const ESCAPE_CHARACTER = '!';

/** `LIKE` joker karakterlerini düz metne çevirir. */
function escapePattern(value: string): string {
  return value.replace(/[!%_]/g, (character) => `${ESCAPE_CHARACTER}${character}`);
}

/**
 * "Bu sütun verilen metni İÇERİYOR mu?" koşulu üretir.
 *
 * Büyük/küçük harf duyarsızdır (`ILIKE`). Arama metni joker karakter içerse
 * bile düz metin olarak aranır.
 */
export function contains(column: PgColumn, search: string): SQL {
  return sql`${column} ILIKE ${`%${escapePattern(search)}%`} ESCAPE ${ESCAPE_CHARACTER}`;
}
