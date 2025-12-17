import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface CustomerRouteProps {
  children: React.ReactNode;
}

/**
 * Customer Route Guard
 * Admin kullanıcıları customer sayfalarına erişemez
 * Admin hesabı sadece admin panelinde kullanılır
 */
export function CustomerRoute({ children }: CustomerRouteProps) {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Loading bitene kadar bekle
    if (loading) return;

    // Admin kullanıcıları customer sayfalarına erişemez
    if (isAdmin) {
      console.warn('[CUSTOMER ROUTE] Admin kullanıcı tespit edildi - admin paneline yönlendiriliyor');
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, loading, navigate]);

  // Admin ise hiçbir şey render etme (zaten yönlendiriliyor)
  if (isAdmin) {
    return null;
  }

  // Normal kullanıcı - içeriği göster
  return <>{children}</>;
}
