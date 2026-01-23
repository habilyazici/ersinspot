import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react@0.487.0';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[AUTH CALLBACK] OAuth callback işleniyor...');

        // Supabase session'ı al
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          `https://${projectId}.supabase.co`,
          publicAnonKey
        );

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AUTH CALLBACK] Session hatası:', sessionError);
          setError(sessionError.message);
          toast.error('Giriş başarısız oldu', {
            description: sessionError.message,
          });
          setTimeout(() => navigate('/giris'), 2000);
          return;
        }

        if (!session) {
          console.error('[AUTH CALLBACK] Session bulunamadı');
          setError('Oturum bulunamadı');
          toast.error('Giriş başarısız oldu', {
            description: 'Oturum bilgileri alınamadı',
          });
          setTimeout(() => navigate('/giris'), 2000);
          return;
        }

        console.log('[AUTH CALLBACK] Session alındı:', session.user.email);

        // Backend'e kullanıcı kaydını kontrol et veya oluştur
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/auth/oauth-callback`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Kullanıcı',
              provider: session.user.app_metadata?.provider,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('[AUTH CALLBACK] Backend hatası:', errorData);
          setError(errorData.error || 'Backend hatası');
          toast.error('Hesap oluşturulamadı', {
            description: errorData.error || 'Bir hata oluştu',
          });
          setTimeout(() => navigate('/giris'), 2000);
          return;
        }

        const data = await response.json();
        console.log('[AUTH CALLBACK] Backend yanıtı:', data);

        // Session'ı localStorage'a kaydet
        const sessionData = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at || 0,
          user: {
            id: session.user.id,
            email: session.user.email!,
            user_metadata: {
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Kullanıcı',
              phone: session.user.user_metadata?.phone || '',
            },
          },
        };

        localStorage.setItem('auth_session', JSON.stringify(sessionData));
        localStorage.setItem('isAuthenticated', 'true');

        // Başarılı giriş mesajı
        toast.success('🎉 Hoş Geldiniz!', {
          description: `${sessionData.user.user_metadata.name}, başarıyla giriş yaptınız!`,
          duration: 3000,
        });

        // Ana sayfaya yönlendir
        console.log('[AUTH CALLBACK] Ana sayfaya yönlendiriliyor...');
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);

      } catch (error: any) {
        console.error('[AUTH CALLBACK] Exception:', error);
        setError(error.message || 'Bilinmeyen hata');
        toast.error('Bir hata oluştu', {
          description: error.message || 'Lütfen tekrar deneyin',
        });
        setTimeout(() => navigate('/giris'), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e3a8a] via-[#1e3a8a] to-[#f97316] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
        <h2 className="text-white text-xl mb-2">
          {error ? 'Hata Oluştu' : 'Giriş Yapılıyor...'}
        </h2>
        <p className="text-white/80 text-sm">
          {error || 'Lütfen bekleyin, hesabınız doğrulanıyor'}
        </p>
      </div>
    </div>
  );
}
