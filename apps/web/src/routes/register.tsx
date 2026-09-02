import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError, registerSchema } from '@ersinspot/shared';
import type { RegisterInput } from '@ersinspot/shared';

type RegisterFormValues = RegisterInput;

/** Form alanları; tümü aynı bileşenle çizilir, sıraları burada tanımlıdır. */
const FIELDS = [
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
] as const satisfies readonly {
  name: keyof RegisterFormValues;
  label: string;
  type: string;
  autoComplete: string;
  hint?: string;
}[];
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { Button } from '@/components/ui/button.tsx';
import { CheckboxField } from '@/components/ui/choice-field.tsx';
import { TextField } from '@/components/ui/form-field.tsx';
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
      onSuccess: () => {
        /*
         * Sunucu, adres zaten kayıtlı olsa da aynı yanıtı döner ve oturum
         * açmaz — bu, geçerli e-posta adreslerinin keşfedilmesini engeller.
         * Arayüz de aynı belirsizliği korur: tek mesaj, tek yönlendirme.
         */
        toast.success('Kayıt alındı. Doğrulama bağlantısı için e-postanızı kontrol edin.');
        void navigate('/giris', { replace: true });
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
    <PageContainer width="narrow">
      <PageHeader
        title="Kayıt Ol"
        description={
          <>
            Zaten hesabınız var mı?{' '}
            <Link to="/giris" className="font-medium text-brand-navy-700 hover:underline">
              Giriş yapın
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

        {FIELDS.map((field) => (
          <TextField
            key={field.name}
            label={field.label}
            type={field.type}
            required
            autoComplete={field.autoComplete}
            placeholder={field.name === 'phone' ? '0507 194 05 50' : undefined}
            hint={'hint' in field ? field.hint : undefined}
            error={errors[field.name]?.message}
            {...register(field.name)}
          />
        ))}

        <CheckboxField
          label="Kullanım koşullarını okudum ve kabul ediyorum."
          hint={
            <Link to="/kullanim-kosullari" className="text-brand-navy-700 hover:underline">
              Kullanım koşullarını oku
            </Link>
          }
          error={errors.acceptedTerms?.message}
          {...register('acceptedTerms')}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isSubmitting || registerMutation.isPending}
        >
          Hesap Oluştur
        </Button>
      </form>
    </PageContainer>
  );
}
