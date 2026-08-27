/**
 * Geliştirme verisi.
 *
 * `pnpm db:seed` ile çalışır. Komut `package.json` içinde ve README'de
 * duruyordu ama betik hiç yazılmamıştı: kurulumu takip eden bir geliştirici
 * boş bir vitrin, boş bir SSS ve boş bir blog ile karşılaşıyordu.
 *
 * ÜRETİMDE ÇALIŞMAZ. Betik sahte kullanıcı ve bilinen şifreler oluşturur;
 * yanlışlıkla üretim veritabanına çalıştırılması ciddi bir güvenlik olayı
 * olurdu, bu yüzden `NODE_ENV=production` iken hata verip durur.
 *
 * TEKRAR ÇALIŞTIRILABİLİR. Doğal anahtarlar (e-posta, bağlantı adı, ayar
 * anahtarı) üzerinden çakışma yoksayılır; ikinci çalıştırma veri çoğaltmaz.
 *
 * KONUMU BİLEŞİM KÖKÜDÜR (`app.ts` ve `server.ts` ile aynı seviye), `platform/`
 * değil. Betik birden çok modülün şemasına ve şifre özetleme gibi iş mantığına
 * dokunur; platform katmanı ise modüllere bağımlı olamaz — bağımlılık yönü
 * daima modüllerden platforma doğrudur. Lint kuralı bunu zorunlu kılıyor ve
 * ilk yazımda haklı olarak uyardı.
 */

import { deflateSync } from 'node:zlib';
import { eq } from 'drizzle-orm';
import { slugify } from '@ersinspot/shared';
import type { FAQ_CATEGORIES } from '@ersinspot/shared';
import { closeDatabase, db } from './platform/db/client.ts';
import { isProduction } from './platform/config/env.ts';
import { hashPassword } from './modules/identity/domain/password.ts';
import { store } from './platform/storage.ts';
import { users } from './modules/identity/infrastructure/schema.ts';
import {
  brands,
  categories,
  productImages,
  productSpecs,
  products,
} from './modules/catalog/infrastructure/schema.ts';
import {
  blogPostTags,
  blogPosts,
  faqs,
  siteSettings,
  tags,
} from './modules/content/infrastructure/schema.ts';
import { DEFAULT_SETTINGS } from './modules/content/application/settings-service.ts';
import { uploadedFiles } from './modules/files/infrastructure/schema.ts';

// ---------------------------------------------------------------------------
// Yer tutucu görsel üretimi
// ---------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, payload: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);

  const body = Buffer.concat([Buffer.from(type, 'ascii'), payload]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, crc]);
}

/**
 * Düz renkli PNG üretir.
 *
 * Gerçek ürün fotoğrafları yönetim panelinden yüklenir; burada üretilenler
 * vitrinin boş görünmemesi içindir. Harici bir görsel indirmek yerine dosya
 * yerinde üretilir: tohumlama ağ bağlantısı gerektirmez ve her çalıştırmada
 * aynı sonucu verir.
 */
function solidPng(width: number, height: number, rgb: [number, number, number]): Uint8Array {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit derinliği
  header[9] = 2; // renk türü: truecolor
  header[10] = 0; // sıkıştırma
  header[11] = 0; // süzgeç
  header[12] = 0; // aralama yok

  // Her satır bir süzgeç baytıyla başlar (0 = süzgeç yok), ardından RGB üçlüleri.
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) {
    row[1 + x * 3] = rgb[0];
    row[2 + x * 3] = rgb[1];
    row[3 + x * 3] = rgb[2];
  }

  const raw = Buffer.concat(Array.from({ length: height }, () => row));

  return new Uint8Array(
    Buffer.concat([
      signature,
      pngChunk('IHDR', header),
      pngChunk('IDAT', deflateSync(raw)),
      pngChunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

/** Ürün için bir yer tutucu görsel yükler ve depolama anahtarını döndürür. */
async function seedImage(
  uploaderId: string,
  rgb: [number, number, number],
): Promise<{ storageKey: string }> {
  const data = solidPng(800, 600, rgb);
  const stored = await store('product_image', 'image/png', data);

  await db.insert(uploadedFiles).values({
    storageKey: stored.key,
    uploadedByUserId: uploaderId,
    purpose: 'product_image',
    contentType: stored.contentType,
    sizeBytes: stored.sizeBytes,
    originalName: 'yer-tutucu.png',
    // Ürüne bağlanmış sayılır; yetim temizliği bu dosyaları silmemeli.
    attachedAt: new Date(),
  });

  return { storageKey: stored.key };
}

// ---------------------------------------------------------------------------
// Veri
// ---------------------------------------------------------------------------

const SEED_PASSWORD = 'gelistirme-sifresi-123';

const CATEGORY_TREE = [
  {
    name: 'Beyaz Eşya',
    slug: 'beyaz-esya',
    children: [
      { name: 'Buzdolabı', slug: 'buzdolabi' },
      { name: 'Çamaşır Makinesi', slug: 'camasir-makinesi' },
      { name: 'Bulaşık Makinesi', slug: 'bulasik-makinesi' },
      { name: 'Fırın ve Ocak', slug: 'firin-ocak' },
    ],
  },
  {
    name: 'Elektronik',
    slug: 'elektronik',
    children: [
      { name: 'Televizyon', slug: 'televizyon' },
      { name: 'Küçük Ev Aletleri', slug: 'kucuk-ev-aletleri' },
    ],
  },
  {
    name: 'Mobilya',
    slug: 'mobilya',
    children: [
      { name: 'Oturma Odası', slug: 'oturma-odasi' },
      { name: 'Yatak Odası', slug: 'yatak-odasi' },
    ],
  },
] as const;

const BRANDS = [
  { name: 'Arçelik', slug: 'arcelik' },
  { name: 'Beko', slug: 'beko' },
  { name: 'Bosch', slug: 'bosch' },
  { name: 'Siemens', slug: 'siemens' },
  { name: 'Vestel', slug: 'vestel' },
  { name: 'Samsung', slug: 'samsung' },
  { name: 'LG', slug: 'lg' },
] as const;

/** Vitrin ürünleri. Fiyatlar kuruş cinsindendir. */
const PRODUCTS = [
  {
    slug: 'arcelik-no-frost-buzdolabi-520l',
    title: 'Arçelik No Frost Buzdolabı 520 L',
    description:
      'Az kullanılmış, çizik ve göçük yok. Soğutma performansı test edildi, contaları sağlam. ' +
      'No Frost sistemi sayesinde buz çözme derdi yok. Kullanım kılavuzu mevcut.',
    priceKurus: 2_450_000,
    condition: 'like_new' as const,
    categorySlug: 'buzdolabi',
    brandSlug: 'arcelik',
    warrantyMonths: 6,
    color: [96, 125, 139] as [number, number, number],
    specs: [
      { key: 'Kapasite', value: '520 L' },
      { key: 'Enerji Sınıfı', value: 'A++' },
      { key: 'Soğutma', value: 'No Frost' },
      { key: 'Renk', value: 'Inox' },
    ],
  },
  {
    slug: 'bosch-9kg-camasir-makinesi',
    title: 'Bosch 9 kg Çamaşır Makinesi',
    description:
      'Üç yıl kullanılmış, düzenli bakımı yapılmış. Tüm programlar çalışıyor, su alma ve tahliye ' +
      'sorunsuz. Ön kapak camında hafif bir çizik var, fotoğrafta görünüyor.',
    priceKurus: 1_250_000,
    condition: 'good' as const,
    categorySlug: 'camasir-makinesi',
    brandSlug: 'bosch',
    warrantyMonths: 3,
    color: [120, 144, 156] as [number, number, number],
    specs: [
      { key: 'Kapasite', value: '9 kg' },
      { key: 'Devir', value: '1200 rpm' },
      { key: 'Enerji Sınıfı', value: 'A+++' },
    ],
  },
  {
    slug: 'arcelik-bulasik-makinesi-6-programli',
    title: 'Arçelik Bulaşık Makinesi 6 Programlı',
    description:
      'Çalışır durumda, sepetleri tam. Yıkama performansı test edildi. Üst sepet rayında hafif ' +
      'oynama var, kullanımı engellemiyor.',
    priceKurus: 680_000,
    condition: 'fair' as const,
    categorySlug: 'bulasik-makinesi',
    brandSlug: 'arcelik',
    warrantyMonths: 3,
    color: [144, 164, 174] as [number, number, number],
    specs: [
      { key: 'Program Sayısı', value: '6' },
      { key: 'Kapasite', value: '12 kişilik' },
    ],
  },
  {
    slug: 'samsung-50-inc-4k-televizyon',
    title: 'Samsung 50" 4K Smart Televizyon',
    description:
      'Ekranda ölü piksel yok, görüntü kalitesi kontrol edildi. Uzaktan kumandası ve ayağı ' +
      'birlikte veriliyor. Kutusu yok.',
    priceKurus: 1_450_000,
    condition: 'good' as const,
    categorySlug: 'televizyon',
    brandSlug: 'samsung',
    warrantyMonths: 3,
    color: [55, 71, 79] as [number, number, number],
    specs: [
      { key: 'Ekran Boyutu', value: '50 inç' },
      { key: 'Çözünürlük', value: '3840 x 2160 (4K)' },
      { key: 'Smart TV', value: 'Var' },
    ],
  },
  {
    slug: 'beko-ankastre-firin',
    title: 'Beko Ankastre Fırın',
    description:
      'Isıtma ve turbo fan çalışıyor, cam kapağı temiz. İç emaye kaplamada kullanımdan ' +
      'kaynaklı renk değişimi var.',
    priceKurus: 520_000,
    condition: 'fair' as const,
    categorySlug: 'firin-ocak',
    brandSlug: 'beko',
    warrantyMonths: 3,
    color: [69, 90, 100] as [number, number, number],
    specs: [
      { key: 'Hacim', value: '65 L' },
      { key: 'Fonksiyon', value: 'Turbo fanlı' },
    ],
  },
  {
    slug: 'uc-kisilik-koltuk-takimi',
    title: '3+2+1 Koltuk Takımı',
    description:
      'Kumaş döşeme, leke ve yırtık yok. Yaylar sağlam, oturum sertliği korunmuş. ' +
      'Temizliği yapılarak teslim edilir.',
    priceKurus: 1_850_000,
    condition: 'good' as const,
    categorySlug: 'oturma-odasi',
    brandSlug: null,
    warrantyMonths: 0,
    color: [161, 136, 127] as [number, number, number],
    specs: [
      { key: 'Takım', value: '3+2+1' },
      { key: 'Döşeme', value: 'Kumaş' },
    ],
  },
] as const;

/** SSS içeriği. Cevaplar sistemin gerçek davranışını anlatır. */
const FAQS: { question: string; answer: string; category: (typeof FAQ_CATEGORIES)[number] }[] = [
  {
    category: 'orders',
    question: 'Sipariş verdikten sonra ne oluyor?',
    answer:
      'Siparişiniz bize ulaştığında ürün sizin için ayrılır ve başkasına satılamaz. ' +
      'Sipariş durumunuzu hesabınızdaki "Siparişlerim" sayfasından takip edebilirsiniz. ' +
      'Teslimat öncesinde sizi telefonla arayarak teyit ederiz.',
  },
  {
    category: 'orders',
    question: 'Siparişimi iptal edebilir miyim?',
    answer:
      'Hazırlığa geçilmeden önce hesabınızdan kendiniz iptal edebilirsiniz. Hazırlanmaya ' +
      'başlanmış veya yola çıkmış bir sipariş için bizimle iletişime geçmeniz gerekir.',
  },
  {
    category: 'delivery',
    question: 'Hangi ilçelere teslimat yapıyorsunuz?',
    answer:
      'Buca, Bornova, Konak, Karabağlar, Gaziemir, Balçova, Narlıdere, Bayraklı, Çiğli, ' +
      'Karşıyaka ve Menderes ilçelerine teslimat yapıyoruz. Mağazamızdan teslim alma seçeneği ' +
      'her zaman mevcuttur.',
  },
  {
    category: 'delivery',
    question: 'Teslimat ücreti ne kadar?',
    answer:
      'Buca içi teslimat ücretsizdir. Diğer ilçelere 500,00 ₺ teslimat ücreti alınır. ' +
      '15.000,00 ₺ ve üzeri siparişlerde teslimat her ilçede ücretsizdir.',
  },
  {
    category: 'delivery',
    question: 'Teslimat saatini seçebilir miyim?',
    answer:
      'Evet. Sipariş sırasında gün ve saat aralığı seçersiniz. En erken iki gün sonrasına ' +
      'randevu verilebilir; bu süre ürünün hazırlanması içindir.',
  },
  {
    category: 'payment',
    question: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?',
    answer:
      'Kapıda nakit ödeme ve havale/EFT kabul ediyoruz. Havale seçtiğinizde siparişiniz, ' +
      'ödeme bildiriminiz bize ulaşana kadar "ödeme bekleniyor" durumunda tutulur.',
  },
  {
    category: 'products',
    question: 'Ürünler ikinci el, güvenli mi?',
    answer:
      'Satışa çıkan her ürün ekibimiz tarafından test edilir. Ürünün durumu (sıfır ayarında, ' +
      'iyi, orta, yıpranmış) ilan sayfasında açıkça belirtilir ve fotoğraflar ürünün kendisine ' +
      'aittir — stok görseli kullanmıyoruz.',
  },
  {
    category: 'products',
    question: 'Ürünlerde garanti var mı?',
    answer:
      'Uygun ürünlerde mağaza garantisi veriyoruz. Garanti süresi her ürünün ilan sayfasında ' +
      'ayrıca yazılıdır; garanti verilmeyen ürünlerde bu alan boştur.',
  },
  {
    category: 'products',
    question: 'Ürünü görmeden almak zorunda mıyım?',
    answer:
      'Hayır. Mağazamıza gelip ürünü yerinde inceleyebilir, çalıştırarak test edebilirsiniz. ' +
      'Sipariş verirken "mağazadan teslim alma" seçeneğini işaretlemeniz yeterlidir.',
  },
  {
    category: 'technical_service',
    question: 'Teknik servis ücreti nasıl işliyor?',
    answer:
      "Keşif ücreti 750,00 ₺'dir ve teknisyenimizin adresinize gelip arızayı yerinde " +
      'incelemesinin karşılığıdır. Onarımı bize yaptırmanız hâlinde bu tutar toplam fiyattan ' +
      'düşülür. Onarım fiyatı, arıza görüldükten sonra ayrı bir teklif olarak iletilir.',
  },
  {
    category: 'technical_service',
    question: 'Hangi cihazlara servis veriyorsunuz?',
    answer:
      'Buzdolabı, çamaşır makinesi, bulaşık makinesi, fırın, ocak, klima, televizyon, ' +
      'şofben ve küçük ev aletlerine servis veriyoruz. Listede olmayan bir cihaz için ' +
      'talep oluştururken "diğer" seçeneğini kullanabilirsiniz.',
  },
  {
    category: 'moving',
    question: 'Nakliye fiyatı nasıl belirleniyor?',
    answer:
      'Formda gördüğünüz tutar bir tahmindir; ev büyüklüğü, kat, asansör durumu ve eşya ' +
      'sayısına göre hesaplanır. Bağlayıcı fiyat, ekibimiz talebinizi inceledikten sonra ' +
      'ilettiği tekliftir.',
  },
  {
    category: 'moving',
    question: 'Ambalajlama ve montaj hizmeti veriyor musunuz?',
    answer:
      'Evet, ikisi de isteğe bağlı ek hizmettir. Talep formunda işaretlediğinizde tahmini ' +
      'tutara eklenir. Ambalajlamada eşyalarınız ekibimiz tarafından paketlenir, montajda ' +
      'sökülen mobilyalar yeni adreste kurulur.',
  },
  {
    category: 'selling',
    question: 'Ürünümü nasıl satabilirim?',
    answer:
      '"Ürününüzü Satın" sayfasından ürünü fotoğraflarıyla birlikte tanıtmanız yeterli. ' +
      'En az üç fotoğraf gerekiyor: ürünü görmeden değerleme yapamıyoruz. Ekibimiz inceledikten ' +
      'sonra size bir fiyat teklifi sunar.',
  },
  {
    category: 'selling',
    question: 'Her ürünü alıyor musunuz?',
    answer:
      'Beyaz eşya, elektronik ve mobilya alıyoruz. Ürünün çalışır durumda ve satılabilir ' +
      'nitelikte olması gerekir. Teklifi kabul ederseniz ürünü adresinizden biz teslim alırız.',
  },
  {
    category: 'account',
    question: 'Neden e-posta doğrulaması isteniyor?',
    answer:
      'Nakliye, teknik servis ve ürün satma taleplerinde e-posta doğrulaması isteriz. Bu adım, ' +
      'ekibimizin gerçek bir talebe yola çıkmasını güvence altına alır. Ürün siparişlerinde ' +
      'doğrulama gerekmez.',
  },
];

/** Blog yazıları. İçerik Markdown alt kümesiyle yazılır. */
const BLOG_POSTS = [
  {
    slug: 'ikinci-el-buzdolabi-alirken',
    title: 'İkinci El Buzdolabı Alırken Nelere Dikkat Etmeli',
    excerpt:
      'İkinci el bir buzdolabı iyi bir tasarruf olabilir ya da pahalı bir hata. Farkı yaratan, ' +
      'satın almadan önce kontrol ettikleriniz.',
    category: 'buying_guide' as const,
    tagNames: ['Buzdolabı', 'Satın Alma Rehberi', 'Beyaz Eşya'],
    content: `İkinci el buzdolabı, doğru seçildiğinde yıllarca sorunsuz çalışır. Yanlış seçildiğinde ise hem para hem de gıda kaybına yol açar. Aşağıdaki adımlar, mağazada geçireceğiniz on beş dakikada işinizi görecektir.

## Önce sesi dinleyin

Buzdolabını fişe takın ve birkaç dakika bekleyin. Kompresör devreye girdiğinde duyulan ses tok ve düzenli olmalıdır. Tıkırtı, metalik sürtünme veya düzensiz aralıklarla duran-çalışan bir kompresör, yakın zamanda masraf çıkacağının işaretidir.

## Contayı elinizle kontrol edin

Kapak contası buzdolabının en çok yıpranan parçasıdır ve en kolay gözden kaçanıdır. Kapağı kapatıp bir kağıt parçasını contaya sıkıştırın; kağıt kolayca çıkıyorsa conta görevini yapmıyor demektir. Bozuk conta hem elektrik faturasını artırır hem de soğutmayı bozar.

- Contanın tüm kenarlarını tek tek deneyin
- Yırtık, sertleşme veya küf olup olmadığına bakın
- Conta değişebilir bir parçadır; fiyat pazarlığında kullanın

## İç yüzeye ve raflara bakın

Çatlak raflar, kırık sebzelik kapağı ve sararmış plastik yüzeyler cihazın nasıl kullanıldığını anlatır. Bunlar çalışmayı engellemez ama günlük kullanımda rahatsız eder ve yedek parçası her modelde bulunmaz.

## No Frost mu, statik mi?

No Frost modeller buz çözme derdini ortadan kaldırır ama fanı ve rezistansı olduğu için arıza yüzeyi daha geniştir. Statik modeller daha az parçaya sahiptir, buna karşılık düzenli buz çözme ister.

> Kısa kullanım geçmişi olan bir statik model, çok kullanılmış bir No Frost modelden genellikle daha iyi bir alımdır.

## Enerji sınıfını sormaktan çekinmeyin

Buzdolabı yılın her günü çalışan tek ev aletidir. A++ ile C sınıfı arasındaki fark, birkaç yılda satın alma fiyatının önemli bir bölümünü geri öder.

Satın almadan önce ürünün etiketini görmek isteyin. Bizim ilanlarımızda enerji sınıfı teknik özellikler bölümünde yazılıdır; yazmıyorsa sormanız yeterli.`,
  },
  {
    slug: 'camasir-makinesi-bakim-ipuclari',
    title: 'Çamaşır Makinesinin Ömrünü Uzatan Beş Alışkanlık',
    excerpt:
      'Servise gelen çamaşır makinelerinin çoğunda arızanın sebebi bakım eksikliği. Beşi de ' +
      'evde, ücretsiz yapılabilir.',
    category: 'maintenance' as const,
    tagNames: ['Çamaşır Makinesi', 'Bakım', 'Beyaz Eşya'],
    content: `Teknik servise gelen çamaşır makinelerinin önemli bir kısmında sorun, parça arızası değil birikmiş kirdir. Aşağıdaki beş alışkanlık cihazınızın ömrünü belirgin şekilde uzatır.

## 1. Kapağı açık bırakın

Yıkama bittikten sonra kapağı ve deterjan çekmecesini aralık bırakın. Kapalı kalan nemli tambur, küf ve kötü kokunun ana sebebidir.

## 2. Ayda bir boş yıkama yapın

En yüksek sıcaklıkta, deterjansız ve çamaşırsız bir program çalıştırın. Bu, tamburda biriken deterjan artığını ve kireci çözer.

## 3. Pompa filtresini temizleyin

Makinenin alt ön kapağındaki filtre üç ayda bir temizlenmelidir. Bozuk paralar, düğmeler ve saç telleri burada birikir; tıkalı filtre su tahliyesini engeller ve pompayı zorlar.

1. Makinenin fişini çekin
2. Alt kapağı açın ve önüne bir bez serin
3. Filtreyi saat yönünün tersine çevirerek çıkarın
4. Akan suyun altında temizleyip yerine takın

## 4. Fazla deterjan kullanmayın

Fazla deterjan daha temiz çamaşır demek değildir. Durulanamayan köpük tamburda kalır, kumaşta iz bırakır ve makinede tortu oluşturur. Kutunun üzerindeki ölçü yeterlidir.

## 5. Aşırı yüklemeyin

Tamburun üçte biri boş kalmalıdır. Aşırı yükleme rulmanları zorlar ve dengesizlik nedeniyle sıkma sırasında sarsıntı yapar. Rulman değişimi, bu listedeki en pahalı onarımdır.

Bu adımlar sorunu çözmüyorsa arıza gerçek olabilir. [Teknik servis talebi](/teknik-servis) oluşturarak yerinde keşif isteyebilirsiniz.`,
  },
  {
    slug: 'tasinma-oncesi-hazirlik-listesi',
    title: 'Taşınmadan Önce Yapılacaklar Listesi',
    excerpt:
      'Taşınma gününün sorunsuz geçmesi, bir gün önce yaptıklarınıza bağlı. İşte sırayla ' +
      'yapılacaklar.',
    category: 'moving_tips' as const,
    tagNames: ['Nakliye', 'Taşınma'],
    content: `Taşınma gününde yaşanan aksaklıkların çoğu, bir gün önce yapılabilecek hazırlıkların atlanmasından kaynaklanır.

## Bir hafta önce

- Eşya listesini çıkarın ve nakliye firmasına eksiksiz bildirin
- Kullanmadığınız eşyaları ayırın; taşımadığınız her eşya masraf ve emek tasarrufudur
- Yeni adreste asansör kullanımı için apartman yönetiminden izin alın

## Bir gün önce

- Buzdolabını boşaltın ve fişini çekin; buz çözme için en az on iki saat gerekir
- Çamaşır makinesinin suyunu boşaltın ve tamburu nakliye cıvatalarıyla sabitleyin
- Kırılacak eşyaları ayrı kolilere koyup üzerine büyük harfle yazın

> Çamaşır makinesi nakliye cıvatası takılmadan taşınırsa rulmanları zarar görür. Cıvataları saklamadıysanız firmadan isteyin.

## Taşınma günü

- İlk açacağınız kutuyu ayırın: temizlik malzemesi, priz, şarj aleti, havlu
- Ödeme ve iletişim bilgilerini yanınızda bulundurun
- Eşyalar yüklenmeden önce boş evi son kez dolaşın

## Sonrasında

Yeni adreste montaj gerektiren eşyalarınız varsa bunu talep formunda belirtin; ekibimiz sökülen mobilyaları yerinde kurar.

Taşınma tahmini için [nakliye talebi](/nakliye) sayfasından birkaç dakikada fiyat görebilirsiniz.`,
  },
];

// ---------------------------------------------------------------------------
// Tohumlama
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  if (isProduction) {
    throw new Error(
      'Tohumlama üretimde çalıştırılamaz: betik bilinen şifrelerle sahte kullanıcı oluşturur.',
    );
  }

  console.log('Tohumlama başlıyor...\n');

  // --- Kullanıcılar ---
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const accounts = [
    {
      email: 'yonetici@ersinspot.com',
      fullName: 'Ersin Yönetici',
      phone: '+905071940550',
      role: 'admin' as const,
    },
    {
      email: 'personel@ersinspot.com',
      fullName: 'Mehmet Personel',
      phone: '+905321112233',
      role: 'staff' as const,
    },
    {
      email: 'musteri@ornek.com',
      fullName: 'Ayşe Yılmaz',
      phone: '+905449998877',
      role: 'customer' as const,
    },
  ];

  /*
    `onConflictDoNothing({ target: users.email })` kullanılamaz: e-posta tekilliği
    `lower(email)` ifadesi üzerinde tanımlıdır (büyük/küçük harf duyarsız
    olması için) ve ON CONFLICT hedefi bir ifade indeksiyle eşleşmez. Tohumlama
    eşzamanlı çalışmadığı için önce varlık kontrolü yeterlidir.
  */
  for (const account of accounts) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, account.email))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(users).values({ ...account, passwordHash, emailVerifiedAt: new Date() });
  }

  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, 'yonetici@ersinspot.com'))
    .limit(1);

  if (admin === undefined) throw new Error('Yönetici hesabı oluşturulamadı.');
  console.log(`  ${accounts.length} kullanıcı`);

  // --- Site ayarları ---
  for (const [key, setting] of Object.entries(DEFAULT_SETTINGS)) {
    await db
      .insert(siteSettings)
      .values({
        key,
        value: setting.value,
        valueType: setting.valueType,
        description: setting.description,
        updatedByUserId: admin.id,
      })
      .onConflictDoNothing({ target: siteSettings.key });
  }
  console.log(`  ${Object.keys(DEFAULT_SETTINGS).length} site ayarı`);

  // --- Kategoriler ---
  const categoryIdBySlug = new Map<string, string>();

  for (const [rootIndex, root] of CATEGORY_TREE.entries()) {
    await db
      .insert(categories)
      .values({ name: root.name, slug: root.slug, displayOrder: rootIndex })
      .onConflictDoNothing({ target: categories.slug });

    const [rootRow] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, root.slug))
      .limit(1);

    if (rootRow === undefined) continue;
    categoryIdBySlug.set(root.slug, rootRow.id);

    for (const [childIndex, child] of root.children.entries()) {
      await db
        .insert(categories)
        .values({
          name: child.name,
          slug: child.slug,
          parentId: rootRow.id,
          displayOrder: childIndex,
        })
        .onConflictDoNothing({ target: categories.slug });

      const [childRow] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, child.slug))
        .limit(1);

      if (childRow !== undefined) categoryIdBySlug.set(child.slug, childRow.id);
    }
  }
  console.log(`  ${categoryIdBySlug.size} kategori`);

  // --- Markalar ---
  const brandIdBySlug = new Map<string, string>();

  for (const brand of BRANDS) {
    await db.insert(brands).values(brand).onConflictDoNothing({ target: brands.slug });

    const [row] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.slug, brand.slug))
      .limit(1);

    if (row !== undefined) brandIdBySlug.set(brand.slug, row.id);
  }
  console.log(`  ${brandIdBySlug.size} marka`);

  // --- Ürünler ---
  let createdProducts = 0;

  for (const product of PRODUCTS) {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, product.slug))
      .limit(1);

    // Ürün varsa görselleri yeniden üretmeye gerek yok.
    if (existing.length > 0) continue;

    const categoryId = categoryIdBySlug.get(product.categorySlug);
    if (categoryId === undefined) continue;

    const [created] = await db
      .insert(products)
      .values({
        slug: product.slug,
        title: product.title,
        description: product.description,
        priceKurus: product.priceKurus,
        condition: product.condition,
        status: 'for_sale',
        warrantyMonths: product.warrantyMonths,
        categoryId,
        brandId: product.brandSlug === null ? null : (brandIdBySlug.get(product.brandSlug) ?? null),
      })
      .returning({ id: products.id });

    if (created === undefined) continue;
    createdProducts += 1;

    // Her ürüne üç yer tutucu görsel: en az görsel sayısı şemada üçtür.
    for (let index = 0; index < 3; index += 1) {
      const shade = product.color.map((channel) =>
        Math.max(0, Math.min(255, channel + index * 18)),
      ) as [number, number, number];

      const image = await seedImage(admin.id, shade);

      await db.insert(productImages).values({
        productId: created.id,
        storageKey: image.storageKey,
        altText: product.title,
        displayOrder: index,
      });
    }

    await db.insert(productSpecs).values(
      product.specs.map((spec, index) => ({
        productId: created.id,
        key: spec.key,
        value: spec.value,
        displayOrder: index,
      })),
    );
  }
  console.log(`  ${createdProducts} ürün (${createdProducts * 3} görsel)`);

  // --- SSS ---
  for (const [index, faq] of FAQS.entries()) {
    const existing = await db
      .select({ id: faqs.id })
      .from(faqs)
      .where(eq(faqs.question, faq.question))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(faqs).values({ ...faq, displayOrder: index, isPublished: true });
  }
  console.log(`  ${FAQS.length} sıkça sorulan soru`);

  // --- Blog ---
  let createdPosts = 0;

  for (const post of BLOG_POSTS) {
    const existing = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, post.slug))
      .limit(1);

    if (existing.length > 0) continue;

    const [created] = await db
      .insert(blogPosts)
      .values({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        authorName: 'Ersin Spot',
        authorUserId: admin.id,
        // Okuma süresi uygulamada içerikten hesaplanır; burada kabaca kelime sayısından.
        readingMinutes: Math.max(1, Math.round(post.content.split(/\s+/).length / 200)),
        isPublished: true,
        publishedAt: new Date(),
      })
      .returning({ id: blogPosts.id });

    if (created === undefined) continue;
    createdPosts += 1;

    for (const name of post.tagNames) {
      // Paylaşılan çekirdekle aynı üretim: tohumlanan etiketler uygulamanın
      // ürettikleriyle çakışmalı, ikinci bir kayıt oluşturmamalı.
      const slug = slugify(name);

      await db.insert(tags).values({ name, slug }).onConflictDoNothing({ target: tags.slug });

      const [tag] = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).limit(1);

      if (tag !== undefined) {
        await db.insert(blogPostTags).values({ postId: created.id, tagId: tag.id });
      }
    }
  }
  console.log(`  ${createdPosts} blog yazısı`);

  console.log('\nTohumlama tamamlandı.\n');
  console.log('Giriş bilgileri:');
  for (const account of accounts) {
    console.log(`  ${account.role.padEnd(8)} ${account.email}  /  ${SEED_PASSWORD}`);
  }
  console.log('');
}

seed()
  .then(() => closeDatabase())
  .catch((error: unknown) => {
    console.error('Tohumlama başarısız:', error);
    process.exitCode = 1;
    void closeDatabase();
  });
