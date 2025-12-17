-- ========================================
-- TEKNİK SERVİS RANDEVU SİSTEMİ - SQL SCHEMA
-- Ersin Spot - Technical Service Management
-- ========================================

-- 1. Teknik Servis Talepleri Tablosu
CREATE TABLE IF NOT EXISTS technical_service_requests (
  id BIGSERIAL PRIMARY KEY,
  request_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Cihaz Bilgileri
  product_type VARCHAR(100) NOT NULL,
  product_brand VARCHAR(100) NOT NULL,
  product_model VARCHAR(100),
  purchase_date DATE,
  warranty_status VARCHAR(50),
  problem_description TEXT NOT NULL,
  problem_category VARCHAR(100),
  
  -- Randevu Bilgileri
  preferred_date DATE NOT NULL,
  preferred_time VARCHAR(20) NOT NULL,
  
  -- Adres Bilgileri
  service_address TEXT NOT NULL,
  service_city VARCHAR(100) DEFAULT 'İzmir',
  service_district VARCHAR(100) NOT NULL,
  service_neighborhood VARCHAR(100),
  service_street VARCHAR(200),
  service_building_no VARCHAR(20),
  service_apartment_no VARCHAR(20),
  
  -- Durum ve Fiyat
  status VARCHAR(50) DEFAULT 'reviewing' NOT NULL,
  estimated_price DECIMAL(10, 2),
  final_price DECIMAL(10, 2),
  
  -- Notlar
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Tarihler
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Index'ler için
  CONSTRAINT valid_status CHECK (
    status IN (
      'reviewing',    -- İnceleniyor
      'quoted',       -- Fiyat teklifi verildi
      'approved',     -- Müşteri onayladı
      'rejected',     -- Müşteri reddetti
      'in_progress',  -- İşlem devam ediyor
      'completed',    -- Tamamlandı
      'cancelled'     -- İptal edildi
    )
  )
);

-- 2. Teknik Servis Fotoğrafları Tablosu
CREATE TABLE IF NOT EXISTS technical_service_photos (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES technical_service_requests(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  photo_type VARCHAR(50) DEFAULT 'problem', -- problem, before, after, invoice
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Teknik Servis Güncelleme Geçmişi Tablosu
CREATE TABLE IF NOT EXISTS technical_service_updates (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES technical_service_requests(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  note TEXT,
  created_by VARCHAR(50) NOT NULL, -- admin, customer, system
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEX'LER
-- ========================================

-- Teknik servis talepleri için indexler
CREATE INDEX IF NOT EXISTS idx_tech_requests_customer_id ON technical_service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_tech_requests_user_id ON technical_service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tech_requests_status ON technical_service_requests(status);
CREATE INDEX IF NOT EXISTS idx_tech_requests_created_at ON technical_service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tech_requests_request_number ON technical_service_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_tech_requests_preferred_date ON technical_service_requests(preferred_date);

-- Fotoğraflar için index
CREATE INDEX IF NOT EXISTS idx_tech_photos_request_id ON technical_service_photos(request_id);

-- Güncellemeler için index
CREATE INDEX IF NOT EXISTS idx_tech_updates_request_id ON technical_service_updates(request_id);
CREATE INDEX IF NOT EXISTS idx_tech_updates_created_at ON technical_service_updates(created_at DESC);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- RLS'yi aktifleştir
ALTER TABLE technical_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_service_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_service_updates ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (gerekirse daha kısıtlayıcı yapılabilir)
CREATE POLICY "Allow public read access" ON technical_service_requests FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON technical_service_photos FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON technical_service_updates FOR SELECT USING (true);

-- Herkes insert edebilir (authenticated user kontrolü backend'de yapılıyor)
CREATE POLICY "Allow public insert access" ON technical_service_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON technical_service_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON technical_service_updates FOR INSERT WITH CHECK (true);

-- Herkes update edebilir (authenticated user kontrolü backend'de yapılıyor)
CREATE POLICY "Allow public update access" ON technical_service_requests FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON technical_service_photos FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON technical_service_updates FOR UPDATE USING (true);

-- ========================================
-- TRIGGER: updated_at otomatik güncelleme
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tech_requests_updated_at ON technical_service_requests;
CREATE TRIGGER update_tech_requests_updated_at
  BEFORE UPDATE ON technical_service_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- NOTLAR
-- ========================================

/*
STATUS DEĞERLERİ:
- reviewing: İlk talep alındığında, admin incelemesi bekleniyor
- quoted: Admin fiyat teklifi verdi, müşteri onayı bekleniyor
- approved: Müşteri fiyat teklifini onayladı, randevu planlanıyor
- rejected: Müşteri fiyat teklifini reddetti
- in_progress: Servis devam ediyor
- completed: Servis tamamlandı
- cancelled: Talep iptal edildi (admin veya müşteri tarafından)

PHOTO_TYPE DEĞERLERİ:
- problem: Sorun fotoğrafı (müşteri tarafından)
- before: İşlem öncesi (teknisyen tarafından)
- after: İşlem sonrası (teknisyen tarafından)
- invoice: Fatura/Dekont (admin tarafından)

CREATED_BY DEĞERLERİ:
- system: Sistem otomatik mesajları
- admin: Admin işlemleri
- customer: Müşteri işlemleri
*/
