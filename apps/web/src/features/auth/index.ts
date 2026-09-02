/**
 * auth özellik modülü — genel sözleşme.
 *
 * Diğer özellik modülleri yalnızca buradan içe aktarır.
 */

export { useAuth } from './use-auth.ts';
export type { AuthState } from './use-auth.ts';

export {
  authKeys,
  useChangePassword,
  useCurrentUser,
  useForgotPassword,
  useLogin,
  useLogout,
  useLogoutAllOtherSessions,
  useRegister,
  useResendVerification,
  useResetPassword,
  useSessions,
  useUpdateProfile,
  useVerifyEmail,
} from './api.ts';

export type { ActiveSession } from './api.ts';

export { RequireAdmin, RequireAuth, RequireStaff } from './route-guards.tsx';
