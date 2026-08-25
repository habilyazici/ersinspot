-- Bütünlük kısıtları, diziler ve tetikleyiciler.
--
-- Drizzle şeması sütun tiplerini ve yabancı anahtarları üretir; iş kurallarının
-- veritabanı seviyesinde güvenceye alınması bu dosyada yapılır. Buradaki kuralların
-- hepsi uygulama katmanında da kontrol edilir — ancak veritabanı son savunma hattıdır:
-- bir hata veya doğrudan SQL erişimi verinin tutarsız kalmasına yol açamaz.

-- ---------------------------------------------------------------------------
-- Takip numarası dizileri
-- ---------------------------------------------------------------------------
-- Eski kodda takip numarası `Date.now()` ile üretiliyordu; aynı milisaniyede gelen
-- iki istek aynı numarayı alabilirdi. Dizi kullanmak bunu imkânsız kılar.

CREATE SEQUENCE IF NOT EXISTS order_reference_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS moving_reference_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS technical_service_reference_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS sell_request_reference_seq START WITH 1 INCREMENT BY 1;
--> statement-breakpoint

-- Takip numarası üretir: "SIP-2026-000123"
CREATE OR REPLACE FUNCTION next_reference_number(prefix text, seq_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_value bigint;
BEGIN
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_value;
  RETURN prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(next_value::text, 6, '0');
END;
$$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- updated_at otomatik güncelleme
-- ---------------------------------------------------------------------------
-- Uygulama katmanının `updatedAt` yazmayı unutması mümkün. Tetikleyici bunu garanti eder.

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER users_touch_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER categories_touch_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER brands_touch_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER products_touch_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER cart_items_touch_updated_at BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER orders_touch_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER service_requests_touch_updated_at BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER blog_posts_touch_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER faqs_touch_updated_at BEFORE UPDATE ON faqs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Para ve adet kısıtları
-- ---------------------------------------------------------------------------
-- Tüm tutarlar kuruş cinsinden tam sayıdır ve negatif olamaz.

ALTER TABLE products
  ADD CONSTRAINT products_price_positive CHECK (price_kurus > 0),
  ADD CONSTRAINT products_warranty_non_negative CHECK (warranty_months >= 0),
  ADD CONSTRAINT products_view_count_non_negative CHECK (view_count >= 0),
  ADD CONSTRAINT products_favorite_count_non_negative CHECK (favorite_count >= 0);
--> statement-breakpoint

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0);
--> statement-breakpoint

ALTER TABLE orders
  ADD CONSTRAINT orders_subtotal_non_negative CHECK (subtotal_kurus >= 0),
  ADD CONSTRAINT orders_delivery_fee_non_negative CHECK (delivery_fee_kurus >= 0),
  ADD CONSTRAINT orders_total_non_negative CHECK (total_kurus >= 0),
  -- Genel toplam daima bileşenlerinin toplamına eşittir. Bu kısıt, tutar hesabındaki
  -- bir hatanın veritabanına yazılmasını engeller.
  ADD CONSTRAINT orders_total_matches_components
    CHECK (total_kurus = subtotal_kurus + delivery_fee_kurus);
--> statement-breakpoint

ALTER TABLE order_items
  ADD CONSTRAINT order_items_unit_price_positive CHECK (unit_price_kurus > 0),
  ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  -- Satır toplamı daima birim fiyat × adet'tir.
  ADD CONSTRAINT order_items_line_total_matches
    CHECK (line_total_kurus = unit_price_kurus * quantity);
--> statement-breakpoint

ALTER TABLE request_quotes
  ADD CONSTRAINT request_quotes_amount_positive CHECK (amount_kurus > 0);
--> statement-breakpoint

ALTER TABLE moving_request_details
  ADD CONSTRAINT moving_estimated_total_non_negative CHECK (estimated_total_kurus >= 0);
--> statement-breakpoint

ALTER TABLE moving_request_items
  ADD CONSTRAINT moving_items_quantity_positive CHECK (quantity > 0);
--> statement-breakpoint

ALTER TABLE technical_service_details
  ADD CONSTRAINT technical_inspection_fee_non_negative CHECK (inspection_fee_kurus >= 0);
--> statement-breakpoint

ALTER TABLE sell_request_details
  ADD CONSTRAINT sell_asking_price_positive
    CHECK (asking_price_kurus IS NULL OR asking_price_kurus > 0),
  ADD CONSTRAINT sell_purchase_year_reasonable
    CHECK (purchase_year IS NULL OR (purchase_year >= 1950 AND purchase_year <= 2100));
--> statement-breakpoint

ALTER TABLE uploaded_files
  ADD CONSTRAINT uploaded_files_size_positive CHECK (size_bytes > 0);
--> statement-breakpoint

ALTER TABLE users
  ADD CONSTRAINT users_failed_login_count_non_negative CHECK (failed_login_count >= 0),
  -- E-posta uygulama katmanında küçük harfe çevrilir; veritabanı bunu doğrular.
  ADD CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  -- Telefon daima E.164 biçiminde saklanır.
  ADD CONSTRAINT users_phone_e164 CHECK (phone ~ '^\+90[0-9]{10}$');
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Teslimat tutarlılığı
-- ---------------------------------------------------------------------------
-- Adrese teslimatta adres ve tarih zorunlu; mağazadan teslim alımda adres olamaz.

ALTER TABLE orders
  ADD CONSTRAINT orders_delivery_consistency CHECK (
    (delivery_method = 'home_delivery'
      AND delivery_address IS NOT NULL
      AND delivery_date IS NOT NULL)
    OR
    (delivery_method = 'store_pickup'
      AND delivery_address IS NULL)
  );
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Hizmet talebi ↔ detay tablosu tutarlılığı
-- ---------------------------------------------------------------------------
-- Her service_requests satırının, kind alanına karşılık gelen tam olarak bir detay
-- satırı olmalıdır. Detay tabloları ayrı olduğu için bu, yabancı anahtarla ifade
-- edilemez; tetikleyiciyle güvenceye alınır.
--
-- Kontrol ERTELENMİŞ (deferred) çalışır: talep ve detayı aynı işlem içinde yazılır,
-- kontrol işlem sonunda yapılır. Böylece ekleme sırası önemli olmaz.

CREATE OR REPLACE FUNCTION check_service_request_detail()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  request_kind service_kind;
  detail_count integer;
BEGIN
  SELECT kind INTO request_kind FROM service_requests WHERE id = NEW.id;

  IF request_kind IS NULL THEN
    RETURN NEW;  -- talep silinmiş, kontrol edilecek bir şey yok
  END IF;

  CASE request_kind
    WHEN 'moving' THEN
      SELECT count(*) INTO detail_count
        FROM moving_request_details WHERE request_id = NEW.id;
    WHEN 'technical_service' THEN
      SELECT count(*) INTO detail_count
        FROM technical_service_details WHERE request_id = NEW.id;
    WHEN 'sell_request' THEN
      SELECT count(*) INTO detail_count
        FROM sell_request_details WHERE request_id = NEW.id;
  END CASE;

  IF detail_count <> 1 THEN
    RAISE EXCEPTION
      'Hizmet talebi % (tür: %) için detay kaydı bulunamadı veya birden fazla.',
      NEW.id, request_kind
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER service_requests_require_detail
  AFTER INSERT ON service_requests
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_service_request_detail();
--> statement-breakpoint

-- Talebin türü sonradan değiştirilemez: detay tablosu artık eşleşmezdi.
CREATE OR REPLACE FUNCTION prevent_service_request_kind_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.kind <> OLD.kind THEN
    RAISE EXCEPTION 'Hizmet talebinin türü değiştirilemez.'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER service_requests_kind_immutable
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION prevent_service_request_kind_change();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Favori sayacı
-- ---------------------------------------------------------------------------
-- Denormalize sayacı uygulama katmanında güncellemek yerine tetikleyiciye bırakmak,
-- sayacın veriyle ayrışmasını imkânsız kılar.

CREATE OR REPLACE FUNCTION sync_product_favorite_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products SET favorite_count = favorite_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products SET favorite_count = greatest(0, favorite_count - 1) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER favorites_sync_count
  AFTER INSERT OR DELETE ON favorites
  FOR EACH ROW EXECUTE FUNCTION sync_product_favorite_count();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Arama indeksi
-- ---------------------------------------------------------------------------
-- Ürün araması için Türkçe metin arama yapılandırması. `pg_trgm` ile birlikte
-- kısmi eşleşme ve yazım hatası toleransı sağlar.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint

CREATE INDEX products_title_trgm_idx ON products USING gin (title gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX products_search_idx ON products
  USING gin (to_tsvector('simple', title || ' ' || description));
--> statement-breakpoint
