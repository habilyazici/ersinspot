-- Adet kavramı kaldırılıyor: ikinci el ürün tekildir.
--
-- Bir ürünün stok adedi HER ZAMAN 1'dir. Yaşam döngüsü bir sayaç değil, durum
-- makinesidir: `for_sale → reserved → sold`. Aynı buzdolabından "üç adet" diye
-- bir şey yoktur; nitekim `products` tablosunda stok sütunu da yoktur.
--
-- Buna rağmen sepet ve sipariş kalemleri bir `quantity` sütunu taşıyordu ve
-- API 1–10 arası değer kabul ediyordu ("model ileride çok adetli ürünleri de
-- desteklesin diye"). Arayüzde adet seçici hiç olmadı, dolayısıyla alan hiçbir
-- meşru akışta 1'den farklı olmadı. Ama doğrudan API'ye istek atan biri için
-- şu sonucu veriyordu:
--
--   • sipariş kalemi `birim fiyat × adet` tutarıyla yazılıyor,
--   • rezerve edilen ve satılan ise TEK ürün oluyordu.
--
-- Yani müşteri bir buzdolabı alıp üç buzdolabı parası ödeyebiliyordu. Kullanılan
-- bir alan değildi; yalnızca yanlış tutar üretebilen bir alandı.
--
-- `line_total_kurus` de birlikte düşüyor: adet olmadan satır toplamı daima
-- birim fiyata eşittir ve aynı sayıyı iki sütunda tutmak, ikisinin ayrışması
-- için beklemekten başka bir şey değildir. Kalan sütun, adı artık "birim"
-- niteleyicisi taşımadığı için `price_kurus` olarak yeniden adlandırılır.
--
-- Sütunlar veriyle birlikte düşüyor; ancak `quantity` daima 1 ve
-- `line_total_kurus` daima birim fiyata eşit olduğu için hiçbir bilgi kaybolmaz.

-- Önce kısıtlar: kaldırılacak sütunlara bağlılar.
ALTER TABLE "order_items"
  DROP CONSTRAINT IF EXISTS "order_items_line_total_matches",
  DROP CONSTRAINT IF EXISTS "order_items_quantity_positive";
--> statement-breakpoint

ALTER TABLE "cart_items"
  DROP CONSTRAINT IF EXISTS "cart_items_quantity_positive";
--> statement-breakpoint

-- Sütun adı, kısıt adıyla birlikte güncellenir; ikisi de "birim" demeyi bırakır.
ALTER TABLE "order_items" RENAME COLUMN "unit_price_kurus" TO "price_kurus";
--> statement-breakpoint

ALTER TABLE "order_items"
  RENAME CONSTRAINT "order_items_unit_price_positive" TO "order_items_price_positive";
--> statement-breakpoint

ALTER TABLE "order_items"
  DROP COLUMN "quantity",
  DROP COLUMN "line_total_kurus";
--> statement-breakpoint

ALTER TABLE "cart_items" DROP COLUMN "quantity";
