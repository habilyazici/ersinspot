/**
 * Şema birleştirici.
 *
 * Drizzle Kit migration üretirken yalnızca bu dosyayı okur. Her modül kendi
 * tablolarını `modules/<ad>/infrastructure/schema.ts` içinde tanımlar; burada
 * yalnızca yeniden dışa aktarılırlar.
 *
 * ÖNEMLİ: Bu dosya modüllerin iç dosyalarına eriştiği için modül sınırı kuralının
 * bilinçli istisnasıdır. Sebep teknik: Drizzle'ın tek bir şema giriş noktasına
 * ihtiyacı var. Bu istisna yalnızca burada geçerlidir; iş kodu tabloları
 * doğrudan içe aktaramaz.
 */

export * from './enums.ts';

export * from '../../modules/identity/infrastructure/schema.ts';
export * from '../../modules/catalog/infrastructure/schema.ts';
export * from '../../modules/ordering/infrastructure/schema.ts';
export * from '../../modules/servicing/infrastructure/schema.ts';
export * from '../../modules/content/infrastructure/schema.ts';

export * from './relations.ts';
