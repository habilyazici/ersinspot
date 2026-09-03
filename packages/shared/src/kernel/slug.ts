/**
 * Bağlantı adı (slug) üretimi.
 *
 * PAYLAŞILAN PAKETTE DURUR çünkü iki taraf da aynı sonucu üretmek zorundadır:
 * yönetim panelindeki blog formu başlıktan bir bağlantı adı önerir, sunucu da
 * ürün başlığından kendi bağlantı adını türetir. İki uygulama ayrı yazılsaydı
 * personelin ekranda gördüğü ile kaydedilen ayrışabilirdi.
 *
 * Denetimde bu işin DÖRT ayrı kopyası bulundu: katalog alan kuralları, içerik
 * etiket normalleştirmesi, tohumlama betiği ve blog yönetim formu. Dördü de
 * biraz farklıydı.
 */

/**
 * Türkçe harflerin ASCII karşılıkları.
 *
 * `toLowerCase()` tek başına yetmez: "I" harfi Türkçede "ı" olur ve
 * `normalize('NFD')` Türkçe "ı" ile "ğ" harflerini ayrıştıramaz. Eşleme bu
 * yüzden küçültmeden ÖNCE uygulanır.
 */
const TURKISH_TO_ASCII: Readonly<Record<string, string>> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  i: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

/** Bağlantı adının üst sınırı: uzun adresler hem çirkin hem de indeksi büyütür. */
export const MAX_SLUG_LENGTH = 80;

/**
 * Metinden bağlantı adı üretir.
 *
 *   "Arçelik 9 Kg Çamaşır Makinesi"  →  "arcelik-9-kg-camasir-makinesi"
 *
 * Benzersizlik burada SAĞLANMAZ; çağıran taraf çakışma durumunda sonuna ayırt
 * edici bir ek koyar. Boş veya yalnızca noktalama içeren bir girdide boş dize
 * döner — çağıran bunu bir hata olarak ele almalıdır.
 */
/**
 * Metni ASCII küçük harfe indirger: "Yılmaz" → "yilmaz", "Café" → "cafe".
 *
 * Bağlantı adı üretiminin ilk adımıdır ama tek başına da işe yarar: iki metnin
 * "aynı kelime" olup olmadığını karşılaştırırken Türkçe yazımın iki biçimi
 * (kullanıcının adını "Yılmaz" yazması, şifresine "yilmaz" yazması) aynı
 * dizeye inmelidir.
 */
export function toAsciiLower(text: string): string {
  return (
    [...text]
      .map((character) => TURKISH_TO_ASCII[character] ?? character)
      .join('')
      .toLowerCase()
      .normalize('NFD')
      // Latin harflerdeki aksanları kaldır (é → e).
      .replace(/[̀-ͯ]/g, '')
  );
}

export function slugify(text: string): string {
  return (
    toAsciiLower(text)
      // Harf ve rakam dışındaki her şey ayırıcı olur.
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_SLUG_LENGTH)
      // Kesme sonunda ayırıcı kalmış olabilir.
      .replace(/-+$/, '')
  );
}
