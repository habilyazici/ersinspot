## Ne değişti?

<!-- Değişikliği bir iki cümleyle özetleyin. -->

## Neden?

<!-- Hangi sorunu çözüyor veya hangi ihtiyacı karşılıyor? Varsa issue numarası. -->

## Nasıl test edildi?

<!-- Hangi senaryolar denendi? Otomatik test eklendiyse belirtin. -->

## Kontrol listesi

- [ ] `pnpm check` yerelde geçiyor (tip kontrolü + lint + testler)
- [ ] Yeni davranış için test eklendi
- [ ] Veritabanı değişikliği varsa migration üretildi ve geri alınabilir
- [ ] Kullanıcıya görünen metinler Türkçe ve anlaşılır
- [ ] Yeni bir uç nokta eklendiyse yetkilendirme middleware'i tanımlandı
- [ ] Yeni bir uç nokta eklendiyse onu çağıran bir ekran da var (bkz. MIMARI.md, Kural 8)
- [ ] Arayüzün kullanıcıya söylediği bir sınır varsa paylaşılan pakette tanımlı (Kural 7)
- [ ] Kişisel veri loglanmıyor
