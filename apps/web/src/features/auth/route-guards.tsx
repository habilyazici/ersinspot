/**
 * Rota koruyucuları.
 *
 * ÖNEMLİ: Bunlar bir güvenlik önlemi DEĞİLDİR — yalnızca kullanıcı deneyimidir.
 * Gerçek yetkilendirme sunucuda, rota tanımlarında yapılır. Tarayıcıdaki
 * hiçbir kontrol güvenlik kararı sayılmaz; kullanıcı JavaScript'i değiştirip
 * bu koruyucuyu atlarsa yalnızca boş bir sayfa görür, veri alamaz.
 */

import type { ReactNode } from 'react';
import type { UserRole } from '@ersinspot/shared';
import { Navigate, useLocation } from 'react-router-dom';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { useAuth } from './use-auth.ts';

/** Oturum gerektiren sayfaları sarmalar. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageSpinner label="Oturum kontrol ediliyor" />;

  if (!isAuthenticated) {
    // Girişten sonra kullanıcıyı gitmek istediği sayfaya geri gönder.
    return <Navigate to="/giris" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

/** Personel yetkisi gerektiren sayfaları sarmalar. */
export function RequireStaff({ children }: { children: ReactNode }) {
  return <RequireRole role="staff">{children}</RequireRole>;
}

/**
 * Yönetici yetkisi gerektiren sayfaları sarmalar.
 *
 * Site ayarları gibi, personelin göremeyeceği bölümler için. Menüde bağlantıyı
 * gizlemek yeterli değildir: adres elle yazıldığında sayfa açılır ve kullanıcı
 * boş bir ekranla ya da yetki hatasıyla karşılaşır.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  return <RequireRole role="admin">{children}</RequireRole>;
}

function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageSpinner label="Yetki kontrol ediliyor" />;

  if (!isAuthenticated) {
    return <Navigate to="/giris" state={{ from: location.pathname }} replace />;
  }

  // Yetkisi yetmeyen kullanıcı vitrine döner; "yetkiniz yok" sayfası göstermek
  // panelin varlığını gereksizce duyurur.
  if (!hasRole(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
