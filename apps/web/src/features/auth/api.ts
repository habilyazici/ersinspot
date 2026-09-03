/**
 * Kimlik doğrulama sorguları ve mutasyonları.
 *
 * Bu dosya, backend'deki `identity` modülünün karşılığıdır: ağ çağrıları
 * yalnızca burada tanımlanır, bileşenler doğrudan istek atmaz.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@ersinspot/shared';
import type {
  ChangePasswordInput,
  CurrentUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from '@ersinspot/shared';
import { apiRequest } from '@/lib/api';

export const authKeys = {
  currentUser: ['auth', 'me'] as const,
  sessions: ['auth', 'sessions'] as const,
};

/**
 * Oturum sahibini getirir.
 *
 * YALNIZCA 401 "misafir" demektir; başka her hata olduğu gibi yükselir.
 * Önceki hâlinde `catch` bloğu tüm hataları yutup `null` döndürüyordu: sunucu
 * bir an cevap veremediğinde kullanıcı oturumu kapanmış sayılıyor ve korumalı
 * bir sayfadaysa giriş ekranına atılıyordu — oysa oturumu duruyordu.
 *
 * Geçici hatalarda sorgu istemcisinin varsayılan yeniden deneme politikası
 * devreye girer; bu yüzden `retry` burada kapatılmaz.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: async (): Promise<CurrentUser | null> => {
      try {
        const response = await apiRequest<{ user: CurrentUser }>('/api/auth/me');
        return response.user;
      } catch (error) {
        if (error instanceof ApiError && error.requiresLogin) return null;
        throw error;
      }
    },
    // Oturum bilgisi sık değişmez; sekme değişiminde tekrar sorulmaz.
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiRequest<{ user: CurrentUser }>('/api/auth/login', { method: 'POST', body: input }),

    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.currentUser, data.user);
      // Sepet ve talepler kullanıcıya özeldir; giriş sonrası yeniden çekilir.
      void queryClient.invalidateQueries();
    },
  });
}

/**
 * Kayıt.
 *
 * Sunucu oturum açmaz ve adresin kayıtlı olup olmadığını ele vermez: her iki
 * durumda da aynı yanıt döner. Kullanıcı e-postasındaki doğrulama bağlantısını
 * kullandıktan sonra giriş yapar.
 */
export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiRequest<{ success: boolean }>('/api/auth/register', {
        method: 'POST',
        body: input,
      }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),

    onSuccess: () => {
      queryClient.setQueryData(authKeys.currentUser, null);
      // Kullanıcıya özel tüm veriyi temizle: sonraki kullanıcı öncekinin
      // sepetini veya siparişlerini görmemeli.
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      apiRequest<{ success: boolean; message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: input,
      }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      apiRequest<{ success: boolean }>('/api/auth/reset-password', {
        method: 'POST',
        body: input,
      }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      apiRequest<{ success: boolean; closedOtherSessions: number }>('/api/auth/change-password', {
        method: 'POST',
        body: input,
      }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiRequest<{ user: CurrentUser }>('/api/auth/profile', { method: 'PUT', body: input }),

    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.currentUser, data.user);
    },
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) =>
      apiRequest<{ success: boolean }>('/api/auth/verify-email', {
        method: 'POST',
        body: { token },
      }),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ success: boolean }>('/api/auth/resend-verification', { method: 'POST' }),
  });
}

// ---------------------------------------------------------------------------
// Oturumlar
// ---------------------------------------------------------------------------

/** Hesabın açık olduğu cihazlardan biri. */
export interface ActiveSession {
  readonly id: string;
  /** Bu oturum şu an kullanılan oturum mu? Kullanıcının kendini tanıması için. */
  readonly isCurrent: boolean;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly lastUsedAt: string;
  readonly createdAt: string;
}

export function useSessions() {
  return useQuery({
    queryKey: authKeys.sessions,
    queryFn: async () => {
      const response = await apiRequest<{ sessions: ActiveSession[] }>('/api/auth/sessions');
      return response.sessions;
    },
  });
}

/**
 * Diğer tüm cihazlardan çıkış yapar.
 *
 * Mevcut oturum korunur: kullanıcı kendini de atarsa işlemin sonucunu göremez
 * ve yeniden giriş yapmak zorunda kalırdı.
 */
export function useLogoutAllOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiRequest<{ success: boolean }>('/api/auth/logout-all', { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.sessions });
    },
  });
}
