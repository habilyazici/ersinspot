/**
 * İletişim formu.
 *
 * Sunucu ucu, doğrulama şeması, hız sınırı, bot tuzağı ve yönetim panelindeki
 * gelen kutusu (okundu işaretleme, e-postayla yanıtlama) baştan yazılmıştı —
 * ama mesajı YAZACAK sayfa yoktu. Panel boş bir kutuyu yönetiyor, SSS sayfası
 * "iletişim formundan bize ulaşabilirsiniz" diyor ve öyle bir form
 * bulunmuyordu.
 *
 * Oturum GEREKMEZ: henüz üye olmamış bir ziyaretçi de yazabilmelidir. Oturum
 * açıksa sunucu mesajı kullanıcıya bağlar; form bunu ayrıca bildirmez.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Mail, MapPin, Phone } from 'lucide-react';
import {
  ApiError,
  CONTACT_SUBJECTS,
  CONTACT_SUBJECT_LABELS,
  createContactMessageSchema,
  phone as phoneUtils,
} from '@ersinspot/shared';
import type { CreateContactMessageInput } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card, DetailList } from '@/components/ui/card.tsx';
import { FormSection, SelectField, TextAreaField, TextField } from '@/components/ui/form-field.tsx';
import { HoneypotField } from '@/components/ui/honeypot-field.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { useAuth } from '@/features/auth';
import { useSiteSettings, useSubmitContactMessage } from '@/features/content';

type ContactValues = CreateContactMessageInput;

export default function ContactPage() {
  const { user } = useAuth();
  const { data: settings } = useSiteSettings();
  const submitMessage = useSubmitContactMessage();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(createContactMessageSchema),
    values: {
      // Oturum açıksa bilinen bilgiler doldurulur; ziyaretçide boş kalır.
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      subject: 'general',
      message: '',
    },
  });

  const contactPhone = settings?.['contact.phone'] ?? '';
  const contactEmail = settings?.['contact.email'] ?? '';
  const address = settings?.['contact.address'] ?? '';

  function onSubmit(values: ContactValues): void {
    submitMessage.mutate(values, {
      onSuccess: () => {
        /*
          Bot tuzağına düşen istek de buraya gelir: sunucu mesajı kaydetmez ama
          başarılı yanıt döner. Ayrım burada YAPILMAZ — otomatik aracın
          engellendiğini anlamaması tuzağın tek işlevidir.
        */
        toast.success('Mesajınız alındı. En kısa sürede size döneceğiz.');
        reset();
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          for (const field of error.fields) {
            setError(field.path as keyof ContactValues, { message: field.message });
          }

          if (error.fields.length === 0) {
            setError('root', { message: error.message });
          }
        } else {
          setError('root', { message: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.' });
        }
      },
    });
  }

  return (
    <PageContainer width="form">
      <PageHeader
        title="İletişim"
        description="Sorunuzu yazın, en kısa sürede yanıtlayalım. Acele işlerde telefonla ulaşmak daha hızlıdır."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-6">
          {errors.root === undefined ? null : (
            <div
              role="alert"
              className="rounded-lg bg-state-danger-bg px-4 py-3 text-sm text-state-danger-fg"
            >
              {errors.root.message}
            </div>
          )}

          <FormSection legend="Size Nasıl Ulaşalım">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Ad Soyad"
                required
                autoComplete="name"
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <TextField
                label="E-posta"
                required
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <TextField
                label="Telefon"
                type="tel"
                autoComplete="tel"
                placeholder={phoneUtils.PLACEHOLDER}
                hint="İsteğe bağlı. Yazarsanız telefonla da dönebiliriz."
                error={errors.phone?.message}
                {...register('phone', {
                  // Boş bırakılan alan hiç gönderilmez; şemada isteğe bağlıdır.
                  setValueAs: (value: string) => (value === '' ? undefined : value),
                })}
              />

              <SelectField
                label="Konu"
                required
                error={errors.subject?.message}
                {...register('subject')}
              >
                {CONTACT_SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {CONTACT_SUBJECT_LABELS[subject]}
                  </option>
                ))}
              </SelectField>
            </div>

            <TextAreaField
              label="Mesajınız"
              required
              rows={6}
              hint="Ne kadar açık yazarsanız o kadar hızlı yardımcı olabiliriz."
              error={errors.message?.message}
              {...register('message')}
            />
          </FormSection>

          {/* Bot tuzağı; gerekçesi bileşenin kendi belgesinde. */}
          <HoneypotField {...register('website')} />

          <Button type="submit" size="lg" isLoading={isSubmitting || submitMessage.isPending}>
            Mesajı gönder
          </Button>
        </form>

        <Card as="aside" padding="md" className="h-fit space-y-3">
          <h2 className="font-semibold text-slate-900">Doğrudan Ulaşın</h2>

          <DetailList
            rows={[
              contactPhone !== '' && {
                term: 'Telefon',
                value: (
                  <a
                    href={phoneUtils.toTelHref(contactPhone)}
                    className="flex items-center gap-2 hover:text-brand-orange-700"
                  >
                    <Phone className="size-4 shrink-0" aria-hidden="true" />
                    {phoneUtils.format(contactPhone)}
                  </a>
                ),
                stacked: true,
              },
              contactEmail !== '' && {
                term: 'E-posta',
                value: (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-2 hover:text-brand-orange-700"
                  >
                    <Mail className="size-4 shrink-0" aria-hidden="true" />
                    {contactEmail}
                  </a>
                ),
                stacked: true,
              },
              address !== '' && {
                term: 'Adres',
                value: (
                  <span className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {address}
                  </span>
                ),
                stacked: true,
              },
            ]}
          />
        </Card>
      </div>
    </PageContainer>
  );
}
