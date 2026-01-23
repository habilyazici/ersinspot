import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, Phone, ChevronDown, Package, Wrench, Truck, Tag, ShoppingBag, CalendarClock, Heart, UserCircle, LogOut, Home, ClipboardList, BookOpen, Users, MapPin, LayoutDashboard, Calendar, Banknote } from 'lucide-react@0.487.0';
import { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import logo from 'figma:asset/355ff2021d31b6f59d280dc2fdf15900e1bcd0b0.png';

const services = [
  { to: '/urunler', label: 'Ürünler', icon: Package },
  { to: '/nakliye', label: 'Nakliye', icon: Truck },
  { to: '/urun-sat', label: 'Ürün Sat', icon: Tag },
  { to: '/teknik-servis', label: 'Teknik Servis', icon: Wrench },
];

const accountMenuItems = [
  { to: '/hesabim/siparislerim', label: 'Siparişlerim', icon: ShoppingBag },
  { to: '/hesabim/nakliye', label: 'Nakliye Randevularım', icon: Truck },
  { to: '/hesabim/satis-taleplerim', label: 'Ürün Satış Taleplerim', icon: Tag },
  { to: '/hesabim/teknik-servis', label: 'Teknik Servis Randevularım', icon: Wrench },
  { to: '/hesabim/favorilerim', label: 'Favorilerim', icon: Heart },
];

const adminMenuItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/urunler', label: 'Ürünler', icon: Package },
  { to: '/admin/siparisler', label: 'Siparişler', icon: ShoppingBag },
  { to: '/admin/satis-talepleri', label: 'Ürün Alım Talepleri', icon: Tag },
  { to: '/admin/nakliye', label: 'Nakliye Randevuları', icon: Truck },
  { to: '/admin/teknik-servis', label: 'Teknik Servis Talepleri', icon: Wrench },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const cartContext = useCart();
  const { user, accessToken } = useAuth();
  const [isServicesHovered, setIsServicesHovered] = useState(false);
  const [isAccountHovered, setIsAccountHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; profile_photo_url?: string | null } | null>(null);

  // Güvenlik kontrolü
  const totalItems = cartContext?.totalItems ?? 0;
  
  // Kullanıcı giriş yapmış mı?
  const isAuthenticated = !!user;

  // Kullanıcı profil bilgilerini yükle
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user || !accessToken) {
        setUserProfile(null);
        return;
      }

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/customers/me`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUserProfile({
            name: data.customer.name || 'Kullanıcı',
            email: data.customer.email || user.email || '',
            profile_photo_url: data.customer.profile_photo_url || null,
          });
        }
      } catch (error) {
        console.error('Profil bilgileri yüklenemedi:', error);
      }
    };

    loadUserProfile();
  }, [user, accessToken]);

  // Admin kontrolü - SADECE admin sayfalarında admin menüsü göster
  useEffect(() => {
    setIsAdmin(location.pathname.startsWith('/admin'));
  }, [location]);

  return (
    <nav className="print:hidden bg-gradient-to-r from-[#2563eb]/60 via-[#3b82f6]/50 to-[#60a5fa]/40 backdrop-blur-md text-white fixed top-0 left-0 right-0 z-50 shadow-lg border-b border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src={logo} 
              alt="Ersin Spot Logo" 
              className="h-20 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Ana Sayfa - Home Icon */}
            <Link 
              to="/" 
              className="flex items-center gap-1.5 hover:text-[var(--brand-coral-400)] transition-all text-sm relative group"
            >
              <Home className="w-4 h-4" />
              Ana Sayfa
              {location.pathname === '/' && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white"></span>
              )}
            </Link>
            
            {/* Hizmetlerimiz Dropdown - ClipboardList Icon + ChevronDown */}
            <DropdownMenu open={isServicesHovered} onOpenChange={setIsServicesHovered} modal={false}>
              <DropdownMenuTrigger 
                asChild
                onMouseEnter={() => setIsServicesHovered(true)}
                onMouseLeave={() => setIsServicesHovered(false)}
              >
                <button
                  className={`flex items-center gap-1.5 transition-all outline-none text-sm whitespace-nowrap bg-transparent border-none cursor-pointer relative ${
                    isServicesHovered
                      ? 'text-[var(--brand-coral-500)]' 
                      : 'text-white'
                  } hover:text-[var(--brand-coral-400)]`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Hizmetlerimiz
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isServicesHovered ? 'rotate-180' : ''}`} />
                  {['/urunler', '/urun-sat', '/teknik-servis', '/nakliye'].some(path => location.pathname.startsWith(path)) && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white"></span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="bg-gradient-to-br from-white via-[var(--brand-cream-50)] to-[var(--brand-coral-50)] text-gray-900 w-[230px] border border-gray-200 shadow-lg"
                onMouseEnter={() => setIsServicesHovered(true)}
                onMouseLeave={() => setIsServicesHovered(false)}
                align="start"
                sideOffset={8}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                {services.map((service) => {
                  const isActive = location.pathname === service.to;
                  const linkClasses = isActive 
                    ? 'text-[var(--brand-orange-700)] bg-white/80 backdrop-blur-sm' 
                    : 'text-gray-700 hover:text-[var(--brand-orange-600)] hover:bg-[var(--brand-orange-50)] backdrop-blur-sm';
                  const iconClasses = isActive 
                    ? 'text-[var(--brand-orange-600)]' 
                    : 'text-gray-500 group-hover:text-[var(--brand-orange-600)]';
                  const spanClasses = isActive 
                    ? 'text-[var(--brand-orange-700)]' 
                    : 'text-gray-700 group-hover:text-[var(--brand-orange-600)]';
                  
                  return (
                    <DropdownMenuItem key={service.to} asChild>
                      <Link 
                        to={service.to} 
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer w-full transition-all group ${linkClasses}`}
                      >
                        <service.icon className={`w-5 h-5 transition-colors ${iconClasses}`} />
                        <span className={`transition-colors ${spanClasses}`}>
                          {service.label}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Blog - BookOpen Icon */}
            <Link 
              to="/blog" 
              className="flex items-center gap-1.5 hover:text-[var(--brand-coral-400)] transition-all text-sm relative group"
            >
              <BookOpen className="w-4 h-4" />
              Blog
              {location.pathname === '/blog' && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white"></span>
              )}
            </Link>

            {/* Hakkımızda - Users Icon */}
            <Link 
              to="/hakkimizda" 
              className="flex items-center gap-1.5 hover:text-[var(--brand-coral-400)] transition-all text-sm relative group"
            >
              <Users className="w-4 h-4" />
              Hakkımızda
              {location.pathname === '/hakkimizda' && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white"></span>
              )}
            </Link>

            {/* İletişim - MapPin Icon */}
            <Link 
              to="/iletisim" 
              className="flex items-center gap-1.5 hover:text-[var(--brand-coral-400)] transition-all text-sm relative group"
            >
              <MapPin className="w-4 h-4" />
              İletişim
              {location.pathname === '/iletisim' && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white"></span>
              )}
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Sepet İkonu - Sadece giriş yapmış kullanıcılara göster */}
            {!isAdmin && isAuthenticated && (
              <Link 
                to="/sepet" 
                className="relative hover:scale-110 transition-all group"
                title="Sepetim"
              >
                <ShoppingCart className={`w-5 h-5 transition-colors ${ 
                  totalItems > 0 || location.pathname === '/sepet' 
                    ? 'text-[var(--brand-coral-500)]' 
                    : 'text-white group-hover:text-[var(--brand-coral-400)]'
                }`} />
                {totalItems > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 bg-[var(--brand-coral-500)] text-white rounded-full min-w-[14px] h-3.5 flex items-center justify-center text-[9px] px-0.5 shadow-md border border-white">
                    {totalItems}
                  </div>
                )}
              </Link>
            )}

            {/* Admin Hesabım Dropdown */}
            {isAdmin ? (
              <DropdownMenu open={isAccountHovered} onOpenChange={setIsAccountHovered} modal={false}>
                <DropdownMenuTrigger 
                  asChild
                  onMouseEnter={() => setIsAccountHovered(true)}
                  onMouseLeave={() => setIsAccountHovered(false)}
                >
                  <div onMouseEnter={() => setIsAccountHovered(true)}>
                    <Link to="/admin" className="hover:scale-105 transition-transform">
                      <Button 
                        variant="ghost" 
                        className={`hover:bg-transparent text-sm px-3 py-1.5 h-auto ${ 
                          location.pathname.startsWith('/admin') || isAccountHovered
                            ? 'text-[var(--brand-orange-500)]'
                            : 'text-white hover:text-[var(--brand-orange-400)]'
                        }`}
                      >
                        <User className="w-4 h-4 mr-1" />
                        Admin Panel
                      </Button>
                    </Link>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="bg-white text-gray-900 w-[220px] border-[var(--brand-orange-200)]"
                  onMouseEnter={() => setIsAccountHovered(true)}
                  onMouseLeave={() => setIsAccountHovered(false)}
                  align="start"
                  sideOffset={3}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  {adminMenuItems.map((item) => {
                    const isActive = location.pathname === item.to;
                    const linkClasses = isActive 
                      ? 'text-[var(--brand-navy-700)] bg-[var(--brand-navy-50)]' 
                      : 'text-gray-700 hover:text-[var(--brand-navy-600)] hover:bg-[var(--brand-navy-50)]';
                    const iconClasses = isActive 
                      ? 'text-[var(--brand-navy-600)]' 
                      : 'text-gray-500 group-hover:text-[var(--brand-navy-600)]';
                    const spanClasses = isActive 
                      ? 'text-[var(--brand-navy-700)]' 
                      : 'text-gray-700 group-hover:text-[var(--brand-navy-600)]';
                    
                    return (
                      <DropdownMenuItem key={item.to} asChild>
                        <Link 
                          to={item.to} 
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer w-full transition-all group ${linkClasses}`}
                        >
                          <item.icon className={`w-4 h-4 transition-colors ${iconClasses}`} />
                          <span className={`transition-colors ${spanClasses}`}>
                            {item.label}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuItem asChild>
                    <button
                      onClick={() => {
                        localStorage.removeItem('ersinspot-admin-token');
                        localStorage.removeItem('ersinspot-admin-username');
                        navigate('/admin/giris');
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer w-full transition-all group border-t mt-1 text-red-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 rounded-b-md text-left"
                    >
                      <LogOut className="w-4 h-4 transition-colors group-hover:text-white" />
                      <span className="transition-colors font-medium">Çıkış Yap</span>
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isAuthenticated ? (
              <DropdownMenu open={isAccountHovered} onOpenChange={setIsAccountHovered} modal={false}>
                <DropdownMenuTrigger 
                  asChild
                  onMouseEnter={() => setIsAccountHovered(true)}
                  onMouseLeave={() => setIsAccountHovered(false)}
                >
                  <div onMouseEnter={() => setIsAccountHovered(true)}>
                    <Link to="/hesabim" className="hover:scale-105 transition-transform flex items-center gap-1.5">
                      {userProfile?.profile_photo_url ? (
                        <img 
                          src={userProfile.profile_photo_url} 
                          alt="Profil Fotoğrafı"
                          className="w-7 h-7 rounded-full object-cover border border-white/50 shadow-sm"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                          <User className="w-4 h-4 text-[var(--brand-navy-600)]" />
                        </div>
                      )}
                      <div className="hidden lg:flex flex-col items-start">
                        <span className={`text-sm font-medium whitespace-nowrap ${isAccountHovered ? 'text-[var(--brand-orange-400)]' : 'text-white'} transition-colors`}>
                          Hesabım
                        </span>
                      </div>
                    </Link>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="bg-white text-gray-900 w-[260px] border-[var(--brand-orange-200)]"
                  onMouseEnter={() => setIsAccountHovered(true)}
                  onMouseLeave={() => setIsAccountHovered(false)}
                  align="start"
                  sideOffset={3}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  {/* Kullanıcı Bilgileri Header - Tıklanabilir */}
                  <Link to="/hesabim" className="block">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-[var(--brand-orange-50)] to-white hover:from-[var(--brand-orange-100)] hover:to-[var(--brand-orange-50)] transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        {userProfile?.profile_photo_url ? (
                          <img 
                            src={userProfile.profile_photo_url} 
                            alt="Profil Fotoğrafı"
                            className="w-10 h-10 rounded-full object-cover border-2 border-[var(--brand-orange-300)] shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-orange-400)] to-[var(--brand-orange-600)] flex items-center justify-center shadow-sm">
                            <User className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{userProfile?.name || 'Kullanıcı'}</p>
                          <p className="text-xs text-gray-500 truncate">{userProfile?.email}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  {accountMenuItems.map((item) => {
                    const isActive = location.pathname === item.to;
                    const linkClasses = isActive 
                      ? 'text-[var(--brand-orange-700)] bg-[var(--brand-orange-50)]' 
                      : 'text-gray-700 hover:text-[var(--brand-orange-600)] hover:bg-[var(--brand-orange-50)]';
                    const iconClasses = isActive 
                      ? 'text-[var(--brand-orange-600)]' 
                      : 'text-gray-500 group-hover:text-[var(--brand-orange-600)]';
                    const spanClasses = isActive 
                      ? 'text-[var(--brand-orange-700)]' 
                      : 'text-gray-700 group-hover:text-[var(--brand-orange-600)]';
                    
                    return (
                      <DropdownMenuItem key={item.to} asChild>
                        <Link 
                          to={item.to} 
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer w-full transition-all group ${linkClasses}`}
                        >
                          <item.icon className={`w-4 h-4 transition-colors ${iconClasses}`} />
                          <span className={`transition-colors ${spanClasses}`}>
                            {item.label}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuItem asChild>
                    <Link
                      to="/cikis"
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer w-full transition-all group border-t mt-1 text-red-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 rounded-b-md"
                    >
                      <LogOut className="w-4 h-4 transition-colors group-hover:text-white" />
                      <span className="transition-colors font-medium">Çıkış Yap</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu open={isAccountHovered} onOpenChange={setIsAccountHovered} modal={false}>
                <DropdownMenuTrigger 
                  asChild
                  onMouseEnter={() => setIsAccountHovered(true)}
                  onMouseLeave={() => setIsAccountHovered(false)}
                >
                  <button
                    onClick={() => {
                      if (location.pathname === '/giris') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        // Mevcut sayfayı state ile gönder - giriş sonrası geri dönülecek
                        navigate('/giris', { state: { from: location.pathname } });
                      }
                    }}
                    onMouseEnter={() => setIsAccountHovered(true)}
                    className={`flex items-center gap-1 transition-all outline-none text-sm whitespace-nowrap bg-transparent border-none cursor-pointer relative ${ 
                      location.pathname === '/giris' || location.pathname === '/kayit' || isAccountHovered
                        ? 'text-[var(--brand-coral-500)]'
                        : 'text-white'
                    } hover:text-[var(--brand-coral-400)]`}
                  >
                    <User className="w-4 h-4 mr-0.5" />
                    Giriş Yap
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="bg-gradient-to-br from-white via-[var(--brand-teal-50)] to-[var(--brand-cream-50)] text-gray-900 w-[190px] border border-gray-200 shadow-lg"
                  onMouseEnter={() => setIsAccountHovered(true)}
                  onMouseLeave={() => setIsAccountHovered(false)}
                  align="start"
                  sideOffset={16}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <DropdownMenuItem asChild>
                    <button 
                      onClick={() => {
                        if (location.pathname === '/giris') {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                          navigate('/giris', { state: { from: location.pathname } });
                        }
                        setIsAccountHovered(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer w-full transition-all group text-left ${
                        location.pathname === '/giris' ? 'text-[var(--brand-teal-700)] bg-white/80 backdrop-blur-sm' : 'text-gray-700 hover:text-[var(--brand-teal-600)] hover:bg-white/60 backdrop-blur-sm'
                      }`}
                    >
                      <User className={`w-5 h-5 transition-colors ${
                        location.pathname === '/giris' ? 'text-[var(--brand-teal-600)]' : 'text-gray-500 group-hover:text-[var(--brand-teal-600)]'
                      }`} />
                      <span className={`transition-colors ${
                        location.pathname === '/giris' ? 'text-[var(--brand-teal-700)]' : 'text-gray-700 group-hover:text-[var(--brand-teal-600)]'
                      }`}>
                        Giriş Yap
                      </span>
                    </button>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <button 
                      onClick={() => {
                        if (location.pathname === '/kayit') {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                          navigate('/kayit', { state: { from: location.pathname } });
                        }
                        setIsAccountHovered(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer w-full transition-all group text-left ${
                        location.pathname === '/kayit' ? 'text-[var(--brand-teal-700)] bg-white/80 backdrop-blur-sm' : 'text-gray-700 hover:text-[var(--brand-teal-600)] hover:bg-white/60 backdrop-blur-sm'
                      }`}
                    >
                      <UserCircle className={`w-5 h-5 transition-colors ${
                        location.pathname === '/kayit' ? 'text-[var(--brand-teal-600)]' : 'text-gray-500 group-hover:text-[var(--brand-teal-600)]'
                      }`} />
                      <span className={`transition-colors ${
                        location.pathname === '/kayit' ? 'text-[var(--brand-teal-700)]' : 'text-gray-700 group-hover:text-[var(--brand-teal-600)]'
                      }`}>
                        Kayıt Ol
                      </span>
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  <Link
                    to="/"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-700 hover:text-[#f97316] transition-colors py-2"
                  >
                    Ana Sayfa
                  </Link>
                  
                  {/* Hizmetlerimiz Bölümü */}
                  <div className="border-t pt-3">
                    <p className="text-gray-500 text-sm mb-2 px-1">Hizmetlerimiz</p>
                    {services.map((service) => (
                      <Link
                        key={service.to}
                        to={service.to}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 text-gray-700 hover:text-[#f97316] transition-colors py-2 pl-3"
                      >
                        <service.icon className="w-4 h-4" />
                        <span>{service.label}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="border-t pt-3">
                    <Link
                      to="/blog"
                      onClick={() => setIsOpen(false)}
                      className="text-gray-700 hover:text-[#f97316] transition-colors py-2 block"
                    >
                      Blog
                    </Link>
                    <Link
                      to="/hakkimizda"
                      onClick={() => setIsOpen(false)}
                      className="text-gray-700 hover:text-[#f97316] transition-colors py-2 block"
                    >
                      Hakkımızda
                    </Link>
                    <Link
                      to="/iletisim"
                      onClick={() => setIsOpen(false)}
                      className="text-gray-700 hover:text-[#f97316] transition-colors py-2 block"
                    >
                      İletişim
                    </Link>
                  </div>

                  {/* Hesap Bölümü */}
                  <div className="border-t pt-3">
                    <p className="text-gray-500 text-sm mb-2 px-1">Hesap</p>
                    {isAuthenticated ? (
                      <>
                        <Link
                          to="/hesabim"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2 text-gray-700 hover:text-[#f97316] transition-colors py-2 pl-3"
                        >
                          {userProfile?.profile_photo_url ? (
                            <img 
                              src={userProfile.profile_photo_url} 
                              alt="Profil Fotoğrafı"
                              className="w-5 h-5 rounded-full object-cover border border-gray-300"
                            />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                          <span>Hesabım</span>
                        </Link>
                        <Link
                          to="/sepet"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2 text-gray-700 hover:text-[#f97316] transition-colors py-2 pl-3"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Sepetim</span>
                          {totalItems > 0 && (
                            <Badge className="bg-[#f97316] text-white text-xs ml-auto">
                              {totalItems}
                            </Badge>
                          )}
                        </Link>
                        <Link
                          to="/cikis"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors py-2 pl-3"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Çıkış Yap</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/giris"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2 text-gray-700 hover:text-[#f97316] transition-colors py-2 pl-3"
                        >
                          <User className="w-4 h-4" />
                          <span>Giriş Yap</span>
                        </Link>
                        <Link
                          to="/kayit"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2 text-gray-700 hover:text-[#f97316] transition-colors py-2 pl-3"
                        >
                          <UserCircle className="w-4 h-4" />
                          <span>Kayıt Ol</span>
                        </Link>
                      </>
                    )}
                  </div>

                  <a href="tel:+905071940550" className="flex items-center gap-2 text-gray-700 hover:text-[#f97316] py-2 border-t pt-3">
                    <Phone className="w-4 h-4" />
                    <span>0 507 194 05 50</span>
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}