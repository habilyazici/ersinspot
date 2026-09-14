/**
 * Metin arama desenleri ve Türkçe sıralama.
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
import { toAsciiLower } from '@ersinspot/shared';

/**
 * Kaçış işareti.
 *
 * Ters eğik çizgi yerine `!` seçildi: `standard_conforming_strings` kapalı bir
 * oturumda ters eğik çizgi bir kez de dize düzeyinde yorumlanır ve desen
 * beklenenden farklı çalışır.
 */
const ESCAPE_CHARACTER = '!';

/*
  `translate` için harf çiftleri.

  Sıra ve uzunluk birebir eşleşmelidir; `toAsciiLower` içindeki eşleme
  tablosunun aynısıdır. Küçük harfler de listede: `translate` küçültmeden önce
  çalışır ve "ı" ile "ş" zaten küçükken de dönüştürülmelidir.
*/
const TURKISH_LETTERS = 'çÇğĞıIİiöÖşŞüÜ';
const ASCII_LETTERS = 'ccggiiiioossuu';

/*
  Harf tabloları sorguya PARAMETRE olarak değil, gömülü olarak girer.

  Drizzle `${sabit}` yazımını `$1` bağlamasına çevirir ve PostgreSQL çalışma
  anındaki bir parametreyi indeksin ifadesiyle eşleştiremez: sorgu, aynı ifade
  üzerine kurulmuş trigram indeksini kullanamaz hâle gelir. İkisi de bu
  dosyada tanımlı sabitlerdir, kullanıcı girdisi değildir; tek tırnak
  içermedikleri de aşağıda doğrulanır.
*/
if (/'/.test(TURKISH_LETTERS) || /'/.test(ASCII_LETTERS)) {
  throw new Error('Harf tablosu tek tırnak içeremez.');
}

const TRANSLATE_ARGS = sql.raw(`'${TURKISH_LETTERS}', '${ASCII_LETTERS}'`);

/** `LIKE` joker karakterlerini düz metne çevirir. */
function escapePattern(value: string): string {
  return value.replace(/[!%_]/g, (character) => `${ESCAPE_CHARACTER}${character}`);
}

/**
 * Metni ASCII küçük harfe indiren SQL ifadesi.
 *
 * `toAsciiLower`'ın veritabanı karşılığıdır ve onunla AYNI SONUCU vermek
 * zorundadır; `search.test.ts` ikisini aynı örnekler üzerinde karşılaştırır.
 *
 * `translate` küçültmeden ÖNCE uygulanır: PostgreSQL'in `lower` işlevi bu
 * kurulumda ASCII kuralını izliyor ve "I" harfini "i" yapıyor, oysa Türkçede
 * "ı" olmalı. Eşleme zaten her iki büyüklüğü de karşılıyor.
 */
function normalized(column: PgColumn): SQL {
  return sql`lower(translate(${column}, ${TRANSLATE_ARGS}))`;
}

/**
 * "Bu sütun verilen metni İÇERİYOR mu?" koşulu üretir.
 *
 * Karşılaştırma HEM büyük/küçük harf HEM Türkçe harf duyarsızdır: iki taraf da
 * ASCII küçük harfe indirgenir. Sebebi ölçülebilir bir davranıştı —
 *
 *   "çamaşır"  → 1 sonuç
 *   "camasir"  → 0 sonuç
 *
 * — oysa Türkçe klavyede ı, ş, ğ yazmak tuş değiştirmeyi gerektirir ve
 * müşterilerin önemli bir kısmı telefonda bu harfleri hiç yazmaz. Arama
 * kutusu, kataloğun tamamı Türkçe ürün adlarından oluşan bir sitede en sık
 * yazılan biçimi bulamıyordu.
 *
 * Aynı indirgeme "BUZDOLABI" gibi tümü büyük harfle yazılmış başlıkları da
 * çözer; `lower` tek başına onları "buzdolabi" yapıp "buzdolabı" aramasıyla
 * eşleştiremiyordu.
 *
 * Arama metni joker karakter içerse bile düz metin olarak aranır. `ILIKE`
 * yerine `LIKE` kullanılır: iki taraf da zaten küçük harftedir ve `ILIKE`'ın
 * ek harf katlaması bu noktada yalnızca maliyet olurdu.
 */
export function contains(column: PgColumn, search: string): SQL {
  const pattern = `%${escapePattern(toAsciiLower(search))}%`;
  return sql`${normalized(column)} LIKE ${pattern} ESCAPE ${ESCAPE_CHARACTER}`;
}

/**
 * Türkçe alfabetik sıralama.
 *
 * Veritabanının kendi harmanlaması bu işi YAPMIYOR. `docker-compose.yml`
 * `LANG=tr_TR.utf8` veriyor ve PostgreSQL bunu `datcollate` olarak kaydediyor,
 * ama imaj alpine (musl libc) ve musl yerel ayar tablolarını uygulamaz:
 * karşılaştırma bayt sırasına düşer. Sonuç, Türkçe harfle başlayan her adın
 * listenin sonuna atılmasıdır —
 *
 *   bayt sırası : iğne < zebra < çilek < ördek < ıhlamur < şeker
 *   Türkçe      : çilek < ıhlamur < iğne < ördek < şeker < zebra
 *
 * — çünkü ASCII harfler tek bayt, Türkçe harfler iki bayttır. "Çağrı" ve
 * "Öztiryakiler" marka listesinde Z'den sonra görünür.
 *
 * PostgreSQL 16 ICU ile derlenir ve `tr-TR-x-icu` harmanlaması hazırdır; onu
 * sorguda İSTEMEK, veritabanının nasıl kurulduğundan bağımsız olarak doğru
 * sırayı verir. Alternatifi veritabanını farklı bir yerel ayarla yeniden
 * kurmaktı; o da mevcut kurulumları migration gerektirir ve üretimdeki imajın
 * hangi libc'yi taşıdığına bağlı kalırdı.
 */
export function turkishAsc(column: PgColumn): SQL {
  return sql`${column} COLLATE "tr-TR-x-icu" ASC`;
}
