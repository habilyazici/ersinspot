-- Olay damgası artık işlemin değil, olayın anını taşıyor.
--
-- `defaultNow()` PostgreSQL'de `now()` üretir ve `now()` İŞLEMİN BAŞLADIĞI anı
-- döndürür: bir işlem boyunca sabittir. Aynı işlemde iki olay yazıldığında
-- ikisi de birbirinin aynısı bir damga alıyordu.
--
-- Zaman çizelgeleri `created_at` ile sıralanır. Damgalar eşit olduğunda sıra
-- veritabanının satırları döndürme sırasına kalır ve aynı sayfa iki kez
-- açıldığında farklı çıkabilir. Teklif verme akışında bu görünür bir hataydı:
-- `createQuote` incelemeye alınmamış bir talepte önce "incelemeye alındı",
-- ardından "teklif verildi" olaylarını TEK işlemde yazar; müşteri teklifin
-- incelemeden önce verildiğini görebiliyordu.
--
-- `clock_timestamp()` çağrıldığı andaki gerçek saati verir, dolayısıyla aynı
-- işlemdeki olaylar da yazıldıkları sırayla sıralanır.
--
-- Bu değişiklik yalnızca bundan SONRA yazılacak satırları etkiler; hâlihazırda
-- eşit damgalı kayıtlar için okuma tarafına ikincil bir sıralama anahtarı
-- eklendi, böylece eski kayıtların sırası da en azından sabit kalır.

ALTER TABLE "order_events" ALTER COLUMN "created_at" SET DEFAULT clock_timestamp();--> statement-breakpoint
ALTER TABLE "request_events" ALTER COLUMN "created_at" SET DEFAULT clock_timestamp();