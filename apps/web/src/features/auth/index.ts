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
  useRegister,
  useResendVerification,
  useResetPassword,
  useUpdateProfile,
  useVerifyEmail,
} from './api.ts';

export { RequireAuth, RequireStaff } from './route-guards.tsx';
