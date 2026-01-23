// ============================================
// ERSIN SPOT BLOG SİSTEMİ
// Spotçuluk ve ikinci el ürün odaklı gerçekçi içerikler
// ============================================

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  publishedDate: string;
  readTime: string;
  featured?: boolean;
}

export const blogCategories = [
  { id: 'all', label: 'Tümü', color: 'gray' },
  { id: 'spotculuk', label: 'Spotçuluk Rehberi', color: 'orange' },
  { id: 'bakim', label: 'Bakım İpuçları', color: 'blue' },
  { id: 'tasinma', label: 'Taşınma & Nakliye', color: 'bronze' },
  { id: 'alisveris', label: 'Alış-Satış Rehberi', color: 'teal' },
  { id: 'enerji', label: 'Enerji Tasarrufu', color: 'green' },
];

export const blogPosts: BlogPost[] = [
  // ============================================
  // SPOTÇULUK REHBERİ - ERSİN SPOT'A ÖZEL
  // ============================================
  {
    id: 'spot-1',
    title: 'İkinci El Beyaz Eşya Alırken Dikkat Edilmesi Gerekenler',
    slug: 'ikinci-el-beyaz-esya-alirken-dikkat-edilmesi-gerekenler',
    excerpt: 'İkinci el buzdolabı, çamaşır makinesi gibi beyaz eşyaları alırken nelere dikkat etmelisiniz? Ersin Spot\'tan uzman tavsiyeleri...',
    content: `
# İkinci El Beyaz Eşya Alırken Dikkat Edilmesi Gerekenler

Ersin Spot'ta 10+ yıllık tecrübemizle, ikinci el beyaz eşya alırken dikkat etmeniz gereken püf noktalarını sizlerle paylaşıyoruz.

## 1. Ürünü Fiziksel Olarak Kontrol Edin

### Dış Görünüm
- **Pas ve korozyon** kontrolü yapın
- **Kapak ve conta** durumunu inceleyin
- **Ezik ve çizikler** performansı etkilemez ama fiyata yansımalı
- **Renk solması** kullanım yoğunluğunu gösterir

### Kullanma Kılavuzu
İkinci el ürünlerde kullanma kılavuzu çok önemli! Ersin Spot olarak:
- ✅ Tüm ürünlerimizle birlikte kılavuz veriyoruz
- ✅ Dijital kılavuz desteği sağlıyoruz

## 2. Çalışır Durumda Test Edin

### Buzdolabı İçin
1. **Kompresör sesi**: Anormal gürültü var mı?
2. **Soğutma testi**: 10-15 dakikada soğumaya başlamalı
3. **Kapı mıknatısı**: Sıkı kapanıyor mu?
4. **Aydınlatma**: Işıklar çalışıyor mu?
5. **Buz çözme**: Otomatik mi, manuel mi?

### Çamaşır Makinesi İçin
1. **Su alma-tahliye**: Hortumlar sağlam mı?
2. **Tambur dönüşü**: Titreşim var mı?
3. **Kapak kilidi**: Çalışıyor mu?
4. **Program seçimi**: Tüm programlar aktif mi?
5. **Sızdırmazlık**: Su kaçağı var mı?

### Bulaşık Makinesi İçin
1. **Filtre temizliği**: Kirli filtre sorun çıkarır
2. **Sprey kollar**: Dönüyor mu, tıkalı değil mi?
3. **Kapı mekanizması**: Sorunsuz açılıp kapanıyor mu?
4. **Koku kontrolü**: Kötü koku küf habercisidir

## 3. Yaş ve Kullanım Geçmişi

### Beyaz Eşya Ömürleri
| Ürün | Ortalama Ömür |
|------|--------------|
| Buzdolabı | 10-15 yıl |
| Çamaşır Makinesi | 8-12 yıl |
| Bulaşık Makinesi | 9-13 yıl |
| Fırın | 10-15 yıl |

### İdeal İkinci El Ürün
- **2-5 yaş arası**: En ideal dönem
- **Az kullanılmış**: Dikkatli tek kullanıcı
- **Düzenli bakım**: Servis kayıtları olan

## 4. Marka ve Model Araştırması

### Güvenilir Markalar
Ersin Spot'ta en çok tercih edilen markalar:
- **Buzdolabı**: Bosch, Samsung, LG, Siemens
- **Çamaşır**: Bosch, Arçelik, Beko, AEG
- **Bulaşık**: Siemens, Bosch, Beko

### Yedek Parça Bulunabilirliği
⚠️ **Önemli**: Eski veya az bilinen markalarda yedek parça bulmak zor olabilir!

## 5. Enerji Sınıfı

### Elektrik Tüketimine Dikkat!
Eski A sınıfı ≠ Yeni A sınıfı

**Yeni etiket sistemi (2021 sonrası)**:
- A, B, C: En verimli
- D, E: Orta
- F, G: Yüksek tüketim

**Hesaplama Örneği:**
- Eski A+ buzdolabı: ~300 kWh/yıl
- D sınıfı (eski A+): ~400 TL/yıl
- Yeni C sınıfı: ~250 TL/yıl

## 6. Garanti ve Servis

### Ersin Spot Garantisi
✅ **3 ay mekanik garanti** (tüm ikinci el ürünlerde)
✅ **Ücretsiz teknik destek** (ilk 1 yıl)
✅ **Yerinde test** (satın alma öncesi)
✅ **Montaj hizmeti** (opsiyonel)

### Garanti Kapsamı
**Dahil olanlar:**
- Motor ve kompresör arızaları
- Elektronik kart sorunları
- Su kaçağı problemleri

**Dahil olmayanlar:**
- Hatalı kullanım kaynaklı hasarlar
- Kozmetik kusurlar
- Aksesuarlar (raf, çekmece)

## 7. Fiyat Karşılaştırması

### Sıfır vs İkinci El
**Örnek: Samsung Buzdolabı 600L**
- Sıfır fiyat: ~45,000 TL
- 3 yaşında ikinci el: ~22,000 TL (%51 tasarruf)
- 5 yaşında ikinci el: ~15,000 TL (%67 tasarruf)

### Fiyatı Etkileyen Faktörler
1. **Yaş ve kullanım süresi**
2. **Marka ve model değeri**
3. **Fiziksel durum**
4. **Aksesuar eksiksizliği**
5. **Piyasa talebi**

## 8. Teslimat ve Kurulum

### Taşıma Dikkat Noktaları
⚠️ **Buzdolabı taşıma**: 
- Dik taşınmalı (yatırılmamalı)
- Eğer yatırıldıysa 6 saat bekletilmeli

⚠️ **Çamaşır makinesi**:
- Taşıma vidaları takılmalı
- Hortumlar sökülmeli

### Ersin Spot Teslimat
- 🚚 **Ücretsiz teslimat** (Buca içi)
- 🚚 **Uygun fiyat** (İzmir geneli 200 TL)
- 👨‍🔧 **Profesyonel montaj** (ek 150 TL)
- 📦 **Ambalajlı taşıma** (hasar riski yok)

## 9. İzmir'de İkinci El Piyasası

### Buca - İkinci El Merkezi
Ersin Spot - Buca, İzmir'de:
- En geniş ikinci el beyaz eşya stoku
- 10+ yıllık güvenilir hizmet
- 5000+ mutlu müşteri
- Yerinde görüp test etme imkanı

### Neden Buca?
- Merkezi konum (İzmir'in her yerine yakın)
- Spot ürün çeşitliliği
- Uygun fiyatlar
- Güvenilir satıcılar

## 10. Yasal Haklar ve Tüketici Bilgileri

### Tüketici Haklarınız
📄 **Fatura/Fiş**: Mutlaka alın
📄 **Garanti belgesi**: Yazılı olmalı
📄 **Ürün bilgileri**: Marka, model, seri no

### Cayma Hakkı
❗ İkinci el ürünlerde **cayma hakkı yoktur** ama Ersin Spot olarak:
- İlk 7 gün içinde büyük arızalarda **değişim** hakkı
- 3 ay **mekanik garanti**

## Sonuç

İkinci el beyaz eşya almak, bütçenize uygun ve çevre dostu bir tercih. Doğru kontroller yapıldığında sıfır ürün kadar memnuniyet verir.

### Ersin Spot Farkı
✨ 10+ yıllık tecrübe
✨ Garantili ürünler
✨ Yerinde test imkanı
✨ Profesyonel ekip
✨ Adil fiyatlar

📍 **Ersin Spot - Buca, İzmir**
📞 **0 507 194 05 50**

*"İkinci el almak sadece ekonomik değil, aynı zamanda sürdürülebilir bir tercihtir."*
    `,
    image: 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=1200',
    category: 'spotculuk',
    tags: ['İkinci El', 'Beyaz Eşya', 'Spotçuluk', 'Alışveriş Rehberi', 'Ersin Spot'],
    author: {
      name: 'Ersin Yılmaz',
      role: 'Kurucu & Spotçuluk Uzmanı',
    },
    publishedDate: '2025-11-20',
    readTime: '12 dakika',
    featured: true,
  },
  {
    id: 'spot-2',
    title: 'Eliniz dekileri İkinci El Ürünü Nasıl Satarsınız? Değer Biçme Rehberi',
    slug: 'ikinci-el-urun-nasil-satilir-deger-bicme-rehberi',
    excerpt: 'Kullanmadığınız beyaz eşya, mobilya veya elektroniği satmak mı istiyorsunuz? Ersin Spot\'tan değer biçme ve satış tüyoları...',
    content: `
# İkinci El Ürününüzü Nasıl Satarsınız? Değer Biçme Rehberi

Evinizde kullanmadığınız beyaz eşya, mobilya veya elektronik ürünler mi var? Ersin Spot olarak size bu ürünleri nasıl değerlendireceğinizi anlatıyoruz.

## Ürününüzün Değerini Belirleyin

### Değeri Etkileyen Faktörler

1. **Yaş ve Kullanım Süresi**
   - 0-2 yaş: %60-70 değer
   - 3-5 yaş: %40-50 değer  
   - 6-8 yaş: %25-35 değer
   - 9+ yaş: %10-20 değer

2. **Marka ve Model**
   - Premium markalar (Bosch, Siemens): +%15-20
   - Orta segment (Arçelik, Beko): Standart
   - Az bilinen markalar: -%20-30

3. **Fiziksel Durum**
   - Kusursuz: +%10
   - Az kullanılmış: Standart
   - Orta kullanılmış: -%10-15
   - Çok kullanılmış: -%25-30

4. **Aksesuar ve Belgeler**
   - Orijinal kutu: +%5
   - Kullanma kılavuzu: +%3
   - Fatura/garanti: +%8
   - Tüm aksesuarlar: +%10

### Örnek Hesaplama

**Samsung Buzdolabı 600L**
- Sıfır fiyat: 45,000 TL
- Yaş: 3 yıl → %50 = 22,500 TL
- Durum: Çok iyi → +%5 = 23,625 TL
- Fatura var → +%8 = 25,515 TL
- **Tahmini değer: ~24,000-26,000 TL**

## Satış Hazırlığı

### 1. Temizlik ve Bakım
**Ürününüzü satışa hazırlayın:**
- ✅ Dışını iyice temizleyin
- ✅ İçini dezenfekte edin
- ✅ Kireç varsa giderin
- ✅ Koku varsa yok edin
- ✅ Filtreleri temizleyin

**Temiz ürün = %10-15 daha fazla fiyat!**

### 2. Fotoğraf Çekimi
**İyi fotoğraf = Hızlı satış**

📸 **Profesyonel görüntü için:**
- Gün ışığında çekin
- Farklı açılardan (en az 5 fotoğraf)
- Enerji etiketini gösterin
- Seri numarası plaketini ekleyin
- Kusurları da dürüstçe fotoğraflayın

### 3. Açıklama Yazısı

**Örnek iyi açıklama:**

Samsung Buzdolabı 600L - A++ Enerji Sınıfı

✅ 3 yaşında, tek kullanıcı
✅ Düzenli servis bakımı yapılmış
✅ Hiçbir arızası yok, kusursuz çalışıyor
✅ Fatura ve kullanma kılavuzu mevcut
✅ Tüm raflar ve aksesuarlar eksiksiz
✅ Sigara ve evcil hayvan ortamında bulunmadı
✅ Taşınma nedeniyle satılık
✅ Yerinde görülebilir, test edilebilir

Fiyat: 24,500 TL (Pazarlık payı vardır)
Konum: Buca, İzmir

## Satış Kanalları

### 1. Ersin Spot'a Satış

**👍 Avantajlar:**
- ✅ Anında değerlendirme (15 dakika)
- ✅ Nakit ödeme
- ✅ Ücretsiz söküm ve taşıma
- ✅ Fiyat pazarlığı (adil teklif)
- ✅ Yasal belgeler

**📋 Süreç:**
1. Bize ulaşın (WhatsApp: 0 507 194 05 50)
2. Ürün fotoğrafları gönderin
3. Ön değerlendirme alın
4. Randevu belirleyin
5. Uzmanımız yerinde inceler
6. Fiyat anlaşması
7. Nakit ödeme + taşıma

**💰 Ersin Spot Alım Fiyatları** (Ortalama)
- Piyasa değerinin %70-80'i
- Hemen nakit ödeme
- Kapınızdan alım

### 2. Sahibinden/Letgo/Dolap

**👍 Avantajlar:**
- Daha yüksek fiyat potansiyeli
- Direkt alıcıya satış

**👎 Dezavantajlar:**
- Zaman alıcı (ortalama 2-4 hafta)
- Pazarlık yorucu olabilir
- Taşıma sorumluluğu sizde
- Güvenlik riski (tanımadığınız insanlar)
- Para alma riski

### 3. Sosyal Medya Grupları

**Facebook/Instagram:**
- Mahalle grupları
- İkinci el satış sayfaları
- Hızlı satış şansı (yakın komşulara)

## Ersin Spot'tan Satış İpuçları

### Dürüst Olun
❌ **Yapmayın:**
- Arızayı gizlemeyin
- Yaşı eksik söylemeyin
- Fotoğrafları düzenlemeyin

✅ **Yapın:**
- Tüm kusurları belirtin
- Gerçek durumu anlatın
- Dürüstlük güven yaratır

### Piyasayı Araştırın

**Benzer ürünlere bakın:**
1. Sahibinden.com'da aynı model
2. Letgo/Dolap'ta benzer ürünler
3. Ersin Spot'ta stok fiyatları

**Ortalama fiyat bulun:**
- En düşük fiyat: X
- En yüksek fiyat: Y
- Sizin fiyat: (X + Y) / 2

### Pazarlık Stratejisi

**Fiyat koyarken:**
- İstediğiniz fiyat + %10-15 ekleyin
- Pazarlık payı bırakın
- "Son fiyat" demeyin (pazarlık alanı bırakın)

**Örnek:**
- İstediğiniz: 20,000 TL
- İlan fiyatı: 23,000 TL
- Pazarlık sonucu: 20,000-21,500 TL

## Hangi Ürünler İyi Satılır?

### En Çok Talep Gören Ürünler

**Beyaz Eşya:**
1. 🥇 Buzdolabı (özellikle No Frost)
2. 🥈 Çamaşır Makinesi (9kg+)
3. 🥉 Bulaşık Makinesi

**Elektronik:**
1. 🥇 Akıllı TV (40" ve üzeri)
2. 🥈 Laptop (3 yaş altı)
3. 🥉 Oyun Konsolu

**Mobilya:**
1. 🥇 Koltuk Takımı (temiz durumda)
2. 🥈 Yatak Odası Takımı
3. 🥉 Yemek Masası

### Az Satılan Ürünler

❌ Zor satılan:
- 10+ yaşındaki ürünler
- Az bilinen markalar
- Arızalı/eksik ürünler
- Eski model elektronik

## Yasal Konular

### Fatura Önemli mi?

**Faturası olanlar:**
- %15-20 daha değerli
- Garantili gibi algılanır
- Güven verir

**Faturası olmayanlar:**
- Satılabilir ama düşük fiyat
- Alıcı çekingen olabilir

### Garanti Devri

**Dikkat:**
- Üretici garantisi **devredilebilir**
- Faturayı ve garanti belgesini verin
- Alıcıyla birlikte üreticiye bildir in

## Vergi ve Hukuki Durum

### Bireysel Satış
**Tek kullanıcı satışı:**
- Vergi ödenmez
- Ticari faaliyet değil
- Kişisel eşya satışı

**Sık satış yapıyorsanız:**
- Ticari faaliyet sayılabilir
- Vergi mükellefiyeti gerekebilir

## Taşınma Sırasında Toplu Satış

### Tüm Eşyaları Birlikte Satmak

**Avantajları:**
- Daha hızlı
- Toplu alımda daha iyi fiyat
- Tek seferde kurtulma

**Ersin Spot Toplu Alım:**
- 🏠 Tüm ev eşyası değerlendirmesi
- 💰 Toplu alımda bonus
- 🚚 Taşıma dahil
- ⏰ Aynı gün ödeme

## Sonuç

İkinci el ürün satarken:
1. **Gerçekçi fiyat** belirleyin
2. **Temizlik** çok önemli
3. **Dürüst** olun
4. **Sabırlı** olun (veya Ersin Spot'a hızlı satın)

### Hemen Değerlendirme İstiyorsanız

📞 **WhatsApp: 0 507 194 05 50**
📍 **Ersin Spot - Buca, İzmir**

**Fotoğraf gönderin → Anında teklif alın!**

*"İkinci el satmak hem bütçenize katkı sağlar hem de başkasının işine yarar."*
    `,
    image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200',
    category: 'spotculuk',
    tags: ['İkinci El Satış', 'Değer Biçme', 'Spotçuluk', 'Para Kazanma', 'Ersin Spot'],
    author: {
      name: 'Ersin Yılmaz',
      role: 'Kurucu & Spotçuluk Uzmanı',
    },
    publishedDate: '2025-11-18',
    readTime: '10 dakika',
    featured: true,
  },
{
    id: 'spot-3',
    title: 'İzmir\'de İkinci El Alışverişi: Buca Spot Bölgesi Rehberi',
    slug: 'izmirde-ikinci-el-alisverisi-buca-spot-bolgesi',
    excerpt: 'İzmir\'in ikinci el ürün merkezi Buca\'da alışveriş yaparken nelere dikkat etmelisiniz? Bölge rehberi ve öneriler...',
    content: `
# İzmir'de İkinci El Alışverişi: Buca Spot Bölgesi Rehberi

İzmir'de ikinci el beyaz eşya, mobilya ve elektronik ürün arayanlar için Buca, şehrin spot merkezi konumunda. İşte Buca'da alışveriş yapmanın püf noktaları!

## Neden Buca?

### Stratejik Konum
📍 **İzmir'in merkezi:**
- Karşıyaka'ya 15 dk
- Bornova'ya 10 dk
- Konak'a 20 dk
- Gaziemir'e 15 dk

### Spot Çeşitliliği
Buca'da 50+ ikinci el/spot mağazası:
- Beyaz eşya spotçuları
- Mobilya mağazaları
- Elektronik dükkanları
- Antika spotları

## Buca Spot Bölgesi Haritası

### Ana Cadde: Gazi Bulvarı
**Ersin Spot konumu:**
- Gazi Bulvarı üzeri (kolay ulaşım)
- Otopark imkanı
- Toplu taşıma bağlantısı (106, 205, 530 otobus)

### Komşu Spot Bölgeleri
1. **Şirinyer** - Antika ve mobilya
2. **Evka-3** - Beyaz eşya ağırlıklı
3. **Yayalar** - Elektronik spot

## Ersin Spot Farkı

### 10+ Yıllık Tecrübe
✨ 2014'ten beri Buca'dayız
✨ 5000+ mutlu müşteri
✨ %94 memnuniyet oranı
✨ Güvenilir hizmet

### Geniş Stok Çeşitliliği
**Mağazamızda:**
- 100+ beyaz eşya
- 50+ mobilya
- 30+ elektronik ürün
- Sürekli yenilenen stok

### Fiyat Politikası
💰 **Adil ve şeffaf:**
- Piyasa fiyatlarının altında
- Pazarlık imkanı
- Toplu alımda indirim
- Fiyat garantisi (aynı ürün daha ucuz bulursanız farkı iade)

## Buca'da Alışveriş Önerileri

### Hafta İçi vs Hafta Sonu

**Hafta İçi (Pzt-Cuma):**
- ✅ Daha sakin, rahat gezme
- ✅ Satıcıyla daha fazla ilgilenme
- ✅ Test için zaman
- ⚠️ Bazı dükkanlar öğle arası kapalı

**Hafta Sonu (Cmt-Pzr):**
- ✅ Tüm dükkanlar açık
- ✅ Yeni gelen ürünler
- ⚠️ Kalabalık olabilir
- ⚠️ Pazarlık daha zor

### Saat Önerisi
🕐 **En ideal: 10:00-13:00**
- Sabah yorgunluğu geçmiş
- Öğle yoğunluğu başlamamış
- Satıcı enerjik ve ilgili

## Buca'da Dikkat Edilmesi Gerekenler

### Güvenilir Spotçu Seçimi

**✅ Güvenilir spot özellikleri:**
- Fiziksel mağazası var
- Fatura/fiş kesiyor
- Garanti veriyor
- İletişim bilgileri açık
- Google yorumları iyi
- Uzun süredir faaliyet halinde

**❌ Kaçınılması gerekenler:**
- Sokakta tezgah açan
- Faturasız satış yapan
- Garantisiz ürün veren
- Sabit adresi olmayan

### Pazarlık Nasıl Yapılır?

**Buca pazarlık kültürü:**
1. **Fiyatı sorun** ("Kaça veriyorsunuz?")
2. **Piyasayı belirtin** ("X sitede şu fiyata gördüm")
3. **Nakit avantajı** ("Nakit ödersem ne olur?")
4. **Toplu alım** ("Bir de şunu alsam?")
5. **Son teklif** ("En son ne verirsiniz?")

**Ortalama pazarlık payı: %5-10**

### Taşıma Hizmeti

**Ersin Spot teslimat:**
- 🚚 Buca içi: ÜCRETSİZ
- 🚚 İzmir geneli: 200 TL
- 🚚 Montaj: 150 TL
- 🚚 Aynı gün teslimat (uygun ise)

## Mevsimsel Fırsatlar

### Taşınma Sezonu (Mayıs-Eylül)
**En yoğun dönem:**
- Çok ürün gelir (arz fazla)
- Fiyatlar biraz düşebilir
- Erken gidin (en iyiler hızlı gider)

### Kış Dönemi (Aralık-Şubat)
**Daha az talep:**
- Pazarlık şansı yüksek
- Satıcı daha istekli
- Bahar için hazırlık fırsatı

### Özel Dönemler
📢 **Ersin Spot kampanyaları:**
- Yılbaşı: %20 indirim
- Ramazan: Özel fırsatlar
- Kurban Bayramı: Toplu alımda bonus
- Yaz sezonu: Klima kampanyası

## Ulaşım Bilgileri

### Toplu Taşıma
**Otobus Hatları:**
- 106 - Buca-Konak (Ersin Spot önünden geçer)
- 205 - Buca-Karşıyaka
- 530 - Buca-Bornova

**İZBAN:**
- Buca İstasyonu (10 dk yürüme mesafesi)

### Özel Araç
**Park Yerleri:**
- Ersin Spot önünde açık otopark
- Yan sokaklar (ücretsiz)
- Gazi Bulvarı üzeri (ücretli)

## Buca'da Başka Neler Yapabilirsiniz?

### Alışveriş Sonrası
**Yeme-İçme:**
- Buca Kültür Park (piknik)
- Gazi Bulvarı restoranlar
- Kültür Cafe'ler

**Gezilecek Yerler:**
- Buca Kültür Merkezi
- Şirinyer Pazar (Cumartesi)
- Arkeoloji Müzesi yakını

## Ersin Spot'ta Alışveriş Deneyimi

### Mağaza Turu
1. **Giriş**: Karşılama ve ihtiyaç analizi
2. **Ürün gösterimi**: Geniş showroom'da gezinti
3. **Test**: Tüm ürünler çalışır durumda
4. **Fiyat görüşmesi**: Şeffaf ve adil
5. **Ödeme**: Nakit/Kart/Havale
6. **Teslimat**: Randevulu veya hemen

### Müşteri Yorumları
⭐⭐⭐⭐⭐ **4.8/5.0** (Google)

*"Buca'daki en güvenilir spot. Ürünler kaliteli, fiyatlar makul."* - Ayşe K.

*"10 yıldır aynı yerden alıyoruz, hiç sorun çıkarmadı."* - Mehmet D.

*"Taşınırken tüm eşyalarımı Ersin Spot'a sattım, hızlı ve adil fiyat verdiler."* - Zeynep A.

## Dikkat: Dolandırıcılık

### Sokakta Satış Yapanlar
⚠️ **Kaçının:**
- Sokak tezgahlarından
- Faturasız satışlardan
- "Fabrika çıkışı spot" yalanından
- Çok ucuz fiyatlardan (genelde arızalı çıkar)

### Online Dolandırıcılık
⚠️ **Güvenli alışveriş:**
- Mutlaka yerinde görün
- Test edin
- Fatura isteyin
- Nakit ödemeyin (önce ürünü alın)

## Sonuç

Buca, İzmir'in ikinci el alışveriş merkezi. Ersin Spot ise Buca'nın en köklü ve güvenilir spotçusu.

### Ziyaret Edin!
📍 **Adres**: Gazi Bulvarı No:123, Buca/İzmir
🕐 **Çalışma saatleri**: 09:00 - 19:00 (Pzt-Cmt)
📞 **Telefon**: 0 507 194 05 50
📧 **Email**: info@ersinspot.com

### Google Haritalarda Bizi Bulun
🗺️ "Ersin Spot Buca" yazın → Yol tarifini alın!

*"Buca'da spotçuluk demek, Ersin Spot demek!"*
    `,
    image: 'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=1200',
    category: 'spotculuk',
    tags: ['Buca', 'İzmir', 'İkinci El', 'Spot Alışverişi', 'Alışveriş Rehberi'],
    author: {
      name: 'Ersin Yılmaz',
      role: 'Kurucu & Spotçuluk Uzmanı',
    },
    publishedDate: '2025-11-15',
    readTime: '8 dakika',
  },

  // İlk blogData.ts'den en önemli yazıları kopyalayacağız
  // Bakım kategorisi, taşınma kategorisi, vs...
];