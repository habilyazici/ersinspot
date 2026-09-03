# Mimari

Ersin Spot, **modüler monolit** olarak yazılmıştır: tek süreç olarak dağıtılır ve tek
veritabanı kullanır, ancak içeride iş alanına göre ayrılmış ve sınırları zorunlu
kılınmış modüllerden oluşur.

Bu belge, kod yazarken uyulması gereken kuralları tanımlar. Yeni bir özellik eklerken
önce buraya bakın.

---

## Neden modüler monolit?

Önceki kod tabanı katman öncelikli düzenlenmişti: tüm rotalar tek dosyada
(8.153 satır, 98 uç), tüm şema başka bir yerde, iş mantığı üçüncü bir yerde.
Sonuçları denetimde ölçüldü:

- Bir özelliği değiştirmek üç ayrı klasöre dokunmayı gerektiriyordu.
- Modüller arası sınır olmadığı için sipariş kodu ürün tablosunu doğrudan okuyup
  yazıyordu; sipariş tutarı istemciden gelen fiyatla hesaplanıyordu.
- Aynı iş için iki rakip uygulama üst üste birikmişti (`moving.tsx` içindeki
  1.749 satır hiç çalışmıyordu, `index.tsx`'teki eski rotalar onu gölgeliyordu).

Mikroservise geçmek bu ölçekte gereksiz karmaşıklık getirir: tek işletme,
tek veritabanı, tek ekip. Modüler monolit ikisinin ortasıdır — sınırlar nettir,
dağıtım tektir. Bir modül ileride gerçekten ayrılması gerekirse, sözleşmesi
zaten tanımlı olduğu için çıkarılabilir.

---

## Dizin yapısı

```
apps/api/src/
├── platform/              Altyapı. İş kuralı içermez.
│   ├── db/                Bağlantı, işlem yönetimi, şema birleştirme
│   ├── http/              Middleware: kimlik, doğrulama, hata, güvenlik
│   ├── config/            Ortam değişkenleri
│   ├── observability/     Loglama
│   ├── errors/            Hata türleri
│   ├── authorization.ts   Kaynak sahipliği (IDOR) — HTTP'den bağımsız
│   ├── storage.ts         Dosya depolama sürücüsü
│   ├── mailer.ts          E-posta gönderimi
│   └── maintenance.ts     Zamanlanmış görevlerin çalıştırıcısı
│
├── modules/               İş alanları. Her biri kendi verisine sahiptir.
│   ├── identity/
│   ├── catalog/
│   ├── ordering/
│   ├── servicing/
│   ├── content/
│   └── files/
│
└── app.ts                 Modülleri birleştirir. Güvenlik haritası burada okunur.
```

### Bir modülün iç yapısı

```
modules/catalog/
├── index.ts               ► GENEL SÖZLEŞME — dışarıdan görünen tek dosya
├── domain/                İş kuralları. Veritabanı ve HTTP bilmez, saf TypeScript.
│   └── product-rules.ts
├── infrastructure/        Veritabanı erişimi.
│   ├── schema.ts          Bu modülün sahip olduğu tablolar
│   └── product-repository.ts
├── application/           Kullanım senaryoları. Domain'i ve repository'yi birleştirir.
│   └── product-service.ts
└── api/                   HTTP katmanı.
    └── routes.ts
```

Katmanların bağımlılık yönü tek taraflıdır:

```
api  →  application  →  domain
             ↓
      infrastructure
```

`domain` hiçbir şeye bağımlı değildir; bu yüzden veritabanı olmadan test edilebilir.

---

## Kural 1: Modüller yalnızca genel sözleşme üzerinden konuşur

Bir modül, başka bir modülün iç dosyalarına **erişemez**.

```ts
// ✗ YANLIŞ — başka modülün iç yapısına erişim
import { products } from '../../catalog/infrastructure/schema.ts';

// ✓ DOĞRU — genel sözleşme
import { catalog } from '../../catalog/index.ts';
const product = await catalog.getPurchasableProducts(ids, tx);
```

Bu kural ESLint ile zorunlu kılınır (`eslint.config.js` içindeki
`no-restricted-imports` kuralı). İhlal derlemeyi kırar, kod incelemesine kalmaz.

Modüller arası erişimde **yalnızca `index.ts` içe aktarılabilir**; alt
klasörlere (`domain/`, `application/`, `infrastructure/`, `api/`) hiçbir yoldan
ulaşılamaz — ne göreli ne mutlak. Kural yolun biçimini değil, HEDEFİ sınırlar:
sözleşme dosyası serbest, iç dosyalar kapalı.

### Sözleşme neye benzer?

`modules/catalog/index.ts` yalnızca diğer modüllerin ihtiyaç duyduğu şeyi dışa aktarır:

```ts
export const catalog = {
  getPurchasableProduct, // ordering: fiyat ve uygunluk sorar
  reserveProducts, // ordering: sipariş verilince rezerve eder
  releaseProducts, // ordering: sipariş iptalinde serbest bırakır
  markAsSold, // ordering: teslimatta satıldı işaretler
  createFromSellRequest, // servicing: kabul edilen talebi ürüne çevirir
};

export type { PurchasableProduct, ProductSummary };
```

Tablolar, repository'ler ve iç yardımcılar dışa aktarılmaz.

---

## Kural 2: Her tablonun tek bir sahip modülü vardır

Aşağıdaki liste elle tutulmaz: `apps/api/src/mimari.test.ts` bu tabloyu okur ve
her satırı modül şemalarıyla karşılaştırır. Yeni bir tablo eklendiğinde bu
listeye yazılmazsa test düşer.

| Modül       | Sahip olduğu tablolar                                                                                                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identity`  | `users`, `sessions`, `password_reset_tokens`, `email_verification_tokens`, `login_attempts`                                                                                                                                  |
| `catalog`   | `categories`, `brands`, `products`, `product_images`, `product_specs`                                                                                                                                                        |
| `ordering`  | `cart_items`, `favorites`, `orders`, `order_items`, `order_addresses`, `order_events`                                                                                                                                        |
| `servicing` | `service_requests`, `request_addresses`, `moving_request_details`, `moving_request_items`, `technical_service_details`, `sell_request_details`, `request_photos`, `request_quotes`, `request_appointments`, `request_events` |
| `content`   | `blog_posts`, `tags`, `blog_post_tags`, `faqs`, `contact_messages`, `site_settings`                                                                                                                                          |
| `files`     | `uploaded_files`                                                                                                                                                                                                             |

Bir modül, sahibi olmadığı tabloya **yazamaz**. Okuma da yapmaz — ihtiyacı olan
veriyi sahip modülün sözleşmesinden ister.

### Modüller arası yabancı anahtarlar

Yabancı anahtarlar modül sınırını geçebilir (`orders.user_id → users.id` gibi).
Bu bilinçli bir tercihtir: tek veritabanı kullandığımız için referans bütünlüğünü
veritabanına bırakmak, uygulama katmanında tutarlılık kontrolü yazmaktan güvenlidir.

Sınırı geçen yabancı anahtar eklerken `ON DELETE` davranışı açıkça düşünülür:

- `set null` — kayıt korunmalı ama sahip silinebilir (sipariş geçmişi)
- `cascade` — sahip silinince kayıt anlamsızlaşır (oturum, sepet)
- `restrict` — sahip silinemez (kullanımdaki kategori)

---

## Kural 3: Yetkilendirme rota tanımında bildirilir

Yetki kontrolü handler'ın içinde yazılmaz. Eski kod tabanında 98 ucun 58'inde
bu blok unutulmuştu; kontrolün handler içinde olması onu isteğe bağlı yapar.

```ts
// ✗ YANLIŞ — kontrol handler'ın içinde, unutulabilir
router.delete('/orders/:id', async (c) => {
  const check = await checkAdminAuth(token);
  if (!check.isAdmin) return c.json({ error: '...' }, 403);
  ...
});

// ✓ DOĞRU — kontrol rota tanımında, unutulamaz
router.delete('/orders/:id', requireStaff, handler);
```

Kaynak sahipliği (IDOR koruması) tek noktadan yapılır. Kural HTTP'den
bağımsızdır ve `platform/authorization.ts` içindedir; hem rota tanımları hem
uygulama katmanındaki servisler aynı fonksiyonu çağırır:

```ts
assertCanAccess(viewer, order.userId); // personel muaf, sahibi geçer, diğerleri 403
```

Rol karşılaştırması da oradadır (`isStaff`). Servislerde `role === 'staff' ||
role === 'admin'` biçiminde üç ayrı kopya vardı; yeni bir rol eklendiğinde
hepsinin bulunup güncellenmesi gerekiyordu.

---

## Kural 4: Para ve tutarlar sunucuda hesaplanır

İstemci **hangi ürünü** istediğini bildirir. Fiyat, ara toplam, teslimat ücreti
ve genel toplam sunucuda, veritabanından okunan fiyatlarla hesaplanır.

Adet diye bir alan yoktur: ikinci el ürün tekildir, stok adedi her zaman 1'dir.
Sepet ve sipariş kalemlerinde bir `quantity` sütunu duruyordu ve tek etkisi,
doğrudan API'ye istek atan birinin tek ürün için birden çok kez
ücretlendirilmesiydi.

Sipariş oluşturma şeması bilinçli olarak fiyat alanı içermez — aynı hatanın
tekrar yazılması yapısal olarak engellenir.

İstemcinin ekranda gördüğü tutar `expectedTotal` alanıyla gönderilir; sunucu
kendi hesabıyla karşılaştırır ve uyuşmazsa siparişi reddedip güncel tutarı
döndürür. Amaç, kullanıcının onayladığı fiyattan farklı bir tutarın tahsil
edilmemesidir.

Tüm tutarlar **kuruş cinsinden tam sayıdır**. `packages/shared/kernel/money.ts`
içindeki markalı `Kurus` tipi, düz `number` değerin yanlışlıkla tutar olarak
kullanılmasını engeller.

---

## Kural 5: Yükleme, kayda bağlanmadan kalıcı değildir

Bir dosya yüklendiğinde `uploaded_files` içinde YETİM olarak durur. Onu kalıcı
kılan tek şey, ilgili kaydı yazan işlemin `files.attachFiles(...)` çağırmasıdır:

```ts
await repository.insertPhotos(requestId, photos, tx);
await attachFiles(keys, tx, { purpose: 'request_photo', uploaderId: userId });
```

Çağrı yapılmadığında bakım görevi dosyayı 24 saat sonra diskten siler ve kayıt
var olmayan bir anahtarı gösterir — ürün görselleri, blog kapakları ve talep
fotoğrafları ertesi gün topluca kaybolur. Fonksiyon baştan yazılmıştı ama
hiçbir yerden çağrılmıyordu; denetimde bulundu.

`attachFiles` aynı zamanda bir doğrulama noktasıdır: anahtar yoksa ya da
bildirilen amaç/yükleyici tutmuyorsa işlem reddedilir. Böylece bir kayıt,
başkasının yüklemesine ya da hiç var olmayan bir anahtara bağlanamaz.

---

## Kural 6: Doğrulama sınırda yapılır

Her uç, gövdesini ve sorgu parametrelerini `@ersinspot/shared` içindeki zod
şemasıyla doğrular. Handler ham gövdeye erişmez; yalnızca doğrulanmış ve
temizlenmiş değeri okur.

Aynı şema tarayıcıda formu doğrular. Tek kaynak olduğu için sunucunun kabul
ettiği ile formun izin verdiği ayrışamaz.

---

## Paylaşılan paket (`@ersinspot/shared`)

Sunucu ve tarayıcının paylaştığı sözleşme. İki bölümden oluşur:

```
packages/shared/src/
├── kernel/         Ortak çekirdek: para, telefon, adres, sayfalama, hata sözleşmesi
└── modules/        Modül başına tipler ve doğrulama şemaları
    ├── identity/
    ├── catalog/
    ├── ordering/
    ├── servicing/
    └── content/
```

`kernel` her modülün kullanabileceği yapı taşlarını içerir ve hiçbir modüle
bağımlı değildir. Modül klasörleri birbirine bağımlı olabilir ancak döngü
oluşturamaz.

Bu paket tarayıcıya da gönderildiği için içine Node'a özgü kod (dosya sistemi,
veritabanı, `process`) **konulamaz**.

---

## Yeni bir modül eklerken

1. `modules/<ad>/` klasörünü oluşturun ve dört alt klasörü ekleyin.
2. Tabloları `infrastructure/schema.ts` içinde tanımlayın ve
   `platform/db/schema.ts` dosyasından yeniden dışa aktarın (Drizzle Kit yalnızca
   oradan okur).
3. `index.ts` içinde yalnızca diğer modüllerin gerçekten ihtiyaç duyduğu
   fonksiyonları dışa aktarın. Şüphedeyseniz dışa aktarmayın — sonradan eklemek
   kolaydır, kaldırmak zordur.
4. `app.ts` içinde yönlendiriciyi bağlayın ve hangi yetki grubuna ait olduğuna
   karar verin.
5. `docs/MIMARI.md` içindeki tablo sahipliği listesini güncelleyin.

---

## Zamanla tetiklenen kurallar

Bazı iş kuralları bir istekle değil, zamanın geçmesiyle çalışır. Her biri sahibi
olan modülün sözleşmesinden sunulur; `server.ts` yalnızca zamanlar.

| Görev                                         | Sahip      | Aralık | Ne yapar                                                                      |
| --------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------- |
| `suresi-gecmis-kimlik-kayitlarini-temizle`    | `identity` | 1 saat | Süresi dolmuş oturumları, tükenmiş jetonları ve eski giriş denemelerini siler |
| `odemesi-gelmeyen-siparisleri-iptal-et`       | `ordering` | 15 dk  | Havale bildirimi gelmeyen siparişi iptal eder, ürünleri satışa döndürür       |
| `suresi-gecmis-rezervasyonlari-serbest-birak` | `catalog`  | 15 dk  | Emniyet ağı: siparişi kalmamış rezervasyonları çözer                          |
| `yetim-dosyalari-temizle`                     | `files`    | 6 saat | Hiçbir kayda bağlanmamış eski yüklemeleri siler                               |

Sıra önemlidir: sipariş iptali ürünleri NORMAL yoldan serbest bırakır. Katalog
görevi tek başına çalışırsa ürün satışa döner ama sipariş açık kalır ve aynı
ürün ikinci kez satılabilir — denetimde bulunan durum tam olarak buydu.

Bu yüzden açılıştaki ilk tur yukarıdaki listenin SIRASIYLA ve birer birer
çalıştırılır (`startMaintenance`). Aralıkla tekrarlanan turlarda her görev kendi
zamanlayıcısındadır ve katalog görevi bilinçli olarak bir emniyet ağıdır:
sipariş iptali onu zaten gereksiz kılar, ağ yalnızca o yoldan kaçmış — siparişi
silinmiş ya da elle değiştirilmiş — rezervasyonları toplar.

**Ölçekleme notu:** görevler sunucu sürecinin içinde çalışır. Birden çok örneğe
geçildiğinde her örnek aynı görevi çalıştırır; o noktada bir danışma kilidi
(advisory lock) eklenmeli ya da görevler ayrı bir zamanlayıcıya taşınmalıdır.

---

## Test yaklaşımı

| Katman         | Test türü        | Veritabanı             |
| -------------- | ---------------- | ---------------------- |
| `domain/`      | Birim            | Yok — saf fonksiyonlar |
| `application/` | Entegrasyon      | Gerçek PostgreSQL      |
| `api/`         | Uçtan uca (HTTP) | Gerçek PostgreSQL      |

Sahte veritabanı kullanılmaz. Denetimde bulunan hataların çoğu — kısıt ihlalleri,
tetikleyici davranışı, işlem geri alma, eşzamanlılık — ancak gerçek veritabanında
görünür.

Testler `pnpm db:up` ile ayağa kalkan yerel PostgreSQL'e karşı çalışır ve CI'da
aynı sürüm kullanılır.
