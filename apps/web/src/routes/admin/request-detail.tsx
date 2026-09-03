/**
 * Yönetim — talep detayı.
 *
 * Talebin bilgileri müşterinin gördüğüyle AYNI bileşenden gelir (`RequestInfo`);
 * ayrım yalnızca sağdaki eylem kutularındadır. İki sayfada ayrı yazılsaydı biri
 * güncellenip diğeri unutulduğunda müşteri ile personel farklı şeyler okurdu.
 *
 * EYLEMLER SIRALIDIR ve sunucu bunu zorunlu kılar: teklif olmadan "kabul
 * edildi", randevu olmadan "randevu verildi" olamaz. Arayüz de aynı sırayı
 * izler; personele yapamayacağı bir işlem gösterilmez.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarPlus, ClipboardList, NotebookPen, Receipt, Stethoscope } from 'lucide-react';
import {
  APPOINTMENT_TIME_SLOTS,
  ApiError,
  LEAD_TIME_DAYS,
  QUOTE_VALIDITY_DAYS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TRANSITIONS,
  dateAfterDays,
  money,
  today,
} from '@ersinspot/shared';
import type { RequestStatus } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card, DetailList, Timeline } from '@/components/ui/card.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { SelectField, TextAreaField, TextField } from '@/components/ui/form-field.tsx';
import { PageContainer, PageHeader, Section } from '@/components/ui/page.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatDate, formatDateTime, formatPrice, formatTimeSlot } from '@/lib/format.ts';
import {
  RequestInfo,
  useCreateQuote,
  useRecordDiagnosis,
  useRequest,
  useScheduleAppointment,
  useSetStaffNote,
  useUpdateRequestStatus,
} from '@/features/servicing';

export default function AdminRequestDetailPage() {
  const { requestId = '' } = useParams<{ requestId: string }>();
  const { data: request, isLoading, isError, error, refetch } = useRequest(requestId);

  const createQuote = useCreateQuote();
  const scheduleAppointment = useScheduleAppointment();
  const updateStatus = useUpdateRequestStatus();
  const setStaffNote = useSetStaffNote();
  const recordDiagnosis = useRecordDiagnosis();

  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteValidUntil, setQuoteValidUntil] = useState(dateAfterDays(QUOTE_VALIDITY_DAYS));
  const [quoteNote, setQuoteNote] = useState('');

  const [appointmentDate, setAppointmentDate] = useState(dateAfterDays(LEAD_TIME_DAYS.appointment));
  const [slotStart, setSlotStart] = useState<string>(APPOINTMENT_TIME_SLOTS[0].startTime);
  const [appointmentNote, setAppointmentNote] = useState('');

  const [nextStatus, setNextStatus] = useState<RequestStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');

  const [diagnosis, setDiagnosis] = useState('');

  /*
    Personel notu kutusu kontrollüdür ve yüklenen talepten doldurulur.

    Önceden kutu `defaultValue` ile çiziliyor, düğme ise boş metinde devre dışı
    kalıyordu: yanlışlıkla yazılmış bir not hiçbir zaman kaldırılamıyordu.
    Artık düğme yalnızca metin DEĞİŞTİĞİNDE etkin ve boş kaydetmek notu siler.
  */
  const [note, setNote] = useState('');
  const [loadedRequestId, setLoadedRequestId] = useState<string | null>(null);

  if (request !== undefined && request.id !== loadedRequestId) {
    setLoadedRequestId(request.id);
    setNote(request.staffNote ?? '');
  }

  if (isLoading) return <PageSpinner label="Talep yükleniyor" />;

  if (isError || request === undefined) {
    return (
      <PageContainer width="prose">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  const allowed = REQUEST_STATUS_TRANSITIONS[request.status];

  /** Hata mesajını tek yerden gösterir: sunucu sebebi zaten anlaşılır yazıyor. */
  function reportError(failure: unknown, fallback: string): void {
    toast.error(failure instanceof ApiError ? failure.message : fallback);
  }

  function submitQuote(): void {
    const amount = money.parseLira(quoteAmount);

    if (amount === null) {
      toast.error('Geçerli bir tutar girin.');
      return;
    }

    createQuote.mutate(
      {
        requestId,
        quote: {
          amount,
          validUntil: quoteValidUntil,
          ...(quoteNote.trim() === '' ? {} : { note: quoteNote.trim() }),
        },
      },
      {
        onSuccess: () => {
          toast.success('Teklif gönderildi. Müşteri kabul veya ret bildirebilir.');
          setQuoteAmount('');
          setQuoteNote('');
        },
        onError: (failure) => {
          reportError(failure, 'Teklif gönderilemedi.');
        },
      },
    );
  }

  function submitAppointment(): void {
    const slot = APPOINTMENT_TIME_SLOTS.find((entry) => entry.startTime === slotStart);
    if (slot === undefined) return;

    scheduleAppointment.mutate(
      {
        requestId,
        appointment: {
          date: appointmentDate,
          timeSlot: { startTime: slot.startTime, endTime: slot.endTime },
          ...(appointmentNote.trim() === '' ? {} : { note: appointmentNote.trim() }),
        },
      },
      {
        onSuccess: () => {
          toast.success('Randevu oluşturuldu.');
          setAppointmentNote('');
        },
        onError: (failure) => {
          reportError(failure, 'Randevu oluşturulamadı.');
        },
      },
    );
  }

  function submitStatus(): void {
    if (nextStatus === '') return;

    updateStatus.mutate(
      {
        requestId,
        status: nextStatus,
        ...(statusNote.trim() === '' ? {} : { note: statusNote.trim() }),
      },
      {
        onSuccess: () => {
          toast.success(`Durum "${REQUEST_STATUS_LABELS[nextStatus].label}" olarak güncellendi.`);
          setNextStatus('');
          setStatusNote('');
        },
        onError: (failure) => {
          reportError(failure, 'Durum güncellenemedi.');
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        backTo={{ to: '/yonetim/talepler', label: 'Talepler' }}
        title={request.contactName}
        meta={
          <>
            <span className="font-mono">{request.referenceNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(request.createdAt)}</span>
          </>
        }
        aside={<StatusBadge meta={REQUEST_STATUS_LABELS[request.status]} withDescription />}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <RequestInfo request={request} showContact />

          {request.customerNote === null ? null : (
            <Section title="Müşteri Notu" icon={NotebookPen}>
              <Card>
                <p className="text-sm text-slate-700">{request.customerNote}</p>
              </Card>
            </Section>
          )}

          {request.appointment === null ? null : (
            <Section title="Randevu" icon={CalendarPlus}>
              <Card>
                <DetailList
                  rows={[
                    { term: 'Tarih', value: formatDate(request.appointment.date) },
                    { term: 'Saat aralığı', value: formatTimeSlot(request.appointment.timeSlot) },
                    request.appointment.note !== null && {
                      term: 'Not',
                      value: request.appointment.note,
                      stacked: true,
                    },
                  ]}
                />
              </Card>
            </Section>
          )}

          <Section title="Talep Geçmişi" icon={ClipboardList}>
            <Timeline
              formatTime={formatDateTime}
              events={request.timeline.map((event) => ({
                label: REQUEST_STATUS_LABELS[event.status].label,
                occurredAt: event.occurredAt,
                note: event.note,
              }))}
            />
          </Section>
        </div>

        <div className="space-y-4">
          {/* ---------------------------------------------------------------
              Teklif
              --------------------------------------------------------------- */}
          <Card padding="md" className="space-y-3">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Receipt className="size-4" aria-hidden="true" />
              Teklif
            </h2>

            {request.quote === null ? null : (
              <div className="rounded-lg bg-brand-orange-50 px-3 py-2">
                <p className="text-lg font-bold text-brand-orange-700">
                  {formatPrice(request.quote.amount)}
                </p>
                <p className="text-xs text-brand-orange-800">
                  {formatDate(request.quote.validUntil)} tarihine kadar geçerli
                </p>
              </div>
            )}

            {/*
              Yeni teklif, varsa öncekini geçersiz kılar. Bu yüzden kutu teklif
              verildikten sonra da açık kalır: fiyat revizyonu olağandır.
            */}
            <TextField
              label={request.quote === null ? 'Teklif tutarı (₺)' : 'Yeni teklif tutarı (₺)'}
              type="text"
              inputMode="decimal"
              placeholder="Örn. 8500"
              value={quoteAmount}
              onChange={(event) => {
                setQuoteAmount(event.target.value);
              }}
            />

            <TextField
              label="Geçerlilik tarihi"
              type="date"
              min={today()}
              value={quoteValidUntil}
              onChange={(event) => {
                setQuoteValidUntil(event.target.value);
              }}
            />

            <TextAreaField
              label="Not"
              rows={2}
              hint="Müşteri teklifle birlikte görür."
              value={quoteNote}
              onChange={(event) => {
                setQuoteNote(event.target.value);
              }}
            />

            <Button
              className="w-full"
              disabled={quoteAmount.trim() === ''}
              isLoading={createQuote.isPending}
              onClick={submitQuote}
            >
              {request.quote === null ? 'Teklif gönder' : 'Teklifi güncelle'}
            </Button>
          </Card>

          {/* ---------------------------------------------------------------
              Randevu — yalnızca müşteri teklifi kabul ettikten sonra
              --------------------------------------------------------------- */}
          {request.status === 'accepted' || request.status === 'scheduled' ? (
            <Card padding="md" className="space-y-3">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <CalendarPlus className="size-4" aria-hidden="true" />
                {request.appointment === null ? 'Randevu Ver' : 'Randevuyu Değiştir'}
              </h2>

              <TextField
                label="Tarih"
                type="date"
                min={dateAfterDays(LEAD_TIME_DAYS.appointment)}
                value={appointmentDate}
                onChange={(event) => {
                  setAppointmentDate(event.target.value);
                }}
              />

              <SelectField
                label="Saat aralığı"
                value={slotStart}
                onChange={(event) => {
                  setSlotStart(event.target.value);
                }}
              >
                {APPOINTMENT_TIME_SLOTS.map((slot) => (
                  <option key={slot.startTime} value={slot.startTime}>
                    {slot.startTime} - {slot.endTime}
                  </option>
                ))}
              </SelectField>

              <TextAreaField
                label="Not"
                rows={2}
                value={appointmentNote}
                onChange={(event) => {
                  setAppointmentNote(event.target.value);
                }}
              />

              <Button
                className="w-full"
                isLoading={scheduleAppointment.isPending}
                onClick={submitAppointment}
              >
                {request.appointment === null ? 'Randevu oluştur' : 'Randevuyu güncelle'}
              </Button>
            </Card>
          ) : null}

          {/* ---------------------------------------------------------------
              Teknisyen tespiti — yalnızca teknik serviste
              --------------------------------------------------------------- */}
          {request.kind === 'technical_service' ? (
            <Card padding="md" className="space-y-3">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <Stethoscope className="size-4" aria-hidden="true" />
                Teknisyen Tespiti
              </h2>

              <TextAreaField
                label="Tespit"
                rows={4}
                hint="Keşif sonrası arızanın nedeni ve yapılacak işlem."
                defaultValue={request.diagnosis ?? ''}
                onChange={(event) => {
                  setDiagnosis(event.target.value);
                }}
              />

              <Button
                variant="outline"
                className="w-full"
                disabled={diagnosis.trim().length < 10}
                isLoading={recordDiagnosis.isPending}
                onClick={() => {
                  recordDiagnosis.mutate(
                    { requestId, diagnosis: diagnosis.trim() },
                    {
                      onSuccess: () => {
                        toast.success('Tespit kaydedildi.');
                      },
                      onError: (failure) => {
                        reportError(failure, 'Tespit kaydedilemedi.');
                      },
                    },
                  );
                }}
              >
                Tespiti kaydet
              </Button>
            </Card>
          ) : null}

          {/* ---------------------------------------------------------------
              Personel notu — müşteriye gitmez
              --------------------------------------------------------------- */}
          <Card padding="md" className="space-y-3">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <NotebookPen className="size-4" aria-hidden="true" />
              Personel Notu
            </h2>

            <TextAreaField
              label="Not"
              rows={3}
              hint="Yalnızca personel görür; müşteriye giden yanıtlarda yer almaz. Boşaltıp kaydetmek notu siler."
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
              }}
            />

            <Button
              variant="outline"
              className="w-full"
              disabled={note === (request.staffNote ?? '')}
              isLoading={setStaffNote.isPending}
              onClick={() => {
                setStaffNote.mutate(
                  { requestId, note: note.trim() },
                  {
                    onSuccess: () => {
                      toast.success(note.trim() === '' ? 'Not silindi.' : 'Not kaydedildi.');
                    },
                    onError: (failure) => {
                      reportError(failure, 'Not kaydedilemedi.');
                    },
                  },
                );
              }}
            >
              Notu kaydet
            </Button>
          </Card>

          {/* ---------------------------------------------------------------
              Durum
              --------------------------------------------------------------- */}
          <Card padding="md" className="space-y-3">
            <h2 className="font-semibold text-slate-900">Durum</h2>

            {allowed.length === 0 ? (
              <p className="text-sm text-slate-600">Bu talep kapandı; durumu değiştirilemez.</p>
            ) : (
              <>
                <SelectField
                  label="Durumu değiştir"
                  hint="Teklif ve randevu ön koşulları sunucuda denetlenir."
                  value={nextStatus}
                  onChange={(event) => {
                    setNextStatus(event.target.value as RequestStatus | '');
                  }}
                >
                  <option value="">Seçiniz</option>
                  {allowed.map((value) => (
                    <option key={value} value={value}>
                      {REQUEST_STATUS_LABELS[value].label}
                    </option>
                  ))}
                </SelectField>

                <TextAreaField
                  label="Not"
                  rows={2}
                  hint="Müşteri talep geçmişinde görür."
                  value={statusNote}
                  onChange={(event) => {
                    setStatusNote(event.target.value);
                  }}
                />

                <Button
                  className="w-full"
                  disabled={nextStatus === ''}
                  isLoading={updateStatus.isPending}
                  onClick={submitStatus}
                >
                  Durumu güncelle
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
