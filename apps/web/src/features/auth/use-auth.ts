/**
 * Oturum durumuna erişim.
 *
 * `useCurrentUser` sorgusunu sarmalayıp bileşenlerin ihtiyaç duyduğu türetilmiş
 * değerleri verir. Ayrı bir context sağlayıcıya gerek yok: sorgu önbelleği
 * zaten uygulama genelinde paylaşılıyor ve tek kaynak orası.
 */

import { useCurrentUser } from './api.ts';
import type { CurrentUser, UserRole } from '@ersinspot/shared';
import { hasRoleAtLeast } from '@ersinspot/shared';

export interface AuthState {
  readonly user: CurrentUser | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly isStaff: boolean;
  readonly isEmailVerified: boolean;
  /** Kullanıcının en az verilen rol seviyesinde olup olmadığını söyler. */
  readonly hasRole: (role: UserRole) => boolean;
}

export function useAuth(): AuthState {
  const { data, isLoading } = useCurrentUser();
  const user = data ?? null;

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    isStaff: user !== null && hasRoleAtLeast(user.role, 'staff'),
    isEmailVerified: user?.emailVerified ?? false,
    hasRole: (role) => user !== null && hasRoleAtLeast(user.role, role),
  };
}
