/**
 * Yönetim paneli kabuğu.
 *
 * Panel, vitrinden AYRI bir gezinme düzeni kullanır: personelin işi listeler
 * arasında geçmektir, alışveriş yapmak değil. Yan menü sabit durur ve hangi
 * bölümde olunduğu daima görünür.
 *
 * Erişim `RequireStaff` ile kesilir (bkz. `App.tsx`); burada ayrıca bir yetki
 * kontrolü YAPILMAZ. İki yerde kontrol etmek, birinin unutulması hâlinde
 * diğerine güvenmeye yol açar — kontrol tek yerde, rota tanımındadır.
 *
 * SAYFA KAPSAYICISINI BU DÜZEN SAĞLAR. Panel sayfaları kendi
 * `PageContainer`'ını yazmaz; yazsalardı iki kapsayıcı iç içe geçer ve dolgu
 * iki katına çıkardı.
 */

import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  ClipboardList,
  Cog,
  HelpCircle,
  LayoutDashboard,
  Mail,
  Newspaper,
  Package,
  ShoppingBag,
} from 'lucide-react';
import { PageContainer } from '@/components/ui/page.tsx';
import { cn } from '@/lib/utils.ts';
import { useAuth } from '@/features/auth';
import { useUnreadMessageCount } from '@/features/content';

interface AdminLink {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Yalnızca yönetici görebilir. Personel için gizlenir. */
  adminOnly?: boolean;
}

const LINKS: readonly AdminLink[] = [
  { to: '/yonetim', label: 'Genel Bakış', icon: LayoutDashboard },
  { to: '/yonetim/siparisler', label: 'Siparişler', icon: ShoppingBag },
  { to: '/yonetim/talepler', label: 'Talepler', icon: ClipboardList },
  { to: '/yonetim/urunler', label: 'Ürünler', icon: Package },
  { to: '/yonetim/mesajlar', label: 'Mesajlar', icon: Mail },
  { to: '/yonetim/blog', label: 'Blog', icon: Newspaper },
  { to: '/yonetim/sss', label: 'SSS', icon: HelpCircle },
  { to: '/yonetim/ayarlar', label: 'Ayarlar', icon: Cog, adminOnly: true },
];

export function AdminLayout() {
  // Rol karşılaştırması `hasRole` üzerinden yapılır: roller hiyerarşiktir ve
  // kural tek yerdedir (`hasRoleAtLeast`). Doğrudan `role === 'admin'` yazmak,
  // yeni bir rol eklendiğinde bulunup güncellenmesi gereken bir kopya bırakır.
  const { hasRole } = useAuth();
  const { data: unreadCount } = useUnreadMessageCount();

  const visibleLinks = LINKS.filter((link) => link.adminOnly !== true || hasRole('admin'));

  return (
    <PageContainer width="wide" className="grid gap-6 lg:grid-cols-[15rem_1fr]">
      <nav aria-label="Yönetim menüsü" className="lg:sticky lg:top-20 lg:h-fit">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Yönetim</p>

        <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {visibleLinks.map((link) => (
            <li key={link.to} className="shrink-0">
              <NavLink
                to={link.to}
                // `end`: "/yonetim" yalnızca kendisinde etkin görünmeli,
                // alt sayfalarında değil.
                end={link.to === '/yonetim'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-brand-navy-800 font-medium text-white'
                      : 'text-slate-600 hover:bg-slate-100',
                  )
                }
              >
                <link.icon className="size-4 shrink-0" aria-hidden="true" />
                {link.label}

                {link.to === '/yonetim/mesajlar' && unreadCount !== undefined && unreadCount > 0 ? (
                  <span className="ml-auto rounded-full bg-brand-orange-500 px-1.5 py-0.5 text-xs font-medium text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        <Outlet />
      </div>
    </PageContainer>
  );
}
