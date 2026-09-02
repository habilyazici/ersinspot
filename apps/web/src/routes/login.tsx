import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError, loginSchema } from '@ersinspot/shared';
import type { LoginInput } from '@ersinspot/shared';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { Button } from '@/components/ui/button.tsx';
import { CheckboxField } from '@/components/ui/choice-field.tsx';
import { TextField } from '@/components/ui/form-field.tsx';
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

        <TextField
          label="E-posta"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <TextField
            label="Şifre"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <Link
            to="/sifremi-unuttum"
            className="mt-1 inline-block text-sm text-brand-navy-700 hover:underline"
          >
            Şifremi unuttum
          </Link>
        </div>

        <CheckboxField label="Beni hatırla" {...register('rememberMe')} />

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
