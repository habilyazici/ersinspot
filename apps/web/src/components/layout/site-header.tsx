import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, Package, ShoppingCart, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { useAuth, useLogout } from '@/features/auth';
import { useCartCount } from '@/features/ordering';

const NAV_LINKS = [
  { to: '/urunler', label: 'Ürünler' },
  { to: '/teknik-servis', label: 'Teknik Servis' },
  { to: '/nakliye', label: 'Nakliye' },
  { to: '/urun-sat', label: 'Ürününüzü Satın' },
  { to: '/siparis-takip', label: 'Sipariş Takip' },
] as const;

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, isStaff, user } = useAuth();
  const logout = useLogout();
  const { data: cartCount = 0 } = useCartCount();

  const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-brand-navy-50 text-brand-navy-800' : 'text-slate-700 hover:bg-slate-100',
    );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-brand-navy-800">
            Ersin<span className="text-brand-orange-500">Spot</span>
          </span>
        </Link>

        <nav aria-label="Ana menü" className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/sepet" aria-label={`Sepetim${cartCount > 0 ? `, ${cartCount} ürün` : ''}`}>
              <ShoppingCart aria-hidden="true" />
              {cartCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-brand-orange-500 text-xs font-semibold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              ) : null}
            </Link>
          </Button>

          {isAuthenticated ? (
            <div className="hidden items-center gap-2 sm:flex">
              {/*
                Yönetim paneline giriş. Personel için görünür; müşteride hiç
                çizilmez. Önceden panele yalnızca adresi elle yazarak
                girilebiliyordu.
              */}
              {isStaff ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/yonetim">
                    <LayoutDashboard aria-hidden="true" />
                    <span className="hidden md:inline">Yönetim</span>
                  </Link>
                </Button>
              ) : null}

              <Button asChild variant="ghost" size="sm">
                <Link to="/hesabim/siparislerim">
                  <Package aria-hidden="true" />
                  <span className="hidden md:inline">Siparişlerim</span>
                </Link>
              </Button>

              {/* Ad, hesap sayfasına götürür: kullanıcı orada bilgilerini,
                  şifresini ve açık oturumlarını yönetir. */}
              <Button asChild variant="ghost" size="sm">
                <Link to="/hesabim">
                  <User aria-hidden="true" />
                  <span className="hidden md:inline">
                    {user?.fullName.split(' ')[0] ?? 'Hesabım'}
                  </span>
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Çıkış yap"
                onClick={() => logout.mutate()}
                isLoading={logout.isPending}
              >
                <LogOut aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/giris">
                <User aria-hidden="true" />
                Giriş Yap
              </Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={isMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {isMenuOpen ? (
        <nav
          aria-label="Mobil menü"
          className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
                  {link.label}
                </NavLink>
              </li>
            ))}

            <li className="mt-2 border-t border-slate-200 pt-2">
              {isAuthenticated ? (
                <>
                  {isStaff ? (
                    <NavLink
                      to="/yonetim"
                      className={navLinkClass}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Yönetim Paneli
                    </NavLink>
                  ) : null}
                  <NavLink
                    to="/hesabim"
                    className={navLinkClass}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Hesabım
                  </NavLink>
                  <NavLink
                    to="/hesabim/siparislerim"
                    className={navLinkClass}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Siparişlerim
                  </NavLink>
                  <NavLink
                    to="/hesabim/taleplerim"
                    className={navLinkClass}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Taleplerim
                  </NavLink>
                  <NavLink
                    to="/hesabim/favorilerim"
                    className={navLinkClass}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Favorilerim
                  </NavLink>

                  {/* Mobil menüde de çıkış olmalı: masaüstü düğmesi burada görünmez. */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout.mutate();
                    }}
                    disabled={logout.isPending}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                  >
                    Çıkış Yap
                  </button>
                </>
              ) : (
                <NavLink to="/giris" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
                  Giriş Yap
                </NavLink>
              )}
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
