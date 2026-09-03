import { Outlet } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { SiteHeader } from './site-header.tsx';
import { SiteFooter } from './site-footer.tsx';
import { useSiteSettings } from '@/features/content';

/**
 * Duyuru şeridi.
 *
 * Metin site ayarlarından gelir; boşsa şerit hiç çizilmez. Ayar (`banner.text`)
 * yönetim panelinde düzenlenebiliyor ama hiçbir yerde gösterilmiyordu:
 * yönetici duyuru yazıyor, kaydediyor ve sitede hiçbir şey değişmiyordu.
 */
function AnnouncementBanner() {
  const { data: settings } = useSiteSettings();
  const text = settings?.['banner.text'] ?? '';

  if (text.trim() === '') return null;

  return (
    <div className="bg-brand-navy-800 px-4 py-2 text-center text-sm text-white">
      <p className="mx-auto flex max-w-3xl items-center justify-center gap-2">
        <Megaphone className="size-4 shrink-0" aria-hidden="true" />
        {text}
      </p>
    </div>
  );
}

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

      <AnnouncementBanner />
      <SiteHeader />

      <main id="icerik" className="flex-1">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
