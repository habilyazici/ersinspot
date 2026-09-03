-- Kullanılmayan `avatar` yükleme amacını kaldır.
--
-- Profil resmi diye bir özellik hiç yazılmadı: ne bir ekran, ne bir kayıt, ne
-- de bir bağlama akışı vardı. Buna karşılık `/api/uploads` ucu bu amacı kabul
-- ediyor, dosya diske yazılıyor ve hiçbir kayda bağlanamadığı için yetim
-- temizliği onu 24 saat sonra siliyordu — kullanıcıya "yükledim" denip
-- ertesi gün silinen bir dosya.
--
-- PostgreSQL bir numaralandırmadan değer düşürmeye izin vermez; tip yeniden
-- kurulur. Sütun geçici olarak metne çevrilir, tip yeniden oluşturulur ve
-- sütun geri döndürülür. Hiçbir satır `avatar` kullanmadığı için dönüşüm
-- kayıpsızdır.
--
-- Özellik yazıldığında değer yeni bir migration ile geri gelir.
ALTER TABLE "uploaded_files" ALTER COLUMN "purpose" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."upload_purpose";--> statement-breakpoint
CREATE TYPE "public"."upload_purpose" AS ENUM('product_image', 'request_photo', 'blog_cover');--> statement-breakpoint
ALTER TABLE "uploaded_files" ALTER COLUMN "purpose" SET DATA TYPE "public"."upload_purpose" USING "purpose"::"public"."upload_purpose";