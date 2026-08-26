/**
 * İçerik iş kuralları.
 *
 * Saf fonksiyonlar; veritabanı ve HTTP bilmez.
 */

/**
 * Türkçe metin için ortalama okuma hızı (kelime/dakika).
 *
 * Türkçe sondan eklemeli olduğu için kelimeler İngilizceye göre uzundur;
 * genel kabul gören 200-250 aralığının alt ucu daha gerçekçi bir tahmin verir.
 */
const WORDS_PER_MINUTE = 200;

/** İçerikten okuma süresini tahmin eder. En az bir dakika döner. */
export function estimateReadingMinutes(content: string): number {
  const words = content
    .replace(/[#*_`>[\]()!-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Etiket adını normalleştirir.
 *
 * "Beyaz Eşya", "beyaz eşya" ve "BEYAZ EŞYA" aynı etikettir. Eski kodda
 * etiketler dizi sütununda tutulduğu için bu varyasyonlar ayrı ayrı çoğalırdı.
 */
export function slugifyTag(name: string): string {
  const turkishToAscii: Readonly<Record<string, string>> = {
    ç: 'c',
    Ç: 'c',
    ğ: 'g',
    Ğ: 'g',
    ı: 'i',
    I: 'i',
    İ: 'i',
    ö: 'o',
    Ö: 'o',
    ş: 's',
    Ş: 's',
    ü: 'u',
    Ü: 'u',
  };

  return [...name]
    .map((character) => turkishToAscii[character] ?? character)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * İletişim formundaki bot tuzağı doldurulmuş mu?
 *
 * Gerçek kullanıcıya görünmeyen bir alan; otomatik araçlar formu doldururken
 * onu da doldurur. Dolduysa istek başarılı gibi yanıtlanır ama kaydedilmez —
 * bot, engellendiğini anlamaz ve yeni yöntem denemez.
 */
export function isLikelyBot(honeypotValue: string | undefined): boolean {
  return honeypotValue !== undefined && honeypotValue.trim() !== '';
}
