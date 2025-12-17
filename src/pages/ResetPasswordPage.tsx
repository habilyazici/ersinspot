import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Shield, CheckCircle, Eye, EyeOff } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner@2.0.3';
import { createClient } from '@supabase/supabase-js@2.48.1';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    // URL'den token kontrolü
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    if (accessToken) {
      setIsValidToken(true);
    } else {
      toast.error('Geçersiz Link!', {
        description: 'Şifre sıfırlama linki geçersiz veya süresi dolmuş.',
      });
      setTimeout(() => {
        navigate('/sifremi-unuttum');
      }, 2000);
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Şifre doğrulama
    if (newPassword.length < 6) {
      toast.error('Şifre Çok Kısa!', {
        description: 'Şifreniz en az 6 karakter olmalıdır.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Şifreler Eşleşmiyor!', {
        description: 'Lütfen şifrelerin aynı olduğundan emin olun.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      // Şifreyi güncelle
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Password update error:', error);
        toast.error('Hata!', {
          description: 'Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin.',
        });
      } else {
        toast.success('Şifre Güncellendi!', {
          description: 'Şifreniz başarıyla değiştirildi. Giriş sayfasına yönlendiriliyorsunuz...',
        });
        
        setTimeout(() => {
          navigate('/giris');
        }, 2000);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Bir Hata Oluştu!', {
        description: 'Lütfen daha sonra tekrar deneyin.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1e3a8a] via-[#1e3a8a] to-[#f97316] flex items-center justify-center py-12 pt-24 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4">Kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e3a8a] via-[#1e3a8a] to-[#f97316] flex items-center justify-center py-12 pt-24 px-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white mb-2">Yeni Şifre Oluşturun</h1>
          <p className="text-gray-200 text-sm">
            Hesabınız için yeni bir şifre belirleyin
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bilgilendirme */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900 mb-1">
                      <strong>Güçlü Şifre Oluşturun</strong>
                    </p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• En az 6 karakter uzunluğunda olmalı</li>
                      <li>• Büyük ve küçük harf kullanın</li>
                      <li>• Rakam ve özel karakter ekleyin</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Yeni Şifre */}
              <div>
                <Label htmlFor="new-password" className="mb-2 block">
                  Yeni Şifre
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="En az 6 karakter"
                    className="pl-10 pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
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

              {/* Şifre Tekrar */}
              <div>
                <Label htmlFor="confirm-password" className="mb-2 block">
                  Şifre Tekrar
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Şifrenizi tekrar girin"
                    className="pl-10 pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Şifreler eşleşmelidir
                </p>
              </div>

              {/* Şifre Gücü Göstergesi */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          newPassword.length >= level * 2
                            ? newPassword.length >= 12
                              ? 'bg-green-500'
                              : newPassword.length >= 8
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">
                    Şifre gücü:{' '}
                    <span
                      className={
                        newPassword.length >= 12
                          ? 'text-green-600 font-medium'
                          : newPassword.length >= 8
                          ? 'text-yellow-600 font-medium'
                          : 'text-red-600 font-medium'
                      }
                    >
                      {newPassword.length >= 12
                        ? 'Güçlü'
                        : newPassword.length >= 8
                        ? 'Orta'
                        : 'Zayıf'}
                    </span>
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#f97316] hover:bg-[#ea580c] hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Güncelleniyor...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Şifreyi Güncelle
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
