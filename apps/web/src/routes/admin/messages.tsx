/**
 * Yönetim — iletişim mesajları.
 *
 * Mesaj açıldığında OKUNDU işaretlenir; ayrıca bir düğmeye basılması
 * gerekmez — açmak zaten okumaktır. Okunmamış sayacı yan menüdeki rozeti
 * besler, o yüzden işaretlemenin gecikmesi görünür bir tutarsızlık olurdu.
 *
 * Yanıt e-posta ile gider. SMTP yapılandırılmamışsa gönderim sessizce
 * atlanır ve içerik günlüğe yazılır; bu bilinçli bir tercihtir (gönderim
 * hatası iş akışını kesmez) ama personelin bunu bilmesi için kutuda not var.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, MailOpen } from 'lucide-react';
import { ApiError, CONTACT_SUBJECTS, CONTACT_SUBJECT_LABELS } from '@ersinspot/shared';
import type { ContactSubject } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card, DetailList } from '@/components/ui/card.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { TextAreaField } from '@/components/ui/form-field.tsx';
import { PageHeader } from '@/components/ui/page.tsx';
import { FilterChips, Pagination } from '@/components/ui/pagination.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { formatDateTime } from '@/lib/format.ts';
import { useContactMessages, useMarkMessageRead, useReplyToMessage } from '@/features/content';

export default function AdminMessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const subject = (searchParams.get('konu') ?? undefined) as ContactSubject | undefined;
  const page = Number(searchParams.get('sayfa') ?? '1');

  const { data, isLoading, isError, error, refetch } = useContactMessages({
    page,
    ...(subject === undefined ? {} : { subject }),
  });

  const markRead = useMarkMessageRead();
  const reply = useReplyToMessage();

  const [openId, setOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  function setFilter(key: string, value: string | undefined): void {
    const next = new URLSearchParams(searchParams);

    if (value === undefined || value === '') next.delete(key);
    else next.set(key, value);

    if (key !== 'sayfa') next.delete('sayfa');
    setSearchParams(next);
  }

  /** Mesajı açar ve okunmamışsa okundu işaretler. */
  function open(messageId: string, isRead: boolean): void {
    const next = openId === messageId ? null : messageId;
    setOpenId(next);
    setReplyText('');

    if (next !== null && !isRead) markRead.mutate(messageId);
  }

  return (
    <>
      <PageHeader
        title="Mesajlar"
        description="İletişim formundan gelen mesajlar. Yanıtınız müşteriye e-posta ile iletilir."
      />

      <FilterChips
        className="mt-6"
        label="Mesaj konusu"
        value={subject}
        onChange={(next) => {
          setFilter('konu', next);
        }}
        options={CONTACT_SUBJECTS.map((value) => ({
          value,
          label: CONTACT_SUBJECT_LABELS[value],
        }))}
      />

      {isLoading ? (
        <PageSpinner label="Mesajlar yükleniyor" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data === undefined || data.items.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Mesaj yok"
          description="Bu süzgeçle eşleşen mesaj bulunmuyor."
          className="mt-4"
        />
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600">{data.totalItems} mesaj</p>

          <ul className="mt-3 space-y-2">
            {data.items.map((message) => {
              const isOpen = openId === message.id;

              return (
                <Card as="li" key={message.id} className="p-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => {
                      open(message.id, message.isRead);
                    }}
                    className="flex w-full gap-3 p-4 text-left"
                  >
                    <span className="mt-0.5 shrink-0">
                      {message.isRead ? (
                        <MailOpen className="size-5 text-slate-300" aria-hidden="true" />
                      ) : (
                        <Mail className="size-5 text-brand-orange-500" aria-hidden="true" />
                      )}
                      <span className="sr-only">{message.isRead ? 'Okundu' : 'Okunmadı'}</span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span
                          className={
                            message.isRead
                              ? 'text-sm text-slate-700'
                              : 'text-sm font-semibold text-slate-900'
                          }
                        >
                          {message.fullName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(message.createdAt)}
                        </span>
                      </span>

                      <span className="mt-0.5 block text-xs text-brand-navy-700">
                        {CONTACT_SUBJECT_LABELS[message.subject]}
                      </span>

                      <span className="mt-1 block truncate text-sm text-slate-600">
                        {message.message}
                      </span>
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="space-y-4 border-t border-slate-100 p-4">
                      <DetailList
                        rows={[
                          { term: 'E-posta', value: message.email },
                          message.phone !== null && { term: 'Telefon', value: message.phone },
                          { term: 'Mesaj', value: message.message, stacked: true },
                          message.replyNote !== null && {
                            term: 'Verilen yanıt',
                            value: message.replyNote,
                            stacked: true,
                          },
                        ]}
                      />

                      {message.replyNote === null ? (
                        <div className="space-y-3 border-t border-slate-100 pt-4">
                          <TextAreaField
                            label="Yanıt"
                            rows={4}
                            hint="Müşteriye e-posta ile gönderilir. SMTP yapılandırılmamışsa gönderim atlanır ve içerik günlüğe yazılır."
                            value={replyText}
                            onChange={(event) => {
                              setReplyText(event.target.value);
                            }}
                          />

                          <Button
                            disabled={replyText.trim().length < 5}
                            isLoading={reply.isPending}
                            onClick={() => {
                              reply.mutate(
                                { messageId: message.id, reply: { replyNote: replyText.trim() } },
                                {
                                  onSuccess: () => {
                                    toast.success('Yanıt gönderildi.');
                                    setReplyText('');
                                  },
                                  onError: (failure) => {
                                    toast.error(
                                      failure instanceof ApiError
                                        ? failure.message
                                        : 'Yanıt gönderilemedi.',
                                    );
                                  },
                                },
                              );
                            }}
                          >
                            Yanıtla
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </ul>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={(next) => {
              setFilter('sayfa', String(next));
            }}
          />
        </>
      )}
    </>
  );
}
