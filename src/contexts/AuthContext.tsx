import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  user_metadata: {
    name: string;
    phone?: string;
  };
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;  // ✅ Eklendi - Kullanıcı giriş yapmış mı?
  isAdmin: boolean;  // ✅ YENİ - Admin yetkisi var mı?
  accessToken: string | null;  // ✅ Eklendi - Navbar için
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithFacebook: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  checkAdminStatus: () => Promise<boolean>;  // ✅ YENİ - Admin durumunu kontrol et
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin durumunu kontrol et - useCallback ile sarmalanmış
  const checkAdminStatus = useCallback(async (): Promise<boolean> => {
    try {
      const storedSession = localStorage.getItem('auth_session');
      if (!storedSession) {
        console.log('[AUTH] ❌ Session yok - admin değil');
        setIsAdmin(false);
        return false;
      }

      const parsedSession = JSON.parse(storedSession) as Session;
      console.log('[AUTH] 🔍 Admin kontrolü yapılıyor...', parsedSession.user.email);
      
      const response = await fetch(`${API_URL}/auth/check-admin`, {
        headers: {
          'Authorization': `Bearer ${parsedSession.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const adminStatus = data.isAdmin || false;
        setIsAdmin(adminStatus);
        console.log('[AUTH] ✅ Admin durumu:', adminStatus, '- Email:', parsedSession.user.email);
        if (!adminStatus) {
          console.log('[AUTH] ℹ️ Bu hesap müşteri hesabıdır (admin değil)');
        }
        return adminStatus;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown' }));
        console.error('[AUTH] ❌ Admin check başarısız:', response.status, errorData);
        setIsAdmin(false);
        return false;
      }
    } catch (error) {
      console.error('[AUTH] ❌ Admin check exception:', error);
      setIsAdmin(false);
      return false;
    }
  }, []); // Boş dependency array - fonksiyon sadece bir kez oluşturulur

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedSession = localStorage.getItem('auth_session');
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession) as Session;
          
          // Verify token with backend
          const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${parsedSession.access_token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            
            // Backend hata döndü mü kontrol et (shouldLogout flag)
            if (data.shouldLogout || !data.user) {
              console.log('[AUTH] Session invalid - clearing storage and logging out');
              localStorage.removeItem('auth_session');
              localStorage.removeItem('isAuthenticated');
              setUser(null);
              setSession(null);
              setIsAdmin(false);
            } else {
              setUser(data.user);
              setSession(parsedSession);
              // Admin durumunu kontrol et
              await checkAdminStatus();
            }
          } else {
            // Token invalid, clear storage
            console.log('[AUTH] Token verification failed - clearing storage');
            localStorage.removeItem('auth_session');
            localStorage.removeItem('isAuthenticated');
            setUser(null);
            setSession(null);
            setIsAdmin(false);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        localStorage.removeItem('auth_session');
        localStorage.removeItem('isAuthenticated');
        setUser(null);
        setSession(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [checkAdminStatus]);

  const signUp = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password, name, phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Sign up failed' };
      }

      // ✅ YENİ: Session olup olmadığını kontrol et
      if (!data.session) {
        console.log('[AUTH] Kayıt başarılı ama session yok - manuel giriş gerekli');
        
        // Eğer backend'den mesaj varsa göster
        if (data.message) {
          toast.info(data.message);
        } else {
          toast.success('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
        }
        
        return { 
          success: true, // ✅ Kullanıcı oluşturuldu - success: true döndür
          error: 'MANUAL_LOGIN_REQUIRED' // Özel flag - UI'da redirect için kullan
        };
      }

      // Save session
      const sessionData: Session = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: data.user,
      };

      localStorage.setItem('auth_session', JSON.stringify(sessionData));
      localStorage.setItem('isAuthenticated', 'true');
      
      setUser(data.user);
      setSession(sessionData);

      return { success: true };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message || 'Kayıt sırasında bir hata oluştu' };
    }
  }, [checkAdminStatus]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Sign in failed' };
      }

      // Save session
      const sessionData: Session = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: data.user,
      };

      localStorage.setItem('auth_session', JSON.stringify(sessionData));
      localStorage.setItem('isAuthenticated', 'true');
      
      setUser(data.user);
      setSession(sessionData);
      
      // Admin durumunu kontrol et
      await checkAdminStatus();

      return { success: true };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message || 'Sign in failed' };
    }
  }, [checkAdminStatus]);

  const signInWithGoogle = useCallback(async () => {
    try {
      console.log('[AUTH] Google ile giriş başlatılıyor...');
      
      // Supabase ile doğrudan Google OAuth başlat
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('[AUTH] Google giriş hatası:', error);
        
        // Provider aktif değil hatası
        if (error.message?.includes('not enabled') || error.message?.includes('disabled')) {
          console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.warn('⚠️ GOOGLE OAUTH KURULUMU GEREKLİ!');
          console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.warn('Google ile giriş özelliği kullanmak için:');
          console.warn('1. Supabase Dashboard > Authentication > Providers > Google');
          console.warn('2. Detaylı kurulum için: /OAUTH_SETUP.md dosyasına bakın');
          console.warn('3. Kılavuz: https://supabase.com/docs/guides/auth/social-login/auth-google');
          console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
        
        return { success: false, error: error.message };
      }

      console.log('[AUTH] Google yönlendirmesi başlatıldı');
      return { success: true };
    } catch (error: any) {
      console.error('[AUTH] Google giriş exception:', error);
      return { success: false, error: error.message || 'Google ile giriş başarısız oldu' };
    }
  }, []);

  const signInWithFacebook = useCallback(async () => {
    try {
      console.log('[AUTH] Facebook ile giriş başlatılıyor...');
      
      // Supabase ile doğrudan Facebook OAuth başlat
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('[AUTH] Facebook giriş hatası:', error);
        
        // Provider aktif değil hatası
        if (error.message?.includes('not enabled') || error.message?.includes('disabled')) {
          console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.warn('⚠️ FACEBOOK OAUTH KURULUMU GEREKLİ!');
          console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.warn('Facebook ile giriş özelliği kullanmak için:');
          console.warn('1. Supabase Dashboard > Authentication > Providers > Facebook');
          console.warn('2. Detaylı kurulum için: /OAUTH_SETUP.md dosyasına bakın');
          console.warn('3. Kılavuz: https://supabase.com/docs/guides/auth/social-login/auth-facebook');
          console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
        
        return { success: false, error: error.message };
      }

      console.log('[AUTH] Facebook yönlendirmesi başlatıldı');
      return { success: true };
    } catch (error: any) {
      console.error('[AUTH] Facebook giriş exception:', error);
      return { success: false, error: error.message || 'Facebook ile giriş başarısız oldu' };
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('[AUTH CONTEXT] 🚪 Çıkış başlatılıyor...');
    
    try {
      if (session?.access_token) {
        console.log('[AUTH CONTEXT] 📡 Backend\'e çıkış isteği gönderiliyor...');
        const response = await fetch(`${API_URL}/auth/signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        
        if (response.ok) {
          console.log('[AUTH CONTEXT] ✅ Backend çıkış başarılı');
        } else {
          console.log('[AUTH CONTEXT] ⚠️ Backend çıkış hatası (yine de temizlik yapılacak)');
        }
      } else {
        console.log('[AUTH CONTEXT] ⚠️ Session yok - sadece local temizlik');
      }
    } catch (error) {
      console.error('[AUTH CONTEXT] ❌ Çıkış hatası:', error);
    } finally {
      // Clear local state regardless of API call success
      console.log('[AUTH CONTEXT] 🧹 LocalStorage ve state temizleniyor...');
      localStorage.removeItem('auth_session');
      localStorage.removeItem('isAuthenticated');
      
      // Cart ve favorites'i de temizle
      localStorage.removeItem('cart_items');
      localStorage.removeItem('favorites');
      
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      
      console.log('[AUTH CONTEXT] ✅ Çıkış tamamlandı - tüm veriler temizlendi');
    }
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: !!session,  // ✅ Eklendi - Kullanıcı giriş yapmış mı?
        isAdmin,  // ✅ YENİ - Admin yetkisi var mı?
        accessToken: session?.access_token || null,  // ✅ Eklendi - Navbar için
        signUp,
        signIn,
        signInWithGoogle,
        signInWithFacebook,
        signOut,
        checkAdminStatus,  // ✅ YENİ - Admin durumunu kontrol et
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}