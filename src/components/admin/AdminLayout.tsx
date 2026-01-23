import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Calendar,
  LogOut,
  Menu,
  Settings,
  X,
  Search,
  ChevronDown,
  Handshake,
  BarChart3,
  Mail,
  Truck,
  Wrench,
  Plus,
  Eye,
  FileText,
  Users,
  Zap
} from 'lucide-react@0.487.0';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';
import logo from 'figma:asset/355ff2021d31b6f59d280dc2fdf15900e1bcd0b0.png';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { icon: Zap, label: 'Hızlı Erişim', path: '/admin/hizli-erisim' },
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Package, label: 'Ürün Yönetimi', path: '/admin/urunler' },
    { icon: ShoppingCart, label: 'Siparişler', path: '/admin/siparisler' },
    { icon: Truck, label: 'Nakliye Yönetimi', path: '/admin/nakliye' },
    { icon: Handshake, label: 'Ürün Alım Talepleri', path: '/admin/satis-talepleri' },
    { icon: Wrench, label: 'Teknik Servis', path: '/admin/teknik-servis' },
    { icon: Mail, label: 'Mesajlar', path: '/admin/mesajlar' },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Çıkış Başarılı', {
        description: 'Güvenli bir şekilde çıkış yaptınız.',
      });
      navigate('/admin/giris');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Çıkış yapılırken bir hata oluştu');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Arama mantığı - sayfa türüne göre filtrele
      console.log('Arama yapılıyor:', searchQuery);
      // TODO: Her sayfada arama state'ini güncellemek için event/context kullan
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-[#1e3a8a] to-[#1e3a8a]/95 text-white transition-all duration-300 z-50 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo - Clickable */}
        <Link 
          to="/admin/hizli-erisim" 
          className="h-20 flex items-center justify-start border-b border-white/10 px-6 hover:bg-white/5 transition-colors cursor-pointer"
        >
          {isSidebarOpen ? (
            <div className="flex items-center gap-3">
              <img src={logo} alt="Ersin Spot" className="h-12 w-auto" />
              <div>
                <p className="font-bold text-lg">Admin Panel</p>
                <p className="text-xs text-gray-300">Ersin Spot</p>
              </div>
            </div>
          ) : (
            <img src={logo} alt="Ersin Spot" className="h-10 w-auto" />
          )}
        </Link>

        {/* Menu Items */}
        <nav className="mt-6 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#f97316] text-white shadow-lg'
                    : 'text-gray-200 hover:bg-white/10'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#f97316] text-white p-2 rounded-lg hover:bg-[#ea580c] transition-colors"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </aside>

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-40">
          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                />
              </div>
            </form>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-full flex items-center justify-center text-white font-bold">
                  {user?.user_metadata?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="text-left hidden md:block">
                  <p className="font-semibold text-gray-900">{user?.user_metadata?.name || 'Admin'}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'admin@ersinspot.com'}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}