import { Outlet } from 'react-router-dom';
import { SiteHeader } from './site-header.tsx';
import { SiteFooter } from './site-footer.tsx';

/**
 * Vitrin yerleşimi.
 *
 * "İçeriğe atla" bağlantısı, klavye kullanıcısının her sayfada gezinme
 * menüsünü baştan geçmesini engeller.
 */
export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#icerik"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-lg bg-brand-navy-800 px-4 py-2 text-sm font-medium text-white"
      >
        İçeriğe atla
      </a>

      <SiteHeader />

      <main id="icerik" className="flex-1">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
