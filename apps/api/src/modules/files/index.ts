/**
 * files modülü — genel sözleşme.
 *
 * Sahip olduğu tablolar:
 *   uploaded_files
 *
 * Yükleme, depolama soyutlaması (yerelde disk, üretimde S3 uyumlu) ve yetim
 * dosya temizliği. Eski kod tabanında yükleme ve silme uçları tamamen
 * korumasızdı ve beş bucket'ın hepsi herkese açıktı — profil fotoğrafları ve
 * nakliye için çekilen ev içi fotoğrafları dahil.
 *
 * Planlanan sözleşme:
 *   attachFiles(storageKeys, tx)  — dosyaları bir kayda bağlar, yetim olmaktan çıkarır
 *   resolveUrl(storageKey)        — görüntüleme adresi üretir
 *   deleteFile(storageKey)        — sahiplik doğrulandıktan sonra siler
 */

export {};
