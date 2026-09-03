/**
 * Hesabım.
 *
 * Üç iş bir sayfada: profil bilgisi, şifre değiştirme ve açık oturumların
 * yönetimi. Üçü de aynı kişinin aynı oturumda yapacağı işlerdir; ayrı
 * sayfalara bölmek gereksiz gezinme üretirdi.
 *
 * E-POSTA DOĞRULAMA UYARISI en üstte durur. Doğrulanmamış bir hesap nakliye,
 * teknik servis ve ürün satma taleplerini oluşturamaz; kullanıcı bunu ancak
 * formu doldurup reddedildiğinde öğrenirse gereksiz emek harcamış olur.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound, MailWarning, Monitor, ShieldCheck, UserCog } from 'lucide-react';
import {
  ApiError,
  PASSWORD_HINT,
  USER_ROLE_LABELS,
  changePasswordSchema,
  phone as phoneUtils,
  updateProfileSchema,
} from '@ersinspot/shared';
import type { ChangePasswordInput, UpdateProfileInput } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card, DetailList } from '@/components/ui/card.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { TextField } from '@/components/ui/form-field.tsx';
import { PageContainer, PageHeader, Section } from '@/components/ui/page.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/format.ts';
import { useSiteSettings } from '@/features/content';
import {
  useAuth,
  useChangePassword,
  useLogoutAllOtherSessions,
  useResendVerification,
  useSessions,
  useUpdateProfile,
} from '@/features/auth';

/**
 * Tarayıcı kimliğinden okunabilir bir cihaz adı çıkarır.
 *
 * Tam `User-Agent` dizesi kullanıcıya bir şey anlatmaz; amaç kişinin "bu benim
 * telefonum" diyebilmesidir. Tanınmayan bir istemcide ham dize gösterilir —
 * yanlış tahmin etmektense ham veriyi göstermek yeğdir.
 */
function describeDevice(userAgent: string | null): string {
  if (userAgent === null || userAgent.trim() === '') return 'Bilinmeyen cihaz';

  const platform = /iPhone|iPad/.test(userAgent)
    ? 'iPhone/iPad'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Macintosh/.test(userAgent)
        ? 'Mac'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null;

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Safari\//.test(userAgent)
        ? 'Safari'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : null;

  if (platform === null && browser === null) return userAgent;

  return [browser, platform].filter((part): part is string => part !== null).join(' · ');
}

export default function AccountPage() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const resendVerification = useResendVerification();
  const logoutOthers = useLogoutAllOtherSessions();
  const { data: sessions, isLoading: sessionsLoading, isError, error, refetch } = useSessions();

  /*
    İletişim numarası site ayarlarından gelir.

    Sayfaya gömülü olduğunda numara değiştiğinde alt bilgi güncelleniyor ama
    burası eski numarayı göstermeye devam ediyordu — aynı bilginin iki kaynağı
    olmasının olağan sonucu.
  */
  const { data: settings } = useSiteSettings();
  const contactPhone = settings?.['contact.phone'] ?? '';

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: { fullName: user?.fullName ?? '', phone: user?.phone ?? '' },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' },
  });

  if (user === null || user === undefined) return <PageSpinner label="Hesap yükleniyor" />;

  function saveProfile(values: UpdateProfileInput): void {
    updateProfile.mutate(values, {
      onSuccess: () => {
        toast.success('Bilgileriniz güncellendi.');
      },
      onError: (updateError) => {
        if (updateError instanceof ApiError) {
          for (const field of updateError.fields) {
            profileForm.setError(field.path as keyof UpdateProfileInput, {
              message: field.message,
            });
          }

          if (updateError.fields.length === 0) {
            profileForm.setError('root', { message: updateError.message });
          }
        } else {
          profileForm.setError('root', { message: 'Bilgiler kaydedilemedi.' });
        }
      },
    });
  }

  function savePassword(values: ChangePasswordInput): void {
    changePassword.mutate(values, {
      onSuccess: (result) => {
        toast.success(
          result.closedOtherSessions > 0
            ? `Şifreniz değiştirildi. Diğer ${String(result.closedOtherSessions)} oturum kapatıldı.`
            : 'Şifreniz değiştirildi.',
        );
        passwordForm.reset();
        // Sunucu diğer oturumları kapattı; listedeki cihazlar artık geçersiz.
        void refetch();
      },
      onError: (passwordError) => {
        if (passwordError instanceof ApiError) {
          for (const field of passwordError.fields) {
            passwordForm.setError(field.path as keyof ChangePasswordInput, {
              message: field.message,
            });
          }

          if (passwordError.fields.length === 0) {
            passwordForm.setError('root', { message: passwordError.message });
          }
        } else {
          passwordForm.setError('root', { message: 'Şifre değiştirilemedi.' });
        }
      },
    });
  }

  const otherSessions = (sessions ?? []).filter((session) => !session.isCurrent);

  return (
    <PageContainer>
      <PageHeader
        title="Hesabım"
        description="Bilgilerinizi güncelleyin, şifrenizi değiştirin ve açık oturumlarınızı yönetin."
      />

      {user.emailVerified ? null : (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center gap-3 rounded-lg bg-state-pending-bg px-4 py-3 text-sm text-state-pending-fg"
        >
          <MailWarning className="size-5 shrink-0" aria-hidden="true" />

          <p className="min-w-0 flex-1">
            E-posta adresiniz doğrulanmadı. Nakliye, teknik servis ve ürün satma talebi
            oluşturabilmek için doğrulama gerekiyor.
          </p>

          <Button
            size="sm"
            variant="outline"
            isLoading={resendVerification.isPending}
            onClick={() => {
              resendVerification.mutate(undefined, {
                onSuccess: () => {
                  toast.success('Doğrulama e-postası tekrar gönderildi.');
                },
                onError: () => {
                  toast.error('E-posta gönderilemedi. Lütfen biraz sonra tekrar deneyin.');
                },
              });
            }}
          >
            Tekrar gönder
          </Button>
        </div>
      )}

      <div className="mt-8 space-y-8">
        <Section title="Hesap Bilgileri" icon={ShieldCheck}>
          <Card>
            <DetailList
              rows={[
                { term: 'E-posta', value: user.email },
                {
                  term: 'Doğrulama',
                  value: user.emailVerified ? 'Doğrulandı' : 'Doğrulanmadı',
                },
                { term: 'Hesap türü', value: USER_ROLE_LABELS[user.role].label },
                { term: 'Üyelik tarihi', value: formatDate(user.createdAt) },
              ]}
            />
          </Card>
        </Section>

        <Section title="Kişisel Bilgiler" icon={UserCog}>
          <Card padding="md">
            <form
              onSubmit={(event) => void profileForm.handleSubmit(saveProfile)(event)}
              className="space-y-4"
            >
              {profileForm.formState.errors.root === undefined ? null : (
                <p role="alert" className="text-sm text-state-danger-fg">
                  {profileForm.formState.errors.root.message}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Ad Soyad"
                  required
                  autoComplete="name"
                  error={profileForm.formState.errors.fullName?.message}
                  {...profileForm.register('fullName')}
                />

                <TextField
                  label="Telefon"
                  required
                  type="tel"
                  autoComplete="tel"
                  error={profileForm.formState.errors.phone?.message}
                  {...profileForm.register('phone')}
                />
              </div>

              <Button
                type="submit"
                isLoading={updateProfile.isPending}
                disabled={!profileForm.formState.isDirty}
              >
                Bilgileri kaydet
              </Button>
            </form>
          </Card>
        </Section>

        <Section title="Şifre Değiştir" icon={KeyRound}>
          <Card padding="md">
            <form
              onSubmit={(event) => void passwordForm.handleSubmit(savePassword)(event)}
              className="space-y-4"
            >
              {passwordForm.formState.errors.root === undefined ? null : (
                <p role="alert" className="text-sm text-state-danger-fg">
                  {passwordForm.formState.errors.root.message}
                </p>
              )}

              <TextField
                label="Mevcut Şifre"
                required
                type="password"
                autoComplete="current-password"
                error={passwordForm.formState.errors.currentPassword?.message}
                {...passwordForm.register('currentPassword')}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Yeni Şifre"
                  required
                  type="password"
                  autoComplete="new-password"
                  hint={PASSWORD_HINT}
                  error={passwordForm.formState.errors.newPassword?.message}
                  {...passwordForm.register('newPassword')}
                />

                <TextField
                  label="Yeni Şifre (tekrar)"
                  required
                  type="password"
                  autoComplete="new-password"
                  error={passwordForm.formState.errors.newPasswordConfirm?.message}
                  {...passwordForm.register('newPasswordConfirm')}
                />
              </div>

              <Button type="submit" isLoading={changePassword.isPending}>
                Şifreyi değiştir
              </Button>
            </form>
          </Card>
        </Section>

        <Section
          title="Açık Oturumlar"
          icon={Monitor}
          description="Hesabınızın açık olduğu cihazlar. Tanımadığınız bir cihaz görürseniz şifrenizi değiştirin."
          action={
            otherSessions.length === 0 ? null : (
              <Button
                size="sm"
                variant="outline"
                isLoading={logoutOthers.isPending}
                onClick={() => {
                  logoutOthers.mutate(undefined, {
                    onSuccess: () => {
                      toast.success('Diğer cihazlardaki oturumlar kapatıldı.');
                    },
                    onError: () => {
                      toast.error('Oturumlar kapatılamadı.');
                    },
                  });
                }}
              >
                Diğer cihazlardan çık
              </Button>
            )
          }
        >
          {sessionsLoading ? (
            <PageSpinner label="Oturumlar yükleniyor" />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <ul className="space-y-2">
              {(sessions ?? []).map((session) => (
                <Card as="li" key={session.id} className="flex flex-wrap gap-3">
                  <Monitor className="mt-0.5 size-5 shrink-0 text-slate-400" aria-hidden="true" />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {describeDevice(session.userAgent)}
                      {session.isCurrent ? (
                        <span className="ml-2 rounded-full bg-state-success-bg px-2 py-0.5 text-xs font-medium text-state-success-fg">
                          Bu cihaz
                        </span>
                      ) : null}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {session.ipAddress ?? 'IP bilinmiyor'} ·{' '}
                      {formatRelativeTime(session.lastUsedAt)} kullanıldı
                    </p>

                    <p className="text-xs text-slate-400">
                      Giriş: {formatDateTime(session.createdAt)}
                    </p>
                  </div>
                </Card>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Kayıtlarım" icon={ShieldCheck}>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/hesabim/siparislerim">Siparişlerim</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/hesabim/taleplerim">Taleplerim</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/hesabim/favorilerim">Favorilerim</Link>
            </Button>
            {contactPhone === '' ? null : (
              <Button asChild variant="link">
                <a href={phoneUtils.toTelHref(contactPhone)}>Bize ulaşın</a>
              </Button>
            )}
          </div>
        </Section>
      </div>
    </PageContainer>
  );
}
