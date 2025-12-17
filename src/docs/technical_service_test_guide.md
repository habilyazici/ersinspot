# Teknik Servis Randevu Sistemi - Test Rehberi

## 🎯 Sistem Özeti

Ersin Spot'un teknik servis randevu sistemi, müşterilerin beyaz eşya ve elektronik cihazları için online randevu almasını sağlar. Sistem 5 adımlı bir form, fotoğraf yükleme, fiyat teklifi ve onay süreçlerini içerir.

## ✅ Ön Gereksinimler

### 1. Supabase Veritabanı Hazırlığı

SQL Schema'yı çalıştırın (zaten yapıldı):
```sql
-- /docs/technical_service_schema.sql dosyasını Supabase SQL Editor'de çalıştırın
```

Tablolar:
- ✅ `technical_service_requests`
- ✅ `technical_service_photos`
- ✅ `technical_service_updates`

### 2. Storage Bucket

Sistem otomatik olarak `make-0f4d2485-technical-service` bucket'ını oluşturur (public).

## 🧪 Test Senaryoları

### Senaryo 1: Yeni Randevu Oluşturma (Müşteri)

#### Adım 1: Giriş Yap
1. `/giris` sayfasından mevcut bir müşteri hesabıyla giriş yapın
2. Eğer hesap yoksa: `/kayit` sayfasından kayıt olun

#### Adım 2: Randevu Formunu Doldur
1. Ana sayfadan "Teknik Servis" butonuna tıklayın → `/teknik-servis`
2. **Adım 1 - Cihaz Bilgileri:**
   - Cihaz Türü: Örn. "Çamaşır Makinesi"
   - Marka: Örn. "Samsung"
   - Model: Örn. "WW90" (opsiyonel)
   - Garanti Durumu: Seçiniz
   - Sorun Kategorisi: Seçiniz
   - Sorun Açıklaması: Detaylı açıklama yazın
   - "İleri" butonuna tıklayın

3. **Adım 2 - Fotoğraf Yükleme (Opsiyonel):**
   - Dosya seç butonuna tıklayın
   - 1-10 arası fotoğraf seçin (PNG/JPG)
   - Fotoğrafların yüklenmesini bekleyin
   - Console'da `[IMAGE UPLOAD]` loglarını kontrol edin
   - "İleri" butonuna tıklayın

4. **Adım 3 - Randevu Bilgileri:**
   - Tarih seçin (bugünden sonraki bir tarih)
   - Saat dilimi seçin
   - "İleri" butonuna tıklayın

5. **Adım 4 - İletişim Bilgileri:**
   - Bilgiler otomatik dolu olabilir (customer tablosundan)
   - Eksik alanları doldurun
   - Servis Adresi: Tam adres yazın
   - İlçe: Örn. "Buca"
   - Mahalle: Örn. "Kestel"
   - Sokak: Örn. "100. Yıl Mahallesi"
   - Bina No: Örn. "10"
   - Daire No: Örn. "5"
   - "İleri" butonuna tıklayın

6. **Adım 5 - Önizleme:**
   - Tüm bilgileri kontrol edin
   - Fotoğrafları görüntüleyin
   - "Talebimi Gönder" butonuna tıklayın

#### Beklenen Sonuçlar:
✅ Başarı sayfası görüntülenir
✅ Randevu numarası (örn: `TS-12345678`) gösterilir
✅ Console'da başarı mesajı: `[TECHNICAL SERVICE] ✅ Success response`
✅ Toast bildirimi: "Teknik servis talebiniz başarıyla oluşturuldu!"

#### Console Log Kontrolleri:
```
[IMAGE UPLOAD] 📤 Starting upload for X files
[IMAGE UPLOAD] ✅ All uploads completed. URLs: [...]
[TECHNICAL SERVICE] 📤 Sending request to backend: {...}
[TECHNICAL SERVICE] 📥 Response status: 200
[TECHNICAL SERVICE] ✅ Success response: {...}
```

---

### Senaryo 2: Randevularımı Görüntüleme (Müşteri)

1. `/hesabim/teknik-servis` sayfasına gidin
2. Oluşturduğunuz randevuyu listede görmelisiniz
3. Randevu kartında şunlar görünmeli:
   - Cihaz türü ve marka
   - Randevu numarası
   - Durum badge'i (İnceleniyor)
   - Tercih edilen tarih ve saat
   - Cihaz fotoğrafı (varsa)

4. "Detayları Gör" butonuna tıklayın
5. Detay sayfasında tüm bilgileri kontrol edin

#### Beklenen Sonuçlar:
✅ Randevu listesi yüklenir
✅ Fotoğraflar doğru gösterilir (kırık resim yok)
✅ Durum "İnceleniyor" olarak görünür
✅ Console'da: `[TECH SERVICE] Fetching technical service requests...`

---

### Senaryo 3: Fiyat Teklifi Verme (Admin)

1. Admin hesabıyla giriş yapın: `/admin/giris`
2. Yan menüden "Teknik Servis" sekmesine tıklayın
3. Yeni randevuyu "İnceleniyor" tabında görmelisiniz
4. "İşlem Yap" butonuna tıklayın
5. "Fiyat Teklifi Ver" seçin
6. Dialog'da:
   - Tahmini Fiyat: Örn. "500"
   - Admin Notu: Örn. "Çamaşır makinesi pompası değişecek"
   - "Teklif Gönder" butonuna tıklayın

#### Beklenen Sonuçlar:
✅ Toast: "Fiyat teklifi başarıyla gönderildi"
✅ Randevu "Teklif Verildi" tabına taşınır
✅ Tahmini fiyat görünür
✅ Console'da backend başarı mesajı

---

### Senaryo 4: Fiyat Teklifini Onaylama (Müşteri)

1. Müşteri hesabıyla `/hesabim/teknik-servis` sayfasına gidin
2. Randevunun durumu "Teklif Bekleniyor" olarak görünmeli
3. Tahmini fiyat gösterilmeli (500 ₺)
4. "Teklifi Onayla" butonuna tıklayın
5. Onay dialog'unda "Evet, Onayla" butonuna tıklayın

#### Beklenen Sonuçlar:
✅ Toast: "Fiyat teklifi onaylandı"
✅ Durum "Onaylandı" olarak değişir
✅ "Teklifi Onayla" butonu kaybolur
✅ Console'da: `PUT /technical-service/:id/respond` başarılı

---

### Senaryo 5: Talebi İptal Etme (Müşteri)

1. `/hesabim/teknik-servis` sayfasında bir randevu seçin
2. "İptal Et" butonuna tıklayın (kırmızı XCircle icon)
3. Onay dialog'unda iptal nedenini okuyun
4. "Evet, İptal Et" butonuna tıklayın

#### Beklenen Sonuçlar:
✅ Toast: "Randevu iptal edildi"
✅ Randevu durumu "İptal Edildi" olarak değişir
✅ Kart arka planı kırmızımsı olur

---

## 🐛 Yaygın Hatalar ve Çözümleri

### 1. Fotoğraflar yüklenmiyor
**Hata:** `Failed to upload image`
**Çözüm:** 
- Bucket'ın public olduğunu kontrol edin
- Console'da `[TECH SERVICE UPLOAD]` loglarını kontrol edin
- Dosya boyutunun 10MB'dan küçük olduğunu doğrulayın

### 2. "Unauthorized" hatası
**Hata:** `401 Unauthorized`
**Çözüm:**
- Kullanıcının giriş yaptığından emin olun
- `accessToken` değerinin var olduğunu kontrol edin
- Token'ın geçerli olduğunu doğrulayın

### 3. Adres alanları kaydedilmiyor
**Hata:** Adres bilgileri eksik
**Çözüm:**
- Frontend'de `serviceNeighborhood`, `serviceStreet` vb. alanların gönderildiğini kontrol edin
- Backend'de bu alanların insert işlemine dahil olduğunu doğrulayın

### 4. Fotoğraflar kırık görünüyor
**Hata:** Broken image icon
**Çözüm:**
- `ImageWithFallback` component'inin kullanıldığından emin olun
- Photo URL'lerinin doğru formatda olduğunu kontrol edin
- Bucket'ın public olduğunu doğrulayın

---

## 📊 Backend Endpoint'leri

### Müşteri Endpoint'leri
- `POST /make-server-0f4d2485/technical-service/request` - Yeni randevu oluştur
- `GET /make-server-0f4d2485/technical-service/my-requests` - Randevularımı getir
- `PUT /make-server-0f4d2485/technical-service/:id/respond` - Teklifi onayla/reddet
- `POST /make-server-0f4d2485/technical-service/:id/cancel` - Randevuyu iptal et
- `POST /make-server-0f4d2485/technical-service/upload-photo` - Fotoğraf yükle

### Admin Endpoint'leri
- `GET /make-server-0f4d2485/technical-service/admin/requests` - Tüm randevuları getir
- `PUT /make-server-0f4d2485/technical-service/admin/:id/quote` - Fiyat teklifi ver
- `PUT /make-server-0f4d2485/technical-service/admin/:id/complete` - Randevuyu tamamla
- `POST /make-server-0f4d2485/technical-service/admin/:id/cancel` - Randevuyu iptal et (admin)

---

## 🎨 UI Kontrol Listesi

### Müşteri Arayüzü
- ✅ 5 adımlı form düzgün çalışıyor
- ✅ Fotoğraf yükleme ve önizleme düzgün
- ✅ Başarı sayfası bilgilendirici
- ✅ Randevu listesi responsive
- ✅ Durum badge'leri renk kodlu
- ✅ İptal ve onay butonları çalışıyor

### Admin Arayüzü
- ✅ Randevu listesi tab'lara ayrılmış (Reviewing, Quoted, Approved, vb.)
- ✅ Fiyat teklifi dialog'u çalışıyor
- ✅ Detay görünümü eksiksiz
- ✅ Fotoğraflar düzgün gösteriliyor

---

## 📝 Notlar

- Tüm fotoğraflar Supabase Storage'da `make-0f4d2485-technical-service` bucket'ında saklanır
- Fotoğraflar public URL olarak döndürülür
- Request number formatı: `TS-{timestamp-son-8-digit}`
- Status değerleri: reviewing, quoted, approved, rejected, in_progress, completed, cancelled
- Tarih formatı: `yyyy-MM-dd`
- Saat formatı: "Sabah (09:00-12:00)", "Öğleden Sonra (13:00-17:00)", vb.

---

## 🚀 Sistem Hazır!

Tüm bu testler başarıyla tamamlandıysa, teknik servis randevu sistemi production-ready'dir! 🎉
