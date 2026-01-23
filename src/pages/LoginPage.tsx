import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { Lock, Mail, User, Phone } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import logo from 'figma:asset/355ff2021d31b6f59d280dc2fdf15900e1bcd0b0.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, signInWithGoogle, signInWithFacebook, loading, isAuthenticated, user } = useAuth();
  
  // ReturnUrl'i al - önce state'den, sonra query param'dan, default ana sayfaya dön
  const getReturnUrl = () => {
    const fromState = (location.state as { from?: string })?.from;
    const fromQuery = searchParams.get('returnUrl') || searchParams.get('redirect');
    const rawUrl = fromState || fromQuery || '/';
    
    // Geçersiz URL'leri filtrele
    if (!rawUrl || rawUrl === '/giris' || rawUrl === '/kayit' || rawUrl === '/kayit-ol') {
      return '/';
    }
    
    // URL geçerliyse döndür
    return rawUrl;
  };
  
  const returnUrl = getReturnUrl();
  
  // Kullanıcı zaten giriş yapmışsa returnUrl'e yönlendir
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('[LOGIN PAGE] User already authenticated, redirecting to:', returnUrl);
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, user, returnUrl, navigate]);

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Aktif tab state'i - URL'ye göre başlangıç değeri
  const [activeTab, setActiveTab] = useState<string>(() => {
    return location.pathname === '/kayit' || location.pathname === '/kayit-ol' ? 'register' : 'login';
  });

  // URL değiştiğinde tab'ı güncelle (navbar/footer linkleri için)
  useEffect(() => {
    const newTab = (location.pathname === '/kayit' || location.pathname === '/kayit-ol') ? 'register' : 'login';
    setActiveTab(newTab);
  }, [location.pathname]);

  // Tab değiştiğinde URL'yi güncelle
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Ana sayfa default olduğu için, sadece farklı bir sayfa varsa returnUrl ekle
    const returnUrlParam = returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    if (value === 'register') {
      navigate(`/kayit${returnUrlParam}`);
    } else {
      navigate(`/giris${returnUrlParam}`);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Loading mesajı göster
      const loadingToast = toast.loading('Giriş yapılıyor...', {
        description: 'Hesap bilgileriniz doğrulanıyor',
      });

      const result = await signIn(loginData.email, loginData.password);
      
      // Loading toast'ı kapat
      toast.dismiss(loadingToast);
      
      if (result.success) {
        toast.success('Giriş Başarılı!', {
          description: returnUrl === '/' ? 'Ana sayfaya yönlendiriliyorsunuz...' : 'Yönlendiriliyorsunuz...',
        });
        
        setTimeout(() => {
          navigate(returnUrl);
        }, 500);
      } else {
        // Daha açıklayıcı hata mesajları
        if (result.error?.includes('Invalid login credentials') || result.error?.includes('invalid_credentials')) {
          toast.error('E-posta veya Şifre Hatalı!', {
            description: 'Hesabınız yok mu? Kayıt Ol sekmesine geçin.',
            duration: 5000,
            action: {
              label: 'Kayıt Ol',
              onClick: () => {
                setActiveTab('register');
                const returnUrlParam = returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
                navigate(`/kayit${returnUrlParam}`);
              }
            },
          });
        } else if (result.error?.includes('Email not confirmed')) {
          toast.error('E-posta Onaylanmamış!', {
            description: 'Lütfen e-posta adresinizi onaylayın.',
            duration: 5000,
          });
        } else {
          toast.error('Giriş Başarısız!', {
            description: result.error || 'Bir hata oluştu. Lütfen tekrar deneyin.',
            duration: 5000,
          });
        }
      }
    } catch (error) {
      toast.error('Bir Hata Oluştu!', {
        description: 'Lütfen tekrar deneyin.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const loadingToast = toast.loading('Google ile bağlanılıyor...', {
        description: 'Google hesabınıza yönlendiriliyorsunuz',
      });
      
      const result = await signInWithGoogle();
      
      toast.dismiss(loadingToast);
      
      if (!result.success) {
        // Provider aktif değil hatası
        if (result.error?.includes('not enabled') || result.error?.includes('disabled')) {
          console.info('💡 Google OAuth kurulum bilgisi için /SOSYAL_GIRIS_KURULUM.md dosyasına bakın');
          toast.error('Google Girişi Henüz Aktif Değil', {
            description: 'Bu özellik şu anda kullanılamıyor. Lütfen e-posta ile giriş yapın.',
            duration: 7000,
          });
        } else {
          toast.error('Google Girişi Başarısız!', {
            description: result.error || 'Lütfen tekrar deneyin veya e-posta ile giriş yapın.',
            duration: 5000,
          });
        }
      }
      // Başarılı ise yönlendirme otomatik olacak (popup açılır)
    } catch (error: any) {
      toast.error('Bir Hata Oluştu!', {
        description: error?.message || 'Lütfen tekrar deneyin.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    try {
      const loadingToast = toast.loading('Facebook ile bağlanılıyor...', {
        description: 'Facebook hesabınıza yönlendiriliyorsunuz',
      });
      
      const result = await signInWithFacebook();
      
      toast.dismiss(loadingToast);
      
      if (!result.success) {
        // Provider aktif değil hatası
        if (result.error?.includes('not enabled') || result.error?.includes('disabled')) {
          console.info('💡 Facebook OAuth kurulum bilgisi için /SOSYAL_GIRIS_KURULUM.md dosyasına bakın');
          toast.error('Facebook Girişi Henüz Aktif Değil', {
            description: 'Bu özellik şu anda kullanılamıyor. Lütfen e-posta ile giriş yapın.',
            duration: 7000,
          });
        } else {
          toast.error('Facebook Girişi Başarısız!', {
            description: result.error || 'Lütfen tekrar deneyin veya e-posta ile giriş yapın.',
            duration: 5000,
          });
        }
      }
      // Başarılı ise yönlendirme otomatik olacak (popup açılır)
    } catch (error: any) {
      toast.error('Bir Hata Oluştu!', {
        description: error?.message || 'Lütfen tekrar deneyin.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Şifre kontrolü
    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Şifreler Eşleşmiyor!', {
        description: 'Lütfen şifrenizi tekrar kontrol edin.',
      });
      return;
    }
    
    // Şifre uzunluğu kontrolü
    if (registerData.password.length < 6) {
      toast.error('Şifre Çok Kısa!', {
        description: 'Şifreniz en az 6 karakter olmalıdır.',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await signUp(
        registerData.email,
        registerData.password,
        registerData.name,
        registerData.phone
      );
      
      if (result.success) {
        // ✅ YENİ: Session kontrolü - eğer MANUAL_LOGIN_REQUIRED flagı varsa
        if (result.error === 'MANUAL_LOGIN_REQUIRED') {
          // Context'te zaten toast gösterildi
          // Kayıt formunu temizle
          setRegisterData({
            name: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
          });
          
          // Giriş sekmesine geç ve email'i otomatik doldur
          setLoginData({
            email: registerData.email,
            password: '',
          });
          
          setTimeout(() => {
            setActiveTab('login');
            const returnUrlParam = returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
            navigate(`/giris${returnUrlParam}`);
          }, 1500);
          
          return;
        }
        
        // Normal başarılı kayıt - otomatik giriş yapıldı
        toast.success('🎉 Hoş Geldiniz!', {
          description: `${registerData.name}, hesabınız başarıyla oluşturuldu!`,
          duration: 4000,
        });

        // Profil tamamlama hatırlatması
        setTimeout(() => {
          toast.info('📋 Profil Bilgilerinizi Tamamlayın', {
            description: 'Adres bilgilerinizi ekleyerek siparişlerinizi daha hızlı tamamlayabilirsiniz.',
            duration: 6000,
            action: {
              label: 'Profilimi Tamamla',
              onClick: () => {
                navigate('/profil');
              }
            },
          });
        }, 1500);
        
        // Ana sayfaya yönlendir
        setTimeout(() => {
          navigate(returnUrl);
        }, 2000);
      } else {
        // Özel hata mesajları
        if (result.error?.includes('zaten kayıtlı') || result.error?.includes('already registered')) {
          toast.error('E-posta Zaten Kayıtlı!', {
            description: 'Bu e-posta adresi zaten kullanımda. Lütfen giriş yapın.',
            duration: 5000,
            action: {
              label: 'Giriş Yap',
              onClick: () => {
                setActiveTab('login');
                const returnUrlParam = returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
                navigate(`/giris${returnUrlParam}`);
              }
            },
          });
        } else if (result.error?.includes('şifre') || result.error?.includes('password')) {
          toast.error('Şifre Çok Kısa!', {
            description: result.error || 'Şifreniz en az 6 karakter olmalıdır.',
          });
        } else {
          toast.error('Kayıt Başarısız!', {
            description: result.error || 'Kayıt sırasında bir hata oluştu.',
          });
        }
      }
    } catch (error) {
      toast.error('Bir Hata Oluştu!', {
        description: 'Lütfen tekrar deneyin.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e3a8a] via-[#1e3a8a] to-[#f97316] flex items-center justify-center py-12 pt-24 px-4 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"></div>
      </div>



      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-white mb-1">Hoş Geldiniz</h1>
          <p className="text-gray-200 text-sm">Ersin Spot'a giriş yapın veya kayıt olun</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Giriş Yap</TabsTrigger>
                <TabsTrigger value="register">Kayıt Ol</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <Label htmlFor="login-email" className="mb-2 block">E-posta</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="ornek@email.com"
                        className="pl-10"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                        title="Geçerli bir e-posta adresi giriniz (örn: kullanici@ornek.com)"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="login-password" className="mb-2 block">Şifre</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <Link 
                      to="/sifremi-unuttum" 
                      className="text-sm text-[#f97316] hover:text-[#ea580c] hover:underline transition-colors duration-200 font-medium flex items-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Şifrenizi mi unuttunuz?
                    </Link>
                  </div>

                  <Button type="submit" className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] hover:shadow-lg hover:scale-[1.02] transition-all duration-200" size="lg" disabled={isLoading}>
                    {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                  </Button>

                  {/* Ayırıcı */}
                  <div className="relative my-6">
                    <Separator className="my-4" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-gray-500">
                      veya
                    </span>
                  </div>

                  {/* Social Login Butonları */}
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 hover:bg-gray-50 hover:border-[#4285F4] transition-all"
                      size="lg"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google ile Giriş Yap
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 hover:bg-gray-50 hover:border-[#1877F2] transition-all"
                      size="lg"
                      onClick={handleFacebookSignIn}
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook ile Giriş Yap
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-6">
                  <div>
                    <Label htmlFor="register-name" className="mb-2 block">Ad Soyad</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="register-name"
                        placeholder="Ad Soyad"
                        className="pl-10"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="register-email" className="mb-2 block">E-posta</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="ornek@email.com"
                        className="pl-10"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                        title="Geçerli bir e-posta adresi giriniz (örn: kullanici@ornek.com)"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="register-phone" className="mb-2 block">Telefon</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="05XX XXX XX XX"
                        className="pl-10"
                        value={registerData.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ''); // Sadece rakamlar
                          if (value.length <= 11) { // Max 11 hane (05551234567)
                            setRegisterData({ ...registerData, phone: value });
                          }
                        }}
                        pattern="[0-9]{10,11}"
                        title="Geçerli bir telefon numarası giriniz (10-11 hane, sadece rakam)"
                        maxLength={11}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="register-password" className="mb-2 block">Şifre</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, password: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="register-confirm-password" className="mb-2 block">Şifre Tekrar</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="register-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={registerData.confirmPassword}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, confirmPassword: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-[#f97316] hover:bg-[#ea580c] hover:shadow-lg hover:scale-[1.02] transition-all duration-200" size="lg" disabled={isLoading}>
                    {isLoading ? 'Kayıt Olunuyor...' : 'Kayıt Ol'}
                  </Button>

                  {/* Ayırıcı */}
                  <div className="relative my-6">
                    <Separator className="my-4" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-gray-500">
                      veya
                    </span>
                  </div>

                  {/* Social Login Butonları */}
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 hover:bg-gray-50 hover:border-[#4285F4] transition-all"
                      size="lg"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google ile Kayıt Ol
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 hover:bg-gray-50 hover:border-[#1877F2] transition-all"
                      size="lg"
                      onClick={handleFacebookSignIn}
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook ile Kayıt Ol
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-gray-200 text-sm">
            Misafir olarak devam etmek için{' '}
            <Link to="/" className="text-white hover:underline">
              ana sayfaya
            </Link>{' '}
            dönebilirsiniz
          </p>
        </div>
      </div>
    </div>
  );
}