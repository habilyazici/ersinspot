# 🎯 ERSİN SPOT SİSTEM HAZIRLAMA KONTROL LİSTESİ

## ✅ SİSTEM DURUMU: HAZIR!

Tüm modüller tamamlandı ve test edilmeye hazır. Aşağıdaki kontrol listesini takip ederek sisteminizi aktif hale getirebilirsiniz.

---

## 📋 SUPABASE KURULUMU

### 1️⃣ SQL Schema'yı Çalıştırın

**Önemli:** Tüm Postgres tabloları için SQL schema'yı çalıştırmanız gerekiyor.

**Adımlar:**
1. Supabase Dashboard'a gidin
2. Sol menüden **SQL Editor**'ü açın
3. `/docs/complete_database_schema.sql` dosyasının içeriğini kopyalayın
4. SQL Editor'e yapıştırın ve **RUN** butonuna tıklayın

**Bu şunları oluşturacak:**
- ✅ `customers` tablosu (müşteriler)
- ✅ `admins` tablosu (admin kullanıcıları)
- ✅ `technical_service_requests` (teknik servis talepleri)
- ✅ `technical_service_photos` (teknik servis fotoğrafları)
- ✅ `technical_service_updates` (teknik servis güncellemeleri)
- ✅ `moving_requests` (nakliye talepleri)
- ✅ `moving_request_items` (nakliye eşya listesi)
- ✅ `moving_request_photos` (nakliye fotoğrafları)
- ✅ `moving_appointments` (nakliye randevuları)
- ✅ Tüm index'ler ve RLS policy'leri

### 2️⃣ Storage Bucket'ları Kontrol Edin

Backend otomatik olarak şu bucket'ları oluşturur:
- `make-0f4d2485-products` (ürün fotoğrafları)
- `make-0f4d2485-profiles` (profil fotoğrafları)
- `make-0f4d2485-sell-requests` (satış talebi fotoğrafları)
- `make-0f4d2485-moving` (nakliye fotoğrafları)
- `make-0f4d2485-service-photos` (teknik servis fotoğrafları)

**Kontrol:**
1. Supabase Dashboard → **Storage**
2. Yukarıdaki bucket'ların oluşturulduğundan emin olun
3. Eğer yoksa, sistemi ilk kez kullandığınızda otomatik oluşacaklar

### 3️⃣ Environment Variables

Aşağıdaki environment variable'lar otomatik olarak Supabase'de mevcut:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_DB_URL`

---

## 🎨 SİSTEM YAPISI

### 🔐 Authentication Sistemi
- ✅ Supabase Auth entegrasyonu
- ✅ Müşteri hesapları (`customers` tablosu)
- ✅ Admin hesapları (`admins` tablosu)
- ✅ Otomatik email onaylama
- ✅ Password reset fonksiyonu

### 🛒 İkinci El Ürün Alım-Satım
- ✅ Ürün listeleme ve detay sayfaları
- ✅ Sepet sistemi (KV Store)
- ✅ Sipariş yönetimi (KV Store)
- ✅ Favoriler sistemi (KV Store)
- ✅ Ürün satış talepleri (KV Store)
- ✅ Admin ürün yönetimi
- ✅ Admin sipariş yönetimi
- ✅ Müşteri notu sistemi

### 🔧 Teknik Servis Randevu Sistemi
- ✅ Randevu oluşturma formu
- ✅ Fotoğraf yükleme (Supabase Storage)
- ✅ Adres detayları (mahalle, sokak, bina, daire)
- ✅ Admin fiyat teklifi verme
- ✅ Müşteri onay/red işlemi
- ✅ Durum takibi
- ✅ Güncelleme geçmişi

### 🚚 Nakliye Randevu Sistemi
- ✅ Nakliye talebi oluşturma
- ✅ Eşya listesi
- ✅ Fotoğraf yükleme
- ✅ Detaylı adres bilgileri
- ✅ Asansör bilgisi
- ✅ Admin fiyat teklifi
- ✅ Randevu planlama
- ✅ Durum takibi

### 👨‍💼 Admin Paneli
- ✅ Dashboard (istatistikler)
- ✅ Ürün yönetimi
- ✅ Sipariş yönetimi
- ✅ Satış talebi yönetimi
- ✅ Teknik servis yönetimi
- ✅ Nakliye yönetimi
- ✅ Hızlı erişim paneli

### 📱 Müşteri Paneli
- ✅ Profil yönetimi
- ✅ Siparişlerim
- ✅ Teknik servis taleplerim
- ✅ Nakliye taleplerim
- ✅ Favorilerim
- ✅ Satış taleplerim
- ✅ Raporlarım

---

## 🎨 TASARIM SİSTEMİ

### Ana Renkler
- **Turuncu:** `#f97316` (primary)
- **Lacivert:** `#1e3a8a` (secondary)

### Destek Renkleri
- **Bronze:** `#cd7f32`
- **Teal:** `#14b8a6`
- **Cream:** `#fef3c7`
- **Coral:** `#fb7185`
- **Gri Tonları:** `#f9fafb`, `#f3f4f6`, `#e5e7eb`

---

## 🚀 İLK KULLANIM ADIMLARİ

### 1. Admin Hesabı Oluşturma

**Seçenek A: Manuel (SQL ile)**
```sql
-- Önce Supabase Auth'da bir admin hesabı oluşturun
-- Sonra admins tablosuna ekleyin:
INSERT INTO admins (email, full_name, role)
VALUES ('admin@ersinspot.com', 'Admin', 'super_admin');
```

**Seçenek B: Backend Endpoint ile**
```bash
# /admin/setup sayfasını ziyaret edin
# Form ile admin hesabı oluşturun
```

### 2. İlk Müşteri Kaydı
- Ana sayfadan **Kayıt Ol** butonuna tıklayın
- Email ve şifre ile kaydolun
- Otomatik olarak `customers` tablosuna eklenecek

### 3. Test Senaryoları

**Müşteri Tarafı:**
1. Kayıt ol / Giriş yap
2. Ürünlere göz at
3. Favorilere ekle
4. Sepete ekle ve sipariş ver
5. Teknik servis talebi oluştur (fotoğraf yükle)
6. Nakliye talebi oluştur (eşya listesi ekle)
7. Profil bilgilerini güncelle

**Admin Tarafı:**
1. `/admin/giris` sayfasından giriş yap
2. Dashboard'dan genel bakış
3. Yeni sipariş oluştur
4. Teknik servis talebine fiyat teklifi ver
5. Nakliye talebine fiyat teklifi ver
6. Ürün ekle/düzenle/sil

---

## 🔍 SORUN GİDERME

### Hata: "service_apartment_no column not found"
**Çözüm:** `/docs/complete_database_schema.sql` dosyasını Supabase SQL Editor'de çalıştırın.

### Hata: "Failed to fetch favorites"
**Çözüm:** Favoriler sistemi KV Store kullanıyor, backend otomatik olarak hataları yönetiyor. Eğer hata devam ederse console'u kontrol edin.

### Hata: "Bucket not found"
**Çözüm:** Backend ilk kullanımda otomatik olarak bucket'ları oluşturur. Eğer hata devam ederse Supabase Storage'ı manuel olarak kontrol edin.

### Hata: "Customer not found"
**Çözüm:** Kullanıcı giriş yaptığında otomatik olarak `customers` tablosuna eklenir. Eğer sorun devam ederse, manuel olarak ekleyin:
```sql
INSERT INTO customers (email, full_name)
VALUES ('kullanici@email.com', 'Kullanıcı Adı');
```

---

## 📊 VERİ AKIŞI

### Hibrit Yaklaşım
**KV Store (Mevcut Sistem):**
- Ürünler (`product:*`)
- Siparişler (`order:*`)
- Satış talepleri (`sell_request:*`)
- Favoriler (`favorites:{user_id}`)
- Sepet verileri (`cart:*`)

**Postgres (Yeni Sistem):**
- Müşteriler (`customers`)
- Adminler (`admins`)
- Teknik servis (`technical_service_*`)
- Nakliye (`moving_*`)

---

## ✅ SON KONTROL

Sistemi kullanmaya başlamadan önce:

- [ ] SQL schema çalıştırıldı mı?
- [ ] En az bir admin hesabı var mı?
- [ ] Backend çalışıyor mu?
- [ ] Storage bucket'ları mevcut mu?
- [ ] Test müşteri hesabı oluşturuldu mu?

**Hepsi tamamsa → SİSTEM HAZIR! 🎉**

---

## 📞 DESTEK

Sorun yaşarsanız:
1. Console loglarını kontrol edin
2. Supabase Dashboard'dan tablo yapılarını doğrulayın
3. Backend loglarını inceleyin
4. SQL schema'nın tamamen çalıştığından emin olun

**Not:** Sistem tamamen hibrit yapıda çalışıyor. Eski veriler KV Store'da kalırken, yeni özellikler Postgres kullanıyor. Bu sayede mevcut veriler korunuyor ve yeni özellikler sorunsuz ekleniyor.
