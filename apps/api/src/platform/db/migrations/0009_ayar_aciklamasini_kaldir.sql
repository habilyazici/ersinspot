/*
  site_settings.description sütunu kaldırılıyor.

  Sütun, ayarın ne işe yaradığını anlatan metni tutuyordu. Aynı metin kodda da
  duruyor (`settings-service.ts` içindeki DEFAULT_SETTINGS) ve okuma yolu
  sütunu tercih ediyordu:

      description: row?.description ?? fallback.description

  Güncelleme sorgusunun `onConflictDoUpdate` kolu ise yalnızca değeri
  yazıyordu. Sonuç: bir ayarın açıklaması kodda düzeltildiğinde, kaydı daha
  önce oluşmuş kurulumlarda ESKİ metin görünmeye devam ediyordu ve bunu fark
  etmenin bir yolu yoktu.

  Metin kurulumdan kuruluma değişen bir veri değil, yazılımın kendisine ait bir
  açıklamadır; tek yeri koddur. Sütunla birlikte içindeki kopyalar da gider.
*/
ALTER TABLE "site_settings" DROP COLUMN "description";
