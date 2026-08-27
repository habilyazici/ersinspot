/**
 * Şifremi unuttum.
 *
 * Sunucu, e-posta kayıtlı olsun olmasın AYNI yanıtı döner ve arayüz de aynı
 * mesajı gösterir. Farklı mesaj göstermek, hangi e-postaların sisteme kayıtlı
 * olduğunu dışarıdan öğrenilebilir kılardı (hesap sayımı). Bu yüzden başarı
 * ekranı "kayıtlıysa gönderildi" der — "gönderildi" değil.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { ApiError, forgotPasswordSchema } from '@ersinspot/shared';
import type { ForgotPasswordInput } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { TextField } from '@/components/ui/form-field.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { useForgotPassword } from '@/features/auth';

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  function onSubmit(values: ForgotPasswordInput): void {
    forgotPassword.mutate(values, {
      onError: (error) => {
        setError('root', {
          message:
            error instanceof ApiError
              ? error.message
              : 'İstek gönderilemedi. Lütfen tekrar deneyin.',
        });
      },
    });
  }

  if (forgotPassword.isSuccess) {
    return (
      <PageContainer width="narrow">
        <PageHeader
          align="center"
          icon={MailCheck}
          title="Bağlantıyı gönderdik"
          description="Girdiğiniz adres sistemimizde kayıtlıysa şifre sıfırlama bağlantısı e-posta ile gönderildi. Gelen kutunuzu ve gereksiz posta klasörünü kontrol edin."
        />

        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link to="/giris">Giriş sayfasına dön</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
      <PageHeader
        title="Şifremi Unuttum"
        description="Hesabınızın e-posta adresini girin, size şifre sıfırlama bağlantısı gönderelim."
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
          required
          type="email"
          autoComplete="email"
          placeholder="ornek@eposta.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isSubmitting || forgotPassword.isPending}
        >
          Sıfırlama bağlantısı gönder
        </Button>

        <p className="text-center text-sm text-slate-600">
          Şifrenizi hatırladınız mı?{' '}
          <Link to="/giris" className="font-medium text-brand-navy-700 hover:underline">
            Giriş yapın
          </Link>
        </p>
      </form>
    </PageContainer>
  );
}
