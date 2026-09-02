-- Arama indekslerini gerçekten çalışan sorgulara göre düzelt.
--
-- 0001 iki tam metin (GIN / to_tsvector) indeksi kuruyordu:
--
--   products_search_idx    ON products    (to_tsvector('simple', title || ' ' || description))
--   blog_posts_search_idx  ON blog_posts  (to_tsvector('simple', title || ' ' || excerpt))
--
-- Ancak uygulamada tam metin sorgusu YOK: arama her yerde `ILIKE '%metin%'`
-- ile yapılıyor ve `@@` operatörü hiç kullanılmıyor. Bu indeksler hiçbir
-- sorgu tarafından kullanılamaz — `pg_stat_user_indexes` üzerinde tarama
-- sayıları sıfır. Karşılığında her ürün ve blog yazısı yazımında bakım
-- maliyeti ödeniyor ve disk tutuyorlar.
--
-- Ya sorguları tam metne çevirmek ya da indeksi sorguya uydurmak gerekirdi.
-- İkincisi seçildi: `ILIKE '%...%'` kısmi eşleşmesi Türkçe ürün adlarında
-- ("buzdolab" → "Buzdolabı") tam metin aramasından daha isabetli sonuç verir;
-- tam metin, sondan eklemeli dilde kök ayırmadan zaten iyi çalışmaz.

DROP INDEX IF EXISTS products_search_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS blog_posts_search_idx;
--> statement-breakpoint

-- Vitrin araması ürün başlığının YANINDA marka adına da bakar
-- (`ILIKE` ile, `products` ⋈ `brands` birleşiminde). Başlık için trigram
-- indeksi 0001'de vardı, marka adı atlanmıştı.
CREATE INDEX brands_name_trgm_idx ON brands USING gin (name gin_trgm_ops);
--> statement-breakpoint

-- Blog araması başlık ve özet üzerinde çalışır.
CREATE INDEX blog_posts_title_trgm_idx ON blog_posts USING gin (title gin_trgm_ops);
--> statement-breakpoint

-- YÖNETİM ARAMALARI BİLİNÇLİ OLARAK İNDEKSSİZ.
--
-- `orders` ve `service_requests` üzerindeki takip numarası / ad / telefon
-- araması yalnızca personelin kullandığı, düşük trafikli bir yoldur; buna
-- karşılık iki tablo da her sipariş ve her talepte yazılır. Üç trigram
-- indeksinin yazma maliyeti, bu ölçekte aramanın kazandıracağından fazladır.
-- Tablolar büyüyüp yönetim araması yavaşlarsa buraya indeks eklenir.

-- Takip numarasındaki yıl işletmenin saat dilimine göre belirlenir.
--
-- `now()` sunucunun oturum saat dilimini kullanır. UTC çalışan bir sunucuda
-- 31 Aralık 21:00–24:00 arası İstanbul'da yeni yıl başlamış olur; o üç saatte
-- verilen siparişler bir önceki yılın numarasını alırdı.
CREATE OR REPLACE FUNCTION next_reference_number(prefix text, seq_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_value bigint;
BEGIN
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_value;
  RETURN prefix
    || '-'
    || to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYYY')
    || '-'
    || lpad(next_value::text, 6, '0');
END;
$$;
