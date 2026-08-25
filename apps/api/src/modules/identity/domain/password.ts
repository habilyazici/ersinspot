/**
 * Şifre hash'leme.
 *
 * Algoritma: argon2id. Password Hashing Competition'ın kazananıdır ve OWASP'ın
 * birinci tercihidir. argon2i'nin yan kanal direncini argon2d'nin GPU/ASIC
 * direnciyle birleştirir.
 *
 * Parametreler OWASP Password Storage Cheat Sheet'in asgari önerisinin üzerinde
 * seçilmiştir (19 MiB bellek, 2 tur). Bellek maliyeti, saldırganın paralel
 * deneme kapasitesini sınırlayan asıl etkendir; bu yüzden tur sayısından önce
 * bellek artırılır.
 *
 * Hash dizesi kendi parametrelerini taşır ($argon2id$v=19$m=...,t=...,p=...$salt$hash).
 * Bu, parametreleri ileride güçlendirdiğimizde eski şifrelerin doğrulanmaya devam
 * etmesini sağlar; `needsRehash` ile kademeli geçiş yapılır.
 */

import { hash, verify } from '@node-rs/argon2';
import { timingSafeEqual } from 'node:crypto';

/**
 * argon2id algoritma kimliği.
 *
 * Kütüphanenin `Algorithm` numaralandırması `const enum` olarak tanımlanmış;
 * `verbatimModuleSyntax` açıkken içe aktarılamaz. Değer sabit olduğu için
 * doğrudan yazılıyor: Argon2d=0, Argon2i=1, Argon2id=2.
 */
const ARGON2ID = 2;

/**
 * Hash parametreleri.
 *
 * memoryCost: KiB cinsinden. 19456 KiB = 19 MiB.
 * timeCost:   tur sayısı.
 * parallelism: paralel şerit sayısı.
 */
const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Kullanıcı yoksa bile doğrulama maliyetini ödemek için kullanılan sahte hash.
 *
 * Var olmayan bir hesap için doğrulama atlanırsa, yanıt süresi "bu e-posta kayıtlı
 * değil" bilgisini sızdırır (zamanlama üzerinden kullanıcı numaralandırma).
 * Bu sabit hash'e karşı doğrulama yaparak her iki durumda da aynı süre harcanır.
 *
 * Değer, "gecersiz" dizesinin yukarıdaki parametrelerle hash'lenmiş halidir;
 * hiçbir gerçek şifreyle eşleşmez.
 */
let dummyHashPromise: Promise<string> | null = null;

async function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hash('parola-yok-bu-hash-hicbir-seyle-eslesmez', ARGON2_OPTIONS);
  return dummyHashPromise;
}

/** Düz metin şifreden argon2id hash üretir. */
export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, ARGON2_OPTIONS);
}

/**
 * Şifreyi hash'e karşı doğrular.
 *
 * `storedHash` null ise (kullanıcı bulunamadı) yine de sabit maliyetli bir
 * doğrulama yapılır ve `false` döner. Çağıran taraf "kullanıcı yok" ile
 * "şifre yanlış" durumlarını ayırt eden bir yanıt üretmemelidir.
 */
export async function verifyPassword(
  plainPassword: string,
  storedHash: string | null,
): Promise<boolean> {
  if (storedHash === null) {
    await verify(await getDummyHash(), plainPassword, ARGON2_OPTIONS).catch(() => false);
    return false;
  }

  try {
    return await verify(storedHash, plainPassword, ARGON2_OPTIONS);
  } catch {
    // Bozuk veya tanınmayan hash biçimi: doğrulama başarısız sayılır.
    return false;
  }
}

/**
 * Hash'in güncel parametrelerle üretilip üretilmediğini söyler.
 *
 * Parametreler zamanla güçlendirildiğinde, kullanıcı bir sonraki başarılı
 * girişinde şifresi sessizce yeni parametrelerle yeniden hash'lenir.
 */
export function needsRehash(storedHash: string): boolean {
  const match = /^\$argon2id\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(storedHash);
  if (match === null) return true;

  const memoryCost = Number(match[2]);
  const timeCost = Number(match[3]);
  const parallelism = Number(match[4]);

  return (
    memoryCost < ARGON2_OPTIONS.memoryCost ||
    timeCost < ARGON2_OPTIONS.timeCost ||
    parallelism !== ARGON2_OPTIONS.parallelism
  );
}

/**
 * İki dizeyi sabit sürede karşılaştırır.
 *
 * Jeton karşılaştırmalarında `===` kullanmak, ilk farklı karakterde durduğu için
 * zamanlama saldırısına açıktır. Uzunluklar farklıysa yine de sabit süre harcanır.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  if (bufferA.length !== bufferB.length) {
    // Uzunluk farkı bilgisini zamanlamadan sızdırmamak için yine de karşılaştır.
    timingSafeEqual(bufferA, bufferA);
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}
