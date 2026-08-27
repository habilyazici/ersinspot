import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError, loginSchema } from '@ersinspot/shared';
import type { LoginInput } from '@ersinspot/shared';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useAuth, useLogin } from '@/features/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  // Girişten sonra kullanıcıyı gitmek istediği sayfaya gönder.
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/';

  if (!isLoading && isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  function onSubmit(values: LoginInput): void {
    login.mutate(values, {
      onSuccess: () => {
        toast.success('Hoş geldiniz.');
        void navigate(returnTo, { replace: true });
      },

      onError: (error) => {
        if (error instanceof ApiError) {
          /*
           * Sunucu "e-posta veya şifre hatalı" der; hangisinin yanlış olduğunu
           * söylemez. Bu, geçerli e-posta adreslerinin keşfedilmesini engeller.
           * Arayüz de aynı davranışı korur: hata alan alan belirtilmez.
           */
          setError('root', { message: error.message });
        } else {
          setError('root', { message: 'Giriş yapılamadı. Lütfen tekrar deneyin.' });
        }
      },
    });
  }

  return (
    <PageContainer width="narrow">
      <PageHeader
        title="Giriş Yap"
        description={
          <>
            Hesabınız yok mu?{' '}
            <Link to="/kayit" className="font-medium text-brand-navy-700 hover:underline">
              Ücretsiz kayıt olun
            </Link>
          </>
        }
      />

      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="mt-8 space-y-4">
        {errors.root === undefined ? null : (
          <div
            role="alert"
            className="rounded-lg bg-state-danger-bg px-4 py-3 text-sm text-state-danger-fg"
          >
            {errors.root.message}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            E-posta
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email !== undefined}
            aria-describedby={errors.email === undefined ? undefined : 'email-hata'}
            {...register('email')}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          />
          {errors.email === undefined ? null : (
            <p id="email-hata" className="mt-1 text-sm text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Şifre
            </label>
            <Link to="/sifremi-unuttum" className="text-sm text-brand-navy-700 hover:underline">
              Şifremi unuttum
            </Link>
          </div>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password !== undefined}
            aria-describedby={errors.password === undefined ? undefined : 'sifre-hata'}
            {...register('password')}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          />
          {errors.password === undefined ? null : (
            <p id="sifre-hata" className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('rememberMe')} className="size-4 rounded" />
          Beni hatırla
        </label>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isSubmitting || login.isPending}
        >
          Giriş Yap
        </Button>
      </form>
    </PageContainer>
  );
}
