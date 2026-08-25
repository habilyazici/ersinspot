# Ersin Spot

İzmir Buca merkezli spot mağazası için e-ticaret ve hizmet platformu: ikinci el
beyaz eşya/elektronik satışı, teknik servis randevusu, evden eve nakliyat ve
müşteriden ürün alımı.

## Teknolojiler

| Katman           | Seçim                                          |
| ---------------- | ---------------------------------------------- |
| Dil              | TypeScript (strict)                            |
| Sunucu           | Hono (Node.js 22+)                             |
| Veritabanı       | PostgreSQL 16 + Drizzle ORM                    |
| Doğrulama        | Zod — sunucu ve tarayıcı aynı şemayı paylaşır  |
| Kimlik           | argon2id + httpOnly çerezde opak oturum jetonu |
| Arayüz           | React 18 + Vite + Tailwind                     |
| Paket yöneticisi | pnpm workspace                                 |

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

pnpm dev                  # API ve arayüzü birlikte başlatır
```

## Sık kullanılan komutlar

| Komut              | Açıklama                                                 |
| ------------------ | -------------------------------------------------------- |
| `pnpm dev`         | API ve arayüzü birlikte çalıştırır                       |
| `pnpm check`       | Tip kontrolü + lint + testler — commit öncesi çalıştırın |
| `pnpm typecheck`   | Yalnızca tip kontrolü                                    |
| `pnpm lint`        | ESLint (modül sınırları dahil)                           |
| `pnpm test`        | Tüm testler                                              |
| `pnpm format`      | Prettier ile biçimlendirir                               |
| `pnpm db:generate` | Şema değişikliğinden migration üretir                    |
| `pnpm db:migrate`  | Migration'ları uygular                                   |
| `pnpm db:reset`    | Veritabanını sıfırdan kurar (veri silinir)               |
| `pnpm db:studio`   | Drizzle Studio'yu açar                                   |

## Testler

Testler gerçek bir PostgreSQL'e karşı çalışır — sahte veritabanı kullanılmaz.
Kısıt ihlalleri, tetikleyici davranışı ve işlem geri alma ancak gerçek
veritabanında görünür.

API testleri ayrı bir veritabanı kullanır (`ersinspot_test`); geliştirme
verinizi silmezler.

```bash
pnpm test                                # hepsi
pnpm --filter @ersinspot/shared test     # birim testleri (veritabanı gerekmez)
pnpm --filter @ersinspot/api test        # entegrasyon testleri
```

## Katkı

1. `main` üzerinden dal açın.
2. Değişikliği yapın; `pnpm check` yeşil olmalı.
3. PR açın — şablondaki kontrol listesini doldurun.

Yeni bir uç nokta eklerken yetkilendirmenin rota tanımında bildirildiğinden
emin olun; ayrıntı için [docs/MIMARI.md](docs/MIMARI.md), Kural 3.

## Belgeler

- [Mimari ve modül kuralları](docs/MIMARI.md)
- [Eski kod tabanının denetim raporu](https://claude.ai/code/artifact/58cec0c2-580a-4785-a6e6-de6f54d2e754)
