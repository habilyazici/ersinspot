/*
  Arama indekslerini NORMALLEŞTİRİLMİŞ ifadeye taşı.

  0004, aramanın `ILIKE '%metin%'` ile yapıldığını tespit edip trigram
  indekslerini ona göre kurmuştu. Ölçüldüğünde aramanın kendisinin eksik
  olduğu görüldü: sorgu ham sütunla karşılaştırıyordu ve Türkçe harf yazmayan
  müşteri hiçbir sonuç alamıyordu.

      "çamaşır"  → 1 sonuç
      "camasir"  → 0 sonuç
      "buzdolabı" → 1 sonuç
      "buzdolabi" → 0 sonuç

  Türkçe klavyede ı, ş, ğ yazmak tuş değiştirmeyi gerektirir; telefonda
  müşterilerin önemli bir kısmı bu harfleri hiç yazmaz. Kataloğun tamamı
  Türkçe ürün adlarından oluşan bir sitede arama kutusu, en sık yazılan biçimi
  bulamıyordu.

  Ayrıca `lower('I')` bu kurulumda 'i' veriyor ('ı' değil): tümü büyük harfle
  yazılmış "BUZDOLABI" başlığı "buzdolabı" aramasıyla eşleşmiyordu.

  Sorgu artık iki tarafı da ASCII küçük harfe indiriyor
  (`platform/db/search.ts`). İndeksler AYNI İFADE üzerine kurulmazsa
  kullanılamaz: PostgreSQL ifade indeksini ancak sorgudaki ifade birebir
  eşleştiğinde seçer. Ham sütun üzerindeki eski indeksler bu yüzden düşürülür.

  `products.slug` ve `blog_posts.slug` de aranıyor ama zaten ASCII küçük
  harftir (`slugify` üretir); ayrı indeks gerektirmez.
*/
DROP INDEX IF EXISTS products_title_trgm_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS brands_name_trgm_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS blog_posts_title_trgm_idx;
--> statement-breakpoint

CREATE INDEX products_title_search_idx ON products
  USING gin ((lower(translate(title, 'çÇğĞıIİiöÖşŞüÜ', 'ccggiiiioossuu'))) gin_trgm_ops);
--> statement-breakpoint

CREATE INDEX brands_name_search_idx ON brands
  USING gin ((lower(translate(name, 'çÇğĞıIİiöÖşŞüÜ', 'ccggiiiioossuu'))) gin_trgm_ops);
--> statement-breakpoint

CREATE INDEX blog_posts_title_search_idx ON blog_posts
  USING gin ((lower(translate(title, 'çÇğĞıIİiöÖşŞüÜ', 'ccggiiiioossuu'))) gin_trgm_ops);
