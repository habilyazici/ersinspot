import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Shield, CheckCircle } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner@2.0.3';
import { createClient } from '@supabase/supabase-js@2.48.1';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Supabase client oluştur
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      // Şifre sıfırlama e-postası gönder
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/sifre-sifirlama`,
      });

      if (error) {
        console.error('Reset password error:', error);
        toast.error('Hata!', {
          description: 'Şifre sıfırlama bağlantısı gönderilemedi. Lütfen e-posta adresinizi kontrol edin.',
        });
      } else {
        setIsSubmitted(true);
        toast.success('E-posta Gönderildi!', {
          description: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
        });
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

  const handleBackToLogin = () => {
    navigate('/giris');
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1e3a8a] via-[#1e3a8a] to-[#f97316] flex items-center justify-center py-12 pt-24 px-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <Card className="border-2 border-green-200 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                
                <h2 className="mb-3 text-green-800">E-posta Gönderildi!</h2>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800 mb-2">
                    <strong>{email}</strong> adresine şifre sıfırlama bağlantısı gönderdik.
                  </p>
                  <p className="text-sm text-green-700">
                    Lütfen gelen kutunuzu kontrol edin ve e-postadaki talimatları izleyin.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-xs text-blue-800 mb-2">
                    <strong>💡 İpucu:</strong> E-posta gelmedi mi?
                  </p>
                  <ul className="text-xs text-blue-700 text-left space-y-1">
                    <li>• Spam/gereksiz klasörünü kontrol edin</li>
                    <li>• E-posta adresinizi doğru yazdığınızdan emin olun</li>
                    <li>• 5-10 dakika bekleyip tekrar deneyin</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleBackToLogin}
                    className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                    size="lg"
                  >
                    Giriş Sayfasına Dön
                  </Button>
                  
                  <Button
                    onClick={() => setIsSubmitted(false)}
                    variant="outline"
                    className="w-full border-2 hover:bg-gray-50 hover:shadow-md transition-all duration-200"
                    size="lg"
                  >
                    Tekrar Gönder
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
        {/* Geri Dön Linki */}
        <Link
          to="/giris"
          className="inline-flex items-center gap-2 text-white hover:text-gray-200 transition-colors mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Giriş sayfasına dön</span>
        </Link>

        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white mb-2">Şifrenizi mi Unuttunuz?</h1>
          <p className="text-gray-200 text-sm">
            E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bilgilendirme */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900 mb-1">
                      <strong>Nasıl Çalışır?</strong>
                    </p>
                    <p className="text-xs text-blue-700">
                      Kayıtlı e-posta adresinize güvenli bir şifre sıfırlama bağlantısı göndereceğiz. 
                      Bu bağlantı 1 saat geçerli olacaktır.
                    </p>
                  </div>
                </div>
              </div>

              {/* E-posta Input */}
              <div>
                <Label htmlFor="email" className="mb-2 block">
                  E-posta Adresi
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                    title="Geçerli bir e-posta adresi giriniz (örn: kullanici@ornek.com)"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Hesabınıza kayıtlı e-posta adresini girin
                </p>
              </div>

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
                    Gönderiliyor...
                  </>
                ) : (
                  'Sıfırlama Bağlantısı Gönder'
                )}
              </Button>

              {/* Güvenlik Bilgisi */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex gap-2 text-xs text-gray-600">
                  <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-gray-800">Güvenlik:</strong> Kimse size şifrenizi sormayacaktır. 
                    Sadece kendi belirlediğiniz güvenli bir şifre kullanın.
                  </p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Alt Bilgi */}
        <div className="text-center mt-6">
          <p className="text-gray-200 text-sm">
            Hesabınız yok mu?{' '}
            <Link to="/kayit" className="text-white hover:underline">
              Hemen kayıt olun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}