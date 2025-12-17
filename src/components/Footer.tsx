import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Home, ShoppingCart, Wrench, Truck, Info, MessageSquare, LogIn, Shield, BookOpen, Package, Tag, Award, UserPlus, HelpCircle } from 'lucide-react@0.487.0';
import logo from 'figma:asset/355ff2021d31b6f59d280dc2fdf15900e1bcd0b0.png';

export function Footer() {
  return (
    <footer className="print:hidden bg-gradient-to-br from-[#2563eb]/60 via-[#3b82f6]/60 via-30% via-[#60a5fa]/50 via-50% via-[#fb923c]/60 via-70% to-[#f97316]/60 text-white mt-20 relative overflow-hidden">
      {/* Yumuşak Gradient Overlay - Renkler Birbirine Karışsın */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2563eb]/20 via-transparent via-40% via-transparent via-60% to-[#f97316]/20"></div>
      
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7FA99B] rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Ersin Spot - Logo ve Açıklama */}
          <div className="md:col-span-1">
            <Link to="/" className="inline-block mb-4 hover:opacity-80 transition-opacity">
              <img 
                src={logo} 
                alt="Ersin Spot Logo" 
                className="h-14 w-auto object-contain cursor-pointer"
                style={{ maxWidth: '200px' }}
              />
            </Link>
            <p className="text-white text-sm leading-relaxed mb-4 drop-shadow-md font-medium">
              İzmir Buca merkezli, İzmir genelinde ikinci el beyaz eşya, elektronik ve mobilya alım satımı, teknik servis ve nakliye hizmetleri.
            </p>
          </div>

          {/* Hızlı Linkler - TÜM SAYFA LİNKLERİ */}
          <div className="md:col-span-1">
            <h3 className="mb-4 text-[#f97316] font-bold text-lg drop-shadow-lg">Hızlı Linkler</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/" className="text-white hover:text-[#FF8A6B] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <Home className="w-3.5 h-3.5" />
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <Link to="/urunler" className="text-white hover:text-[#FF8A6B] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <Package className="w-3.5 h-3.5" />
                  Ürünler
                </Link>
              </li>
              <li>
                <Link to="/urun-sat" className="text-white hover:text-[#FF8A6B] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <Tag className="w-3.5 h-3.5" />
                  Ürün Sat
                </Link>
              </li>
              <li>
                <Link to="/teknik-servis" className="text-white hover:text-[#7FA99B] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <Wrench className="w-3.5 h-3.5" />
                  Teknik Servis
                </Link>
              </li>
              <li>
                <Link to="/nakliye" className="text-white hover:text-[#FF8A6B] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <Truck className="w-3.5 h-3.5" />
                  Nakliye
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-white hover:text-[#7FA99B] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <BookOpen className="w-3.5 h-3.5" />
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/sss" className="text-white hover:text-[#FF8A6B] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <HelpCircle className="w-3.5 h-3.5" />
                  SSS
                </Link>
              </li>
              <li>
                <Link to="/hakkimizda" className="text-white hover:text-[#FF8A6B] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <Info className="w-3.5 h-3.5" />
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link to="/iletisim" className="text-white hover:text-[#7FA99B] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <MessageSquare className="w-3.5 h-3.5" />
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          {/* Kullanıcı Paneli */}
          <div className="md:col-span-1">
            <h3 className="mb-4 text-[#f97316] font-bold text-lg drop-shadow-lg">Hesap</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/giris" className="text-white hover:text-[#8B6F47] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <LogIn className="w-3.5 h-3.5" />
                  Giriş Yap
                </Link>
              </li>
              <li>
                <Link to="/kayit" className="text-white hover:text-[#FF8A6B] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <UserPlus className="w-3.5 h-3.5" />
                  Kayıt Ol
                </Link>
              </li>
              <li>
                <Link to="/sepet" className="text-white hover:text-[#FF8A6B] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Sepetim
                </Link>
              </li>
              <li>
                <Link to="/admin/giris" className="text-white hover:text-[#8B6F47] text-sm transition-colors flex items-center gap-2 drop-shadow-md font-medium hover:drop-shadow-lg">
                  <Shield className="w-3.5 h-3.5" />
                  Admin Paneli
                </Link>
              </li>
            </ul>
          </div>

          {/* İletişim - TIKLANABİLİR */}
          <div className="md:col-span-1">
            <h3 className="mb-4 text-[#f97316] font-bold text-lg drop-shadow-lg">İletişim</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="tel:+905071940550" 
                  className="flex items-start gap-2 text-white hover:text-[#FF8A6B] text-sm transition-colors group drop-shadow-md font-medium"
                >
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span>0 507 194 05 50</span>
                </a>
              </li>
              <li>
                <a 
                  href="mailto:ersin1235@gmail.com" 
                  className="flex items-start gap-2 text-white hover:text-[#7FA99B] text-sm transition-colors group drop-shadow-md font-medium"
                >
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span>ersin1235@gmail.com</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=Menderes+Mah.+Buca+İzmir" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-white hover:text-[#FF8A6B] text-sm transition-colors group drop-shadow-md font-medium"
                >
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span>Menderes Mah., No:21A, Buca/İzmir</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-200 text-sm">&copy; 2025 Ersin Spot. Tüm hakları saklıdır.</p>
            
            {/* Güvenlik Rozetleri */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors">
                <Shield className="w-4 h-4 text-[#f97316]" />
                <span>Güvenli Hizmet</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors">
                <Award className="w-4 h-4 text-[#f97316]" />
                <span>Test Edilmiş Ürünler</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}