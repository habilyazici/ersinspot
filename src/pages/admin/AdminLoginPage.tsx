import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Shield, Eye, EyeOff, Home } from 'lucide-react@0.487.0';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../../contexts/AuthContext';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import logo from 'figma:asset/355ff2021d31b6f59d280dc2fdf15900e1bcd0b0.png';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { signIn, checkAdminStatus, user, isAdmin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Check if already logged in as admin
  useEffect(() => {
    if (user && isAdmin) {
      console.log('[ADMIN-LOGIN] Already logged in as admin, redirecting...');
      navigate('/admin/hizli-erisim', { replace: true });
    }
  }, [user, isAdmin, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      console.log('[LOGIN] 🔑 Giriş denemesi:', loginData.email);
      
      // Giriş yap
      const result = await signIn(loginData.email, loginData.password);
      
      if (!result.success) {
        console.error('[LOGIN] ❌ Giriş başarısız:', result.error);
        toast.error('Giriş Başarısız!', {
          description: result.error || 'E-posta veya şifre hatalı.',
          duration: 6000,
        });
        return;
      }
      
      console.log('[LOGIN] ✅ Giriş başarılı, admin kontrolü yapılıyor...');
      
      // Admin yetkisini kontrol et
      const adminStatus = await checkAdminStatus();
      console.log('[LOGIN] Admin durumu:', adminStatus);
      
      if (!adminStatus) {
        console.error('[LOGIN] ❌ Admin yetkisi yok!');
        toast.error('Yetkisiz Erişim!', {
          description: `Bu hesap (${loginData.email}) müşteri hesabıdır, admin değil!`,
          duration: 8000,
        });
        
        // Admin setup sayfasına yönlendirme önerisi
        setTimeout(() => {
          toast.info('Admin Hesabı Gerekli', {
            description: 'Lütfen /admin/setup sayfasından yeni bir admin hesabı oluşturun veya mevcut admin hesabınızla giriş yapın.',
            duration: 10000,
            action: {
              label: 'Setup Sayfası',
              onClick: () => navigate('/admin/setup')
            }
          });
        }, 1500);
        return;
      }
      
      console.log('[LOGIN] ✅ Admin yetkisi onaylandı!');
      toast.success('Giriş Başarılı!', {
        description: 'Admin paneline yönlendiriliyorsunuz...',
      });
      
      setTimeout(() => {
        navigate('/admin/hizli-erisim');
      }, 500);
      
    } catch (error: any) {
      console.error('[LOGIN] ❌ Exception:', error);
      toast.error('Giriş Hatası!', {
        description: error.message || 'Bir hata oluştu.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#1e3a8a] to-[#2d4a9d] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#f97316]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#f97316]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl mb-6">
            <img src={logo} alt="Ersin Spot" className="h-14 w-auto" />
          </div>
          <h1 className="text-white mb-2 flex items-center justify-center gap-3">
            <Shield className="w-8 h-8" />
            Ersin Spot Yönetim Sistemi
          </h1>
          <p className="text-gray-200 text-sm">Güvenli Admin Paneli</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-gray-900 mb-1">Hoş Geldiniz</h2>
            <p className="text-gray-500 text-sm">Devam etmek için giriş yapın</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Input */}
            <div>
              <Label htmlFor="email" className="mb-2 block text-gray-700">
                E-posta
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ersinspot.com"
                  className="pl-10 h-12 border-gray-300 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <Label htmlFor="password" className="mb-2 block text-gray-700">
                Şifre
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12 border-gray-300 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#1e3a8a] border-gray-300 rounded focus:ring-[#1e3a8a]"
                />
                <span className="text-sm text-gray-600">Beni Hatırla</span>
              </label>
              <a
                href="#"
                className="text-sm text-[#f97316] hover:text-[#ea580c] font-medium"
              >
                Şifremi Unuttum
              </a>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-[#1e3a8a] to-[#2d4a9d] hover:from-[#1e3a8a]/90 hover:to-[#2d4a9d]/90 text-white font-semibold shadow-lg"
              size="lg"
              disabled={loading}
            >
              <Shield className="w-5 h-5 mr-2" />
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>

          {/* Website Link */}
          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition-colors"
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 mr-2" />
              Web Sitesine Git
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-200 text-sm">
            © 2025 Ersin Spot. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </div>
  );
}