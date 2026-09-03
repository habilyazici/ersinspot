import { Link } from 'react-router-dom';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useSiteSettings } from '@/features/content';
import { phone as phoneUtils } from '@ersinspot/shared';

/**
 * Site alt bilgisi.
 *
 * İletişim bilgileri site ayarlarından gelir. Eski kod tabanında bunlar kaynak
 * dosyada sabitti (`BACKEND_CONSTANTS.ts`); telefon numarasını değiştirmek
 * yeniden dağıtım gerektiriyordu.
 */
export function SiteFooter() {
  const { data: settings } = useSiteSettings();

  const contactPhone = settings?.['contact.phone'] ?? '';
  const contactEmail = settings?.['contact.email'] ?? '';
  const address = settings?.['contact.address'] ?? '';

  // Ayar metin olarak saklanır; tipi `boolean` olduğu için değeri 'true'/'false'.
  const isSundayClosed = (settings?.['hours.sunday.closed'] ?? 'true') === 'true';

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <span className="text-lg font-bold text-brand-navy-800">
            Ersin<span className="text-brand-orange-500">Spot</span>
          </span>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600">
            Buca ve İzmir genelinde ikinci el beyaz eşya satışı, teknik servis ve evden eve
            nakliyat. 2015'ten beri hizmetinizdeyiz.
          </p>
        </div>

        <nav aria-label="Alt menü">
          <h2 className="text-sm font-semibold text-slate-900">Hizmetler</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <Link to="/urunler" className="hover:text-brand-orange-600">
                İkinci El Ürünler
              </Link>
            </li>
            <li>
              <Link to="/teknik-servis" className="hover:text-brand-orange-600">
                Teknik Servis
              </Link>
            </li>
            <li>
              <Link to="/nakliye" className="hover:text-brand-orange-600">
                Evden Eve Nakliyat
              </Link>
            </li>
            <li>
              <Link to="/urun-sat" className="hover:text-brand-orange-600">
                Ürününüzü Satın
              </Link>
            </li>
            <li>
              <Link to="/blog" className="hover:text-brand-orange-600">
                Blog
              </Link>
            </li>
            <li>
              <Link to="/sss" className="hover:text-brand-orange-600">
                Sıkça Sorulan Sorular
              </Link>
            </li>
            <li>
              <Link to="/kullanim-kosullari" className="hover:text-brand-orange-600">
                Kullanım Koşulları
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">İletişim</h2>
          <ul className="mt-3 space-y-3 text-sm text-slate-600">
            {contactPhone === '' ? null : (
              <li className="flex items-start gap-2">
                <Phone
                  className="mt-0.5 size-4 shrink-0 text-brand-orange-500"
                  aria-hidden="true"
                />
                <a
                  href={phoneUtils.toTelHref(contactPhone)}
                  className="hover:text-brand-orange-600"
                >
                  {phoneUtils.format(contactPhone)}
                </a>
              </li>
            )}

            {contactEmail === '' ? null : (
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-orange-500" aria-hidden="true" />
                <a href={`mailto:${contactEmail}`} className="hover:text-brand-orange-600">
                  {contactEmail}
                </a>
              </li>
            )}

            {address === '' ? null : (
              <li className="flex items-start gap-2">
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-brand-orange-500"
                  aria-hidden="true"
                />
                <span>{address}</span>
              </li>
            )}

            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-brand-orange-500" aria-hidden="true" />
              <span>
                Hafta içi {settings?.['hours.weekday.open'] ?? '09:00'} –{' '}
                {settings?.['hours.weekday.close'] ?? '18:00'}
                <br />
                Cumartesi {settings?.['hours.saturday.open'] ?? '09:00'} –{' '}
                {settings?.['hours.saturday.close'] ?? '17:00'}
                <br />
                {/*
                  Pazar günü ayrıca yazılır. `hours.sunday.closed` ayarı vardı
                  ama hiçbir yerde okunmuyordu: yönetici "pazar açığız" diye
                  işaretlese bile site kapalı gibi görünmeye devam ediyordu.
                */}
                {isSundayClosed
                  ? 'Pazar kapalı'
                  : `Pazar ${settings?.['hours.sunday.open'] ?? '10:00'} – ${
                      settings?.['hours.sunday.close'] ?? '16:00'
                    }`}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 py-6">
        <p className="text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Ersin Spot. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
