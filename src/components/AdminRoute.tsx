import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react@0.487.0';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAdmin, loading: authLoading, checkAdminStatus } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      if (authLoading) {
        console.log('[ADMIN-ROUTE] ⏳ Auth yükleniyor...');
        return;
      }
      
      if (!user) {
        console.log('[ADMIN-ROUTE] ❌ Kullanıcı yok');
        setChecking(false);
        return;
      }

      console.log('[ADMIN-ROUTE] 🔍 Admin yetkisi kontrol ediliyor...', user.email);
      // Admin durumunu tekrar kontrol et
      const isAdminUser = await checkAdminStatus();
      console.log('[ADMIN-ROUTE] Sonuç:', isAdminUser ? '✅ Admin' : '❌ Admin değil');
      setChecking(false);
    };

    verifyAdmin();
  }, [user, authLoading, checkAdminStatus]);

  // Loading durumu
  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--brand-navy-600)] mx-auto mb-4" />
          <p className="text-gray-600">Yetki kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // Kullanıcı giriş yapmamış - Admin login'e yönlendir
  if (!user) {
    console.log('[ADMIN-ROUTE] Giriş yapılmamış. Admin login sayfasına yönlendiriliyor...');
    return <Navigate to="/admin/giris" state={{ from: location.pathname }} replace />;
  }

  // Admin yetkisi yok
  if (!isAdmin) {
    console.log('[ADMIN-ROUTE] ℹ️ Admin yetkisi yok:', user.email);
    console.log('[ADMIN-ROUTE] Bu hesap müşteri hesabıdır. Admin girişi için /admin/setup sayfasından yeni admin hesabı oluşturun.');
    return <Navigate to="/admin/giris" replace />;
  }

  // Admin yetkisi var - içeriği göster
  return <>{children}</>;
}
