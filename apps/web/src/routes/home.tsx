import { Link } from 'react-router-dom';
import { ArrowRight, PackageCheck, ShieldCheck, Truck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { ProductCard, useProducts } from '@/features/catalog';

/** Anasayfa: vitrin, hizmetler ve güven unsurları. */
export default function HomePage() {
  const { data, isLoading } = useProducts({ pageSize: 8, sort: 'newest' });

  return (
    <>
      {/* Kahraman bölümü */}
      <section className="bg-gradient-to-br from-brand-navy-800 to-brand-navy-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
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
        </div>
      </section>

      {/* Güven unsurları */}
      <section aria-labelledby="neden-biz" className="border-b border-slate-200 bg-white">
        <h2 id="neden-biz" className="sr-only">
          Neden Ersin Spot?
        </h2>

        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
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
        </div>
      </section>

      {/* Son eklenen ürünler */}
      <section
        aria-labelledby="son-urunler"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
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
        ) : data === undefined || data.items.length === 0 ? (
          <EmptyState
            title="Henüz ürün yok"
            description="Yakında yeni ürünler eklenecek. Takipte kalın."
          />
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {data.items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Hizmetler */}
      <section aria-labelledby="hizmetler" className="bg-brand-cream-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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
              <div
                key={service.title}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-card"
              >
                <service.icon className="size-8 text-brand-orange-500" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-slate-900">{service.title}</h3>
                <p className="text-sm text-slate-600">{service.text}</p>

                <Button asChild variant="secondary" size="sm" className="mt-2 w-fit">
                  <Link to={service.to}>
                    {service.cta}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
