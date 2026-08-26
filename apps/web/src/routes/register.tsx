import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError, registerSchema } from '@ersinspot/shared';
import type { RegisterInput } from '@ersinspot/shared';

type RegisterFormValues = RegisterInput;
import { Button } from '@/components/ui/button.tsx';
import { useAuth, useRegister } from '@/features/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      passwordConfirm: '',
      acceptedTerms: false,
    },
  });

  if (!isLoading && isAuthenticated) return <Navigate to="/" replace />;

  function onSubmit(values: RegisterFormValues): void {
    registerMutation.mutate(values, {
      onSuccess: (data) => {
        if (data.user === undefined) {
          /*
           * Sunucu, adres zaten kayıtlıysa da başarı yanıtı döner ve kullanıcı
           * bilgisi göndermez — bu, geçerli e-posta adreslerinin keşfedilmesini
           * engeller. Arayüz de aynı belirsizliği korur.
           */
          toast.success('Kayıt işlemi alındı. E-postanızı kontrol edin.');
          void navigate('/giris', { replace: true });
          return;
        }

        toast.success('Hesabınız oluşturuldu. Hoş geldiniz.');
        void navigate('/', { replace: true });
      },

      onError: (error) => {
        if (error instanceof ApiError) {
          // Sunucu alan bazlı hata döndüyse ilgili alana yerleştir.
          for (const field of error.fields) {
            setError(field.path as keyof RegisterFormValues, { message: field.message });
          }

          if (error.fields.length === 0) {
            setError('root', { message: error.message });
          }
        } else {
          setError('root', { message: 'Kayıt yapılamadı. Lütfen tekrar deneyin.' });
        }
      },
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Kayıt Ol</h1>
      <p className="mt-1 text-sm text-slate-600">
        Zaten hesabınız var mı?{' '}
        <Link to="/giris" className="font-medium text-brand-navy-700 hover:underline">
          Giriş yapın
        </Link>
      </p>

      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="mt-8 space-y-4">
        {errors.root === undefined ? null : (
          <div
            role="alert"
            className="rounded-lg bg-state-danger-bg px-4 py-3 text-sm text-state-danger-fg"
          >
            {errors.root.message}
          </div>
        )}

        {(
          [
            { name: 'fullName', label: 'Ad Soyad', type: 'text', autoComplete: 'name' },
            { name: 'email', label: 'E-posta', type: 'email', autoComplete: 'email' },
            { name: 'phone', label: 'Cep Telefonu', type: 'tel', autoComplete: 'tel' },
            {
              name: 'password',
              label: 'Şifre',
              type: 'password',
              autoComplete: 'new-password',
              hint: 'En az 10 karakter.',
            },
            {
              name: 'passwordConfirm',
              label: 'Şifre (Tekrar)',
              type: 'password',
              autoComplete: 'new-password',
            },
          ] as const
        ).map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-slate-700">
              {field.label}
            </label>

            <input
              id={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              placeholder={field.name === 'phone' ? '0507 194 05 50' : undefined}
              aria-invalid={errors[field.name] !== undefined}
              aria-describedby={`${field.name}-yardim`}
              {...register(field.name)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
            />

            <p id={`${field.name}-yardim`} className="mt-1 text-sm">
              {errors[field.name] !== undefined ? (
                <span className="text-red-600">{errors[field.name]?.message}</span>
              ) : 'hint' in field ? (
                <span className="text-slate-500">{field.hint}</span>
              ) : null}
            </p>
          </div>
        ))}

        <div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              {...register('acceptedTerms')}
              className="mt-0.5 size-4 rounded"
            />
            <span>
              <Link to="/kullanim-kosullari" className="text-brand-navy-700 hover:underline">
                Kullanım koşullarını
              </Link>{' '}
              okudum ve kabul ediyorum.
            </span>
          </label>

          {errors.acceptedTerms === undefined ? null : (
            <p className="mt-1 text-sm text-red-600">{errors.acceptedTerms.message}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isSubmitting || registerMutation.isPending}
        >
          Hesap Oluştur
        </Button>
      </form>
    </div>
  );
}
