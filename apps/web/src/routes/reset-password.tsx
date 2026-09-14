/**
 * Şifre sıfırlama.
 *
 * "Şifremi unuttum" e-postasındaki bağlantının indiği sayfa. Sunucu
 * `${WEB_ORIGIN}/sifre-sifirla?token=...` adresini yazıyordu ama bu sayfa hiç
 * yoktu: şifresini unutan kimse şifresini yenileyemiyordu.
 *
 * Jeton adres çubuğundan okunur ve gizli bir alanla forma taşınır. Kullanıcıya
 * gösterilmez — okunacak bir bilgi değildir, yalnızca isteğin yanında gitmesi
 * gerekir.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheck, CircleX } from 'lucide-react';
import { ApiError, PASSWORD_HINT, resetPasswordSchema } from '@ersinspot/shared';
import type { ResetPasswordInput } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { TextField } from '@/components/ui/form-field.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { useResetPassword } from '@/features/auth';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', passwordConfirm: '' },
  });

  function onSubmit(values: ResetPasswordInput): void {
    resetPassword.mutate(values, {
      onError: (error) => {
        if (error instanceof ApiError) {
          for (const field of error.fields) {
            setError(field.path as keyof ResetPasswordInput, { message: field.message });
          }

          if (error.fields.length === 0) {
            setError('root', { message: error.message });
          }
        } else {
          setError('root', { message: 'Şifre değiştirilemedi. Lütfen tekrar deneyin.' });
        }
      },
    });
  }

  if (token === '') {
    return (
      <PageContainer width="narrow">
        <PageHeader
          align="center"
          icon={CircleX}
          title="Bağlantı eksik"
          description="Sıfırlama bağlantısı geçersiz görünüyor. E-postadaki bağlantıyı olduğu gibi kopyalayıp tarayıcınıza yapıştırmayı deneyin."
        />

        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link to="/sifremi-unuttum">Yeni bağlantı iste</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <PageContainer width="narrow">
        <PageHeader
          align="center"
          icon={CircleCheck}
          title="Şifreniz değiştirildi"
          description="Yeni şifrenizle giriş yapabilirsiniz. Güvenliğiniz için diğer cihazlardaki oturumlarınız sonlandırıldı."
        />

        <div className="mt-8 text-center">
          <Button asChild>
            <Link to="/giris">Giriş yap</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
      <PageHeader
        title="Yeni Şifre Belirleyin"
        description="Hesabınız için yeni bir şifre girin. Uzun bir şifre, karmaşık bir şifreden daha güvenlidir."
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

        {/* Jeton kullanıcıya gösterilmez; yalnızca istekle birlikte gider. */}
        <input type="hidden" {...register('token')} />

        <TextField
          label="Yeni Şifre"
          required
          type="password"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          error={errors.password?.message}
          {...register('password')}
        />

        <TextField
          label="Yeni Şifre (tekrar)"
          required
          type="password"
          autoComplete="new-password"
          error={errors.passwordConfirm?.message}
          {...register('passwordConfirm')}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isSubmitting || resetPassword.isPending}
        >
          Şifreyi değiştir
        </Button>
      </form>
    </PageContainer>
  );
}
