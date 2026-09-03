# Ersin Spot

İzmir Buca merkezli spot mağazası için e-ticaret ve hizmet platformu: ikinci el
beyaz eşya/elektronik satışı, teknik servis randevusu, evden eve nakliyat ve
müşteriden ürün alımı.

## Teknolojiler

| Katman           | Seçim                                              |
| ---------------- | -------------------------------------------------- |
| Dil              | TypeScript (strict)                                |
| Sunucu           | Hono (Node.js 22+)                                 |
| Veritabanı       | PostgreSQL 16 + Drizzle ORM                        |
| Doğrulama        | Zod — sunucu ve tarayıcı aynı şemayı paylaşır      |
| Kimlik           | argon2id + httpOnly çerezde opak oturum jetonu     |
| Arayüz           | React 18 + Vite + Tailwind                         |
| E-posta          | SMTP (nodemailer); yapılandırılmazsa log'a yazılır |
| Paket yöneticisi | pnpm workspace                                     |

Mimari **modüler monolittir**: tek süreç olarak dağıtılır, ancak içeride iş
alanına göre ayrılmış ve sınırları lint ile zorunlu kılınmış modüllerden oluşur.
Ayrıntı için [docs/MIMARI.md](docs/MIMARI.md).

## Kurulum

Gerekenler: Node.js 22+, pnpm 11+, Docker.

```bash
pnpm install

cp .env.example .env      # değerleri doldurun
pnpm db:up                # PostgreSQL'i ayağa kaldırır
pnpm db:migrate           # şemayı uygular
pnpm db:seed              # örnek veri: ürünler, SSS, blog, hesaplar

pnpm dev                  # API ve arayüzü birlikte başlatır
```

Tohumlama üç hesap oluşturur; üçünün şifresi de `gelistirme-sifresi-123`:

| Rol      | E-posta                  |
| -------- | ------------------------ |
| Yönetici | `yonetici@ersinspot.com` |
| Personel | `personel@ersinspot.com` |
| Müşteri  | `musteri@ornek.com`      |

Betik `NODE_ENV=production` iken çalışmayı reddeder ve tekrar çalıştırıldığında
veri çoğaltmaz.

## Sık kullanılan komutlar

| Komut              | Açıklama                                                |
| ------------------ | ------------------------------------------------------- |
| `pnpm dev`         | API ve arayüzü birlikte çalıştırır                      |
| `pnpm check`       | Biçim + tip + lint + testler — commit öncesi çalıştırın |
| `pnpm typecheck`   | Yalnızca tip kontrolü                                   |
| `pnpm lint`        | ESLint (modül sınırları dahil)                          |
| `pnpm test`        | Tüm testler                                             |
| `pnpm build`       | Üretim derlemesi — `pnpm check` bunu kapsamaz           |
| `pnpm format`      | Prettier ile biçimlendirir                              |
| `pnpm db:generate` | Şema değişikliğinden migration üretir                   |
| `pnpm db:migrate`  | Migration'ları uygular                                  |
| `pnpm db:reset`    | Veritabanını sıfırdan kurar (veri silinir)              |
| `pnpm db:studio`   | Drizzle Studio'yu açar                                  |

## Testler

Testler gerçek bir PostgreSQL'e karşı çalışır — sahte veritabanı kullanılmaz.
Kısıt ihlalleri, tetikleyici davranışı ve işlem geri alma ancak gerçek
veritabanında görünür.

API testleri ayrı bir veritabanı kullanır (`ersinspot_test`); geliştirme
verinizi silmezler.

```bash
pnpm test                                # hepsi
pnpm --filter @ersinspot/shared test     # alan kuralları (veritabanı gerekmez)
pnpm --filter @ersinspot/web test        # arayüz ve yönlendirme (jsdom)
pnpm --filter @ersinspot/api test        # entegrasyon (gerçek PostgreSQL)
```

`pnpm check` tip kontrolü, lint ve testleri kapsar ama **üretim derlemesini
kapsamaz**. Derleme yapılandırmasına dokunduysanız `pnpm build` de çalıştırın:
paket çözümleme sorunları yalnızca orada görünür.

## Katkı

1. `main` üzerinden dal açın.
2. Değişikliği yapın; `pnpm check` yeşil olmalı.
3. PR açın — şablondaki kontrol listesini doldurun.

Yeni bir uç nokta eklerken yetkilendirmenin rota tanımında bildirildiğinden
emin olun; ayrıntı için [docs/MIMARI.md](docs/MIMARI.md), Kural 3. Bir kayda
dosya bağlıyorsanız `attachFiles` çağrısını atlamayın — Kural 5.

## Dağıtım notları

| Değişken         | Ne zaman değiştirilir                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TRUST_PROXY`    | Uygulama nginx/Cloudflare gibi bir ters vekilin arkasındaysa `true`. Doğrudan internete açıksa `false` bırakın: `X-Forwarded-For` başlığını istemci de gönderebilir ve ona güvenmek giriş denemesi sınırını atlatır.                                                                                                                                                           |
| `SESSION_SECRET` | Üretimde rastgele üretin (`openssl rand -base64 48`). Geliştirme anahtarı üretimde reddedilir.                                                                                                                                                                                                                                                                                 |
| `SMTP_*`         | Üçü (host, kullanıcı, şifre) birden dolu olmalıdır; biri boşsa yapılandırma yok sayılır. Geliştirmede e-posta gönderilmez ve gövdesiyle log'a yazılır — sıfırlama bağlantısını oradan alabilirsiniz. Üretimde yalnızca uyarı düşülür, gövde yazılmaz: tek kullanımlık jetonlar log toplayıcıya girmemelidir. Şifre sıfırlama ve e-posta doğrulama bu ayarlar olmadan çalışmaz. |
| `STORAGE_DRIVER` | Şimdilik yalnızca `local` uygulanmıştır. `s3` seçilirse süreç açılışta anlaşılır bir mesajla durur.                                                                                                                                                                                                                                                                            |

Bakım görevleri sunucu sürecinin içinde çalışır. Birden çok örneğe geçildiğinde
her örnek aynı görevi çalıştırır; ayrıntı için [docs/MIMARI.md](docs/MIMARI.md).

## Belgeler

- [Mimari ve modül kuralları](docs/MIMARI.md)
