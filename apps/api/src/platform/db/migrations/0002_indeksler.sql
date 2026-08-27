-- Eksik yabancı anahtar indeksi.
--
-- `check_product_not_in_active_order` tetikleyicisi, order_items tablosuna
-- eklenen HER satırda `WHERE oi.product_id = NEW.product_id` sorgusu çalıştırır.
-- İndeks olmadan bu ardışık taramaydı; üstelik sorgu, ürün satırlarını kilitli
-- tutan sipariş işleminin içinde çalıştığı için tarama süresi doğrudan kilit
-- tutma süresine ekleniyordu. Tablo büyüdükçe eşzamanlı sipariş kapasitesi
-- düşerdi. favorites tablosunda aynı indeks baştan vardı, order_items'ta
-- atlanmıştı.

CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");
