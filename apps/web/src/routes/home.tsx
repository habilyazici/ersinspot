import { Link } from 'react-router-dom';
import { ArrowRight, PackageCheck, ShieldCheck, Truck, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { PageContainer } from '@/components/ui/page.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { ProductCard, useProducts } from '@/features/catalog';
import { FavoriteButton, useFavoriteStatus } from '@/features/ordering';

/** Anasayfa: vitrin, hizmetler ve güven unsurları. */
export default function HomePage() {
  const { data, isLoading, isError, error, refetch } = useProducts({ pageSize: 8, sort: 'newest' });

  // Vitrindeki ürünlerin favori durumu tek istekte sorulur.
  const { data: favorites } = useFavoriteStatus(data?.items.map((product) => product.id) ?? []);

  return (
    <>
      {/* Kahraman bölümü */}
      <section className="bg-gradient-to-br from-brand-navy-800 to-brand-navy-900 text-white">
        <PageContainer width="wide" className="py-16 lg:py-24">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              İkinci el eşyada <span className="text-brand-orange-400">güvenilir adres</span>
            </h1>

            <p className="mt-4 text-lg leading-relaxed text-brand-navy-100">
              Buca ve İzmir genelinde temiz, kontrol edilmiş ikinci el beyaz eşya ve elektronik.
              Teknik servis ve evden eve nakliyat da bizden.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/urunler">
                  Ürünleri İncele
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <Link to="/urun-sat">Ürününüzü Satın</Link>
              </Button>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Güven unsurları */}
      <section aria-labelledby="neden-biz" className="border-b border-slate-200 bg-white">
        <h2 id="neden-biz" className="sr-only">
          Neden Ersin Spot?
        </h2>

        <PageContainer width="wide" className="grid gap-6 py-10 md:grid-cols-3">
          {[
            {
              icon: PackageCheck,
              title: 'Kontrol Edilmiş Ürünler',
              text: 'Satışa çıkan her ürün test edilir ve durumu açıkça belirtilir.',
            },
            {
              icon: ShieldCheck,
              title: 'Garantili Satış',
              text: 'Uygun ürünlerde garanti veriyoruz; süresi ilan sayfasında yazılıdır.',
            },
            {
              icon: Truck,
              title: 'Buca İçi Ücretsiz Teslimat',
              text: 'Buca içi teslimat ücretsiz, diğer ilçelere uygun ücretle.',
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <item.icon className="size-6 shrink-0 text-brand-orange-500" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.text}</p>
              </div>
            </div>
          ))}
        </PageContainer>
      </section>

      {/* Son eklenen ürünler */}
      <section aria-labelledby="son-urunler">
        <PageContainer width="wide" className="py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="son-urunler" className="text-2xl font-bold text-slate-900">
                Son Eklenen Ürünler
              </h2>
              <p className="mt-1 text-sm text-slate-600">Yeni gelenler, en yeniden eskiye.</p>
            </div>

            <Button asChild variant="link" className="shrink-0">
              <Link to="/urunler">
                Tümünü gör
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner label="Ürünler yükleniyor" />
            </div>
          ) : isError ? (
            /*
              Ağ hatası ile boş katalog ayrı şeylerdir. Önceki hâlinde ikisi de
              "henüz ürün yok" gösteriyordu: sunucuya ulaşılamadığında kullanıcı
              mağazanın boş olduğunu sanıyordu ve tekrar deneme yolu yoktu.
            */
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : data === undefined || data.items.length === 0 ? (
            <EmptyState
              title="Henüz ürün yok"
              description="Yakında yeni ürünler eklenecek. Takipte kalın."
            />
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {data.items.map((product) => (
                <li key={product.id}>
                  <ProductCard
                    product={product}
                    action={
                      <FavoriteButton
                        productId={product.id}
                        productTitle={product.title}
                        isFavorite={favorites?.has(product.id) ?? false}
                      />
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </PageContainer>
      </section>

      {/* Hizmetler */}
      <section aria-labelledby="hizmetler" className="bg-brand-cream-200">
        <PageContainer width="wide" className="py-12">
          <h2 id="hizmetler" className="text-2xl font-bold text-slate-900">
            Diğer Hizmetlerimiz
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                icon: Wrench,
                title: 'Teknik Servis',
                text: 'Beyaz eşya ve elektronik onarımı. Yerinde keşif, şeffaf fiyat.',
                to: '/teknik-servis',
                cta: 'Randevu Al',
              },
              {
                icon: Truck,
                title: 'Evden Eve Nakliyat',
                text: 'Sigortalı taşıma, ambalajlama ve montaj hizmeti.',
                to: '/nakliye',
                cta: 'Fiyat Hesapla',
              },
            ].map((service) => (
              <Card key={service.title} padding="lg" className="flex flex-col gap-3 shadow-card">
                <service.icon className="size-8 text-brand-orange-500" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-slate-900">{service.title}</h3>
                <p className="text-sm text-slate-600">{service.text}</p>

                <Button asChild variant="secondary" size="sm" className="mt-2 w-fit">
                  <Link to={service.to}>
                    {service.cta}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>
    </>
  );
}
