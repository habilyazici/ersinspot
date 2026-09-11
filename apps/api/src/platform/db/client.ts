/**
 * Veritabanı bağlantısı.
 *
 * `postgres` sürücüsü, hazırlanmış ifadeleri (prepared statements) varsayılan olarak
 * kullanır ve parametreleri daima ayrı taşır — SQL enjeksiyonu, dize birleştirmeyle
 * sorgu kurulmadığı sürece mümkün değildir. Drizzle de sorguları parametreli üretir.
 *
 * Eski kod tabanında PostgREST filtreleri dize birleştirmeyle kuruluyordu
 * (`.or(\`email.eq.${email}\`)`), bu da filtre enjeksiyonuna açıktı.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env, isProduction, isTest } from '../config/env.ts';
import * as schema from './schema.ts';

const queryClient = postgres(env.DATABASE_URL, {
  /*
   * Havuz boyutu.
   *
   * Testlerde de yeterince büyük tutulur: eşzamanlılık testleri aynı anda birden
   * çok işlem açıp satır kilidi davranışını sınar. Havuz bu işlemlerin sayısından
   * küçük olursa testler kilitlenip zaman aşımına uğrar — bu, uygulamanın değil
   * test kurulumunun hatasıdır.
   */
  max: isTest ? 10 : 20,

  // Boşta kalan bağlantı bu süre sonunda kapanır (saniye).
  idle_timeout: 30,

  // Bağlantı kurma zaman aşımı (saniye).
  connect_timeout: 10,

  /*
    KİLİT BEKLEME ÜST SINIRI.

    Sipariş akışı tekil ürünleri `SELECT ... FOR UPDATE` ile kilitler; iki
    müşterinin aynı ürünü almasını bu engeller ve kısa bekleme tasarımın
    parçasıdır. Sınırsız olan, kilidi TUTANIN takılması durumu: yarı açık bir
    TCP bağlantısı ya da düşmüş bir süreç, kilidi sunucu onu toplayana kadar
    bırakmaz. O sırada aynı ürünü isteyen her istek süresiz bekler ve havuzdan
    bir bağlantı tutar; yirmi istek havuzu tüketip API'yi durdurur.

    `statement_timeout` KONULMADI: sorguların yürütme süresini de keserdi ve
    bakım görevlerinin toplu silmeleri (giriş denemesi temizliği ilk çalışmada
    otuz günlük birikimi siler) meşru biçimde uzun sürebilir. `lock_timeout`
    yalnızca BEKLEMEYİ sınırlar, ilerleyen bir sorguyu kesmez.

    Aşıldığında PostgreSQL 55P03 döndürür; hata işleyici bunu "işlem çakıştı,
    tekrar deneyin" mesajına çevirir.
  */
  connection: {
    // Milisaniye; sürücünün tipi sayı bekler.
    lock_timeout: 5_000,
  },

  // Üretimde sorgu metinlerini loglamayız; hassas veri içerebilir.
  onnotice: isProduction ? () => undefined : undefined,

  /*
    `bigint` (int8) sütunları JS sayısı olarak okunur.

    Sürücünün varsayılanı metindir; para alanları kuruş cinsinden `bigint`
    saklandığı için her okumada ayrıştırma gerekirdi. Kuruş değerleri güvenli
    tam sayı aralığının çok altında kalır (üst sınır ~90 trilyon ₺).
  */
  types: {
    bigint: postgres.BigInt,
  },
});

export const db = drizzle(queryClient, {
  schema,
  casing: 'snake_case',
  logger: false,
});

export type Database = typeof db;

/** Ham sorgu istemcisi. Migration ve bakım işleri dışında kullanılmamalıdır. */
export const sql = queryClient;

/** Bağlantı havuzunu kapatır. Testlerde ve düzgün kapanışta çağrılır. */
export async function closeDatabase(): Promise<void> {
  await queryClient.end({ timeout: 5 });
}

/**
 * Bir işlem (transaction) içinde çalıştırır.
 *
 * Sipariş oluşturma gibi çok tablolu işlemler daima işlem içinde yapılır: ürün
 * rezerve edilir, sipariş yazılır, kalemler eklenir, olay kaydı düşülür. Herhangi
 * biri başarısız olursa hiçbiri kalıcı olmaz.
 */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
