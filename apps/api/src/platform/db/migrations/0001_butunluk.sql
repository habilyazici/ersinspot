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
CREATE TRIGGER customer_addresses_touch_updated_at BEFORE UPDATE ON customer_addresses
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
-- Adres anlık görüntülerinin değişmezliği
-- ---------------------------------------------------------------------------
-- Siparişin ve talebin adresi, o andaki durumun fotoğrafıdır. Müşteri adres
-- defterindeki kaydı sonradan düzenlediğinde geçmiş sipariş etkilenmemelidir.
-- Uygulama zaten kopyalayarak yazar; tetikleyici bunu güvenceye alır.

CREATE OR REPLACE FUNCTION prevent_address_snapshot_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Adres anlık görüntüsü değiştirilemez. Yeni bir kayıt oluşturun.'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint

CREATE TRIGGER order_addresses_immutable
  BEFORE UPDATE ON order_addresses
  FOR EACH ROW EXECUTE FUNCTION prevent_address_snapshot_update();
--> statement-breakpoint

CREATE TRIGGER request_addresses_immutable
  BEFORE UPDATE ON request_addresses
  FOR EACH ROW EXECUTE FUNCTION prevent_address_snapshot_update();
--> statement-breakpoint

-- Kullanıcı başına yalnızca bir varsayılan adres olabilir.
CREATE UNIQUE INDEX customer_addresses_one_default_per_user
  ON customer_addresses (user_id)
  WHERE is_default AND deleted_at IS NULL;
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
    CHECK (total_kurus = subtotal_kurus + delivery_fee_kurus),
  -- Teslimat saat aralığı tutarlı olmalı.
  ADD CONSTRAINT orders_delivery_time_range
    CHECK (
      (delivery_start_time IS NULL AND delivery_end_time IS NULL)
      OR (delivery_start_time IS NOT NULL AND delivery_end_time IS NOT NULL
          AND delivery_start_time < delivery_end_time)
    );
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

ALTER TABLE request_appointments
  ADD CONSTRAINT request_appointments_time_range CHECK (start_time < end_time);
--> statement-breakpoint

ALTER TABLE moving_request_details
  ADD CONSTRAINT moving_estimated_total_non_negative CHECK (estimated_total_kurus >= 0),
  -- Kat bilgisi fiyatın girdisidir; makul bir aralıkta olmalı.
  ADD CONSTRAINT moving_from_floor_range CHECK (from_floor BETWEEN -3 AND 50),
  ADD CONSTRAINT moving_to_floor_range CHECK (to_floor BETWEEN -3 AND 50),
  ADD CONSTRAINT moving_preferred_time_range
    CHECK (
      (preferred_start_time IS NULL AND preferred_end_time IS NULL)
      OR (preferred_start_time IS NOT NULL AND preferred_end_time IS NOT NULL
          AND preferred_start_time < preferred_end_time)
    );
--> statement-breakpoint

ALTER TABLE moving_request_items
  ADD CONSTRAINT moving_items_quantity_positive CHECK (quantity > 0);
--> statement-breakpoint

ALTER TABLE technical_service_details
  ADD CONSTRAINT technical_inspection_fee_non_negative CHECK (inspection_fee_kurus >= 0),
  ADD CONSTRAINT technical_preferred_time_range
    CHECK (
      (preferred_start_time IS NULL AND preferred_end_time IS NULL)
      OR (preferred_start_time IS NOT NULL AND preferred_end_time IS NOT NULL
          AND preferred_start_time < preferred_end_time)
    ),
  -- Cihaz türü "diğer" ise serbest metin alanı doldurulmalıdır.
  ADD CONSTRAINT technical_custom_device_required
    CHECK (device_type <> 'other' OR custom_device_type IS NOT NULL);
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

ALTER TABLE blog_posts
  ADD CONSTRAINT blog_posts_reading_minutes_positive CHECK (reading_minutes > 0),
  ADD CONSTRAINT blog_posts_view_count_non_negative CHECK (view_count >= 0),
  -- Yayınlanmış bir yazının yayın tarihi olmalıdır.
  ADD CONSTRAINT blog_posts_published_has_date
    CHECK (NOT is_published OR published_at IS NOT NULL);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Teslimat tutarlılığı
-- ---------------------------------------------------------------------------
-- Adrese teslimatta tarih zorunlu. Adres kaydının varlığı ayrı bir tetikleyiciyle
-- denetlenir; ayrı tabloda olduğu için CHECK ile ifade edilemez.

ALTER TABLE orders
  ADD CONSTRAINT orders_home_delivery_requires_date CHECK (
    delivery_method <> 'home_delivery' OR delivery_date IS NOT NULL
  );
--> statement-breakpoint

CREATE OR REPLACE FUNCTION check_order_delivery_address()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  method delivery_method;
  address_count integer;
BEGIN
  SELECT delivery_method INTO method FROM orders WHERE id = NEW.id;
  IF method IS NULL THEN
    RETURN NEW;  -- sipariş silinmiş
  END IF;

  SELECT count(*) INTO address_count FROM order_addresses WHERE order_id = NEW.id;

  IF method = 'home_delivery' AND address_count <> 1 THEN
    RAISE EXCEPTION 'Adrese teslimat için teslimat adresi zorunludur.'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF method = 'store_pickup' AND address_count <> 0 THEN
    RAISE EXCEPTION 'Mağazadan teslim alımda teslimat adresi bulunamaz.'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER orders_delivery_address_consistency
  AFTER INSERT ON orders
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_order_delivery_address();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Hizmet talebi ↔ detay ve adres tutarlılığı
-- ---------------------------------------------------------------------------
-- Her service_requests satırının, kind alanına karşılık gelen tam olarak bir detay
-- satırı ve türüne uygun adres kayıtları olmalıdır. Detay tabloları ayrı olduğu
-- için bu, yabancı anahtarla ifade edilemez; tetikleyiciyle güvenceye alınır.
--
-- Kontrol ERTELENMİŞ çalışır: talep, detayı ve adresleri aynı işlem içinde yazılır,
-- kontrol işlem sonunda yapılır. Böylece ekleme sırası önemli olmaz.

CREATE OR REPLACE FUNCTION check_service_request_detail()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  request_kind service_kind;
  detail_count integer;
  address_count integer;
BEGIN
  SELECT kind INTO request_kind FROM service_requests WHERE id = NEW.id;

  IF request_kind IS NULL THEN
    RETURN NEW;  -- talep silinmiş, kontrol edilecek bir şey yok
  END IF;

  CASE request_kind
    WHEN 'moving' THEN
      SELECT count(*) INTO detail_count
        FROM moving_request_details WHERE request_id = NEW.id;
      SELECT count(*) INTO address_count
        FROM request_addresses
        WHERE request_id = NEW.id AND role IN ('moving_from', 'moving_to');
      IF address_count <> 2 THEN
        RAISE EXCEPTION
          'Nakliye talebi % için çıkış ve varış adresi zorunludur.', NEW.id
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;

    WHEN 'technical_service' THEN
      SELECT count(*) INTO detail_count
        FROM technical_service_details WHERE request_id = NEW.id;
      SELECT count(*) INTO address_count
        FROM request_addresses
        WHERE request_id = NEW.id AND role = 'service_location';
      IF address_count <> 1 THEN
        RAISE EXCEPTION
          'Teknik servis talebi % için servis adresi zorunludur.', NEW.id
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;

    WHEN 'sell_request' THEN
      SELECT count(*) INTO detail_count
        FROM sell_request_details WHERE request_id = NEW.id;
      SELECT count(*) INTO address_count
        FROM request_addresses
        WHERE request_id = NEW.id AND role = 'pickup';
      IF address_count <> 1 THEN
        RAISE EXCEPTION
          'Satış talebi % için teslim alma adresi zorunludur.', NEW.id
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;
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

-- Talebin türü sonradan değiştirilemez: detay tablosu ve adres rolleri artık eşleşmezdi.
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
-- Ürün araması için kısmi eşleşme ve yazım hatası toleransı.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint

CREATE INDEX products_title_trgm_idx ON products USING gin (title gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX products_search_idx ON products
  USING gin (to_tsvector('simple', title || ' ' || description));
--> statement-breakpoint
CREATE INDEX blog_posts_search_idx ON blog_posts
  USING gin (to_tsvector('simple', title || ' ' || excerpt));
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Ödeme kayıtları
-- ---------------------------------------------------------------------------

ALTER TABLE payments
  -- İade kayıtları negatif olabilir; sıfır tutarlı ödeme anlamsızdır.
  ADD CONSTRAINT payments_amount_not_zero CHECK (amount_kurus <> 0),
  -- Onaylanmış bir ödemenin onay zamanı olmalıdır; onaylanmamışın olmamalıdır.
  ADD CONSTRAINT payments_confirmed_has_timestamp
    CHECK (
      (status = 'confirmed' AND confirmed_at IS NOT NULL)
      OR (status <> 'confirmed' AND confirmed_at IS NULL)
    ),
  -- İade tutarı negatif, tahsilat pozitif olmalıdır.
  ADD CONSTRAINT payments_refund_is_negative
    CHECK (
      (status = 'refunded' AND amount_kurus < 0)
      OR (status <> 'refunded' AND amount_kurus > 0)
    );
--> statement-breakpoint

CREATE TRIGGER payments_touch_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Çift satış koruması
-- ---------------------------------------------------------------------------
-- İkinci el ürünler tekildir: bir ürün aynı anda yalnızca bir aktif siparişte
-- bulunabilir. Uygulama katmanı bunu satır kilidiyle (FOR UPDATE) ve durum
-- makinesiyle zaten engelliyor; bu indeks aynı garantiyi veritabanı seviyesinde
-- verir. İki savunma katmanı birbirine güvenmez.
--
-- İptal edilmiş siparişlerin kalemleri hariç tutulur: iptal sonrası ürün yeniden
-- satılabilmelidir.

-- PostgreSQL, kısmi indeks koşulunda alt sorguya izin vermez (koşul değişmez
-- olmak zorundadır). Aynı garanti tetikleyiciyle kurulur.

CREATE OR REPLACE FUNCTION check_product_not_in_active_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO active_count
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = NEW.product_id
    AND oi.id <> NEW.id
    AND o.status <> 'cancelled';

  IF active_count > 0 THEN
    RAISE EXCEPTION
      'Bu ürün zaten aktif bir siparişte bulunuyor ve ikinci kez satılamaz.'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER order_items_one_active_order_per_product
  AFTER INSERT ON order_items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_product_not_in_active_order();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Rezervasyon süresi
-- ---------------------------------------------------------------------------
-- Rezerve ürünün bitiş zamanı olmalıdır; diğer durumlarda olmamalıdır.
-- Süresi geçmiş rezervasyonlar zamanlanmış görevle serbest bırakılır.

ALTER TABLE products
  ADD CONSTRAINT products_reserved_has_expiry
    CHECK (
      (status = 'reserved' AND reserved_until IS NOT NULL)
      OR (status <> 'reserved' AND reserved_until IS NULL)
    );
--> statement-breakpoint

CREATE INDEX products_reservation_expiry_idx
  ON products (reserved_until)
  WHERE status = 'reserved';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- İletişim mesajı denetim izi
-- ---------------------------------------------------------------------------

ALTER TABLE contact_messages
  ADD CONSTRAINT contact_messages_read_consistency
    CHECK (
      (is_read AND read_at IS NOT NULL)
      OR (NOT is_read AND read_at IS NULL)
    ),
  ADD CONSTRAINT contact_messages_reply_consistency
    CHECK (
      (reply_note IS NULL AND replied_at IS NULL)
      OR (reply_note IS NOT NULL AND replied_at IS NOT NULL)
    );
--> statement-breakpoint
