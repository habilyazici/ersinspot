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
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CalendarPlus,
  ClipboardList,
  NotebookPen,
  PackagePlus,
  Receipt,
  Stethoscope,
} from 'lucide-react';
import {
  APPOINTMENT_TIME_SLOTS,
  ApiError,
  LEAD_TIME_DAYS,
  MIN_DIAGNOSIS_LENGTH,
  PRODUCT_CONDITIONS,
  PRODUCT_CONDITION_LABELS,
  QUOTE_VALIDITY_DAYS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TRANSITIONS,
  dateAfterDays,
  money,
  today,
} from '@ersinspot/shared';
import type { ProductCondition, RequestStatus } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card, DetailList, Timeline } from '@/components/ui/card.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { CheckboxField } from '@/components/ui/choice-field.tsx';
import { SelectField, TextAreaField, TextField } from '@/components/ui/form-field.tsx';
import { PageContainer, PageHeader, Section } from '@/components/ui/page.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatDate, formatDateTime, formatPrice, formatTimeSlot } from '@/lib/format.ts';
import { flattenCategories, useBrands, useCategories } from '@/features/catalog';
import {
  RequestInfo,
  useConvertSellRequest,
  useCreateQuote,
  useRecordDiagnosis,
  useRequest,
  useScheduleAppointment,
  useSetStaffNote,
  useUpdateRequestStatus,
} from '@/features/servicing';

/**
 * Dönüşüm formunun durumu.
 *
 * Fiyat LİRA METNİ olarak tutulur ("8.500" ya da "8500,50") ve gönderimde
 * kuruşa çevrilir; ürün formundaki sözleşmenin aynısı. Kutuda kuruş tutmak,
 * personelin ekranda "850000 ₺" görmesi demek olurdu.
 */
interface ConversionForm {
  title: string;
  description: string;
  price: string;
  categoryId: string;
  brandId: string;
  condition: ProductCondition;
  warrantyMonths: number;
  copyPhotos: boolean;
}

export default function AdminRequestDetailPage() {
  const { requestId = '' } = useParams<{ requestId: string }>();
  const { data: request, isLoading, isError, error, refetch } = useRequest(requestId);

  const createQuote = useCreateQuote();
  const scheduleAppointment = useScheduleAppointment();
  const updateStatus = useUpdateRequestStatus();
  const setStaffNote = useSetStaffNote();
  const recordDiagnosis = useRecordDiagnosis();
  const convertRequest = useConvertSellRequest();

  // Dönüşüm formunun kategori ve marka seçenekleri.
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();

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
    Satış talebini katalog kaydına dönüştürme formu.

    Sunucu ucu (`POST /admin/sell-requests/:id/convert`), servisi ve şeması
    baştan vardı; sözleşme "satış talebindeki bilgiler ön dolgu olarak
    kullanılır" diye yazıyordu ama bu formu çizen hiçbir şey yoktu. Personel
    kabul ettiği ürünü katalogda elle yeniden oluşturmak zorundaydı ve talep
    ile ürün arasındaki bağ (`resultingProductId`) hiç kurulmuyordu.
  */
  const [conversion, setConversion] = useState<ConversionForm | null>(null);

  /*
    Kayıttan doldurulan kutular KONTROLLÜDÜR.

    Personel notu kutusu önceden `defaultValue` ile çiziliyor, düğme ise boş
    metinde devre dışı kalıyordu: yanlışlıkla yazılmış bir not hiçbir zaman
    kaldırılamıyordu. Artık düğme yalnızca metin DEĞİŞTİĞİNDE etkin ve boş
    kaydetmek notu siler.

    Teknisyen tespiti kutusu aynı hatayı taşımaya devam ediyordu. `defaultValue`
    yalnızca ilk çizimde okunur; bileşen bir talepten diğerine geçerken (aynı
    rota, farklı parametre) yeniden bağlanmaz, dolayısıyla kutuda ÖNCEKİ
    talebin tespiti kalıyordu. Kaydet düğmesi de yerel duruma baktığı için
    mevcut tespiti gören personel, tek karakter yazana kadar düğmeyi kapalı
    buluyordu.

    İkisi de aynı yerde, yüklenen talebe göre tazelenir.
  */
  const [note, setNote] = useState('');
  const [loadedRequestId, setLoadedRequestId] = useState<string | null>(null);

  if (request !== undefined && request.id !== loadedRequestId) {
    setLoadedRequestId(request.id);
    setNote(request.staffNote ?? '');
    setDiagnosis(request.kind === 'technical_service' ? (request.diagnosis ?? '') : '');
    setConversion(null);
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

  /**
   * Dönüşüm formunu talepten ön doldurur.
   *
   * Müşterinin bildirdiği başlık, açıklama, kategori ve durum zaten kayıtta;
   * personelin girmesi gereken tek şey satış fiyatıdır. İstediği alanı yine
   * düzeltebilir — ürün ilanı kataloğun sesiyle yazılır.
   */
  function startConversion(): void {
    if (request?.kind !== 'sell_request') return;

    setConversion({
      title: request.title,
      description: request.description,
      // Müşterinin istediği fiyat bir talep, teklif değil: yalnızca öneri
      // olarak doldurulur ve personel üzerine yazar.
      price:
        request.askingPrice === null
          ? ''
          : money.toInputValue(money.fromKurus(request.askingPrice)),
      categoryId: request.category.id,
      brandId: '',
      condition: request.condition,
      warrantyMonths: 0,
      copyPhotos: true,
    });
  }

  function submitConversion(): void {
    if (conversion === null) return;

    const price = money.parseLira(conversion.price);

    if (price === null || price <= 0) {
      toast.error('Geçerli bir satış fiyatı girin.');
      return;
    }

    convertRequest.mutate(
      {
        requestId,
        product: {
          title: conversion.title,
          description: conversion.description,
          price,
          categoryId: conversion.categoryId,
          brandId: conversion.brandId === '' ? null : conversion.brandId,
          condition: conversion.condition,
          warrantyMonths: conversion.warrantyMonths,
          copyPhotos: conversion.copyPhotos,
        },
      },
      {
        onSuccess: () => {
          toast.success('Ürün taslak olarak oluşturuldu. Vitrine çıkarmadan önce gözden geçirin.');
          setConversion(null);
        },
        onError: (failure) => {
          reportError(failure, 'Ürün oluşturulamadı.');
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
                hint={`Keşif sonrası arızanın nedeni ve yapılacak işlem. En az ${String(MIN_DIAGNOSIS_LENGTH)} karakter.`}
                value={diagnosis}
                onChange={(event) => {
                  setDiagnosis(event.target.value);
                }}
              />

              <Button
                variant="outline"
                className="w-full"
                // Değişmemiş bir tespiti yeniden kaydetmenin anlamı yok; alt
                // sınır şemadan gelir.
                disabled={
                  diagnosis.trim() === (request.diagnosis ?? '') ||
                  diagnosis.trim().length < MIN_DIAGNOSIS_LENGTH
                }
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
              Katalog kaydına dönüştürme — yalnızca satış talebinde
              --------------------------------------------------------------- */}
          {request.kind === 'sell_request' ? (
            <Card padding="md" className="space-y-3">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <PackagePlus className="size-4" aria-hidden="true" />
                Katalog Kaydı
              </h2>

              {request.resultingProductId !== null ? (
                <>
                  <p className="text-sm text-slate-600">Bu talep katalog kaydına dönüştürüldü.</p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/yonetim/urunler/${request.resultingProductId}`}>Ürünü aç</Link>
                  </Button>
                </>
              ) : request.status !== 'accepted' && request.status !== 'scheduled' ? (
                <p className="text-sm text-slate-600">
                  Ürün, teklif kabul edildikten sonra katalog kaydına dönüştürülebilir.
                </p>
              ) : conversion === null ? (
                <>
                  <p className="text-sm text-slate-600">
                    Ürün teslim alındıysa katalogda TASLAK bir kayıt oluşturulur; vitrine çıkarmadan
                    önce gözden geçirirsiniz.
                  </p>
                  <Button className="w-full" onClick={startConversion}>
                    Ürüne dönüştür
                  </Button>
                </>
              ) : (
                <>
                  <TextField
                    label="Ürün başlığı"
                    value={conversion.title}
                    onChange={(event) => {
                      setConversion({ ...conversion, title: event.target.value });
                    }}
                  />

                  <TextAreaField
                    label="Açıklama"
                    rows={4}
                    hint="Vitrinde görünür. Müşterinin yazdığı metin ön dolgudur."
                    value={conversion.description}
                    onChange={(event) => {
                      setConversion({ ...conversion, description: event.target.value });
                    }}
                  />

                  <TextField
                    label="Satış fiyatı (₺)"
                    inputMode="decimal"
                    hint={
                      request.askingPrice === null
                        ? 'Müşteri fiyat belirtmedi.'
                        : `Müşterinin istediği: ${formatPrice(request.askingPrice)}`
                    }
                    value={conversion.price}
                    onChange={(event) => {
                      setConversion({ ...conversion, price: event.target.value });
                    }}
                  />

                  <SelectField
                    label="Kategori"
                    value={conversion.categoryId}
                    onChange={(event) => {
                      setConversion({ ...conversion, categoryId: event.target.value });
                    }}
                  >
                    {flattenCategories(categories ?? []).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>

                  {/*
                    Marka listeden seçilir. Talepteki marka müşterinin yazdığı
                    serbest metindir ("arçelik", "Arcelik"); katalog markası
                    ise kayıtlı bir varlıktır ve eşleştirmeyi personel yapar.
                  */}
                  <SelectField
                    label="Marka"
                    hint={`Müşterinin yazdığı: ${request.brand}`}
                    value={conversion.brandId}
                    onChange={(event) => {
                      setConversion({ ...conversion, brandId: event.target.value });
                    }}
                  >
                    <option value="">Marka yok</option>
                    {(brands ?? []).map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Ürün durumu"
                    value={conversion.condition}
                    onChange={(event) => {
                      setConversion({
                        ...conversion,
                        condition: event.target.value as ProductCondition,
                      });
                    }}
                  >
                    {PRODUCT_CONDITIONS.map((value) => (
                      <option key={value} value={value}>
                        {PRODUCT_CONDITION_LABELS[value].label}
                      </option>
                    ))}
                  </SelectField>

                  <TextField
                    label="Garanti (ay)"
                    type="number"
                    min={0}
                    max={60}
                    value={String(conversion.warrantyMonths)}
                    onChange={(event) => {
                      setConversion({
                        ...conversion,
                        warrantyMonths: Number(event.target.value),
                      });
                    }}
                  />

                  <CheckboxField
                    label="Talep fotoğraflarını ürün görseli olarak kullan"
                    checked={conversion.copyPhotos}
                    onChange={(event) => {
                      setConversion({ ...conversion, copyPhotos: event.target.checked });
                    }}
                  />

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      isLoading={convertRequest.isPending}
                      onClick={submitConversion}
                    >
                      Oluştur
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setConversion(null);
                      }}
                    >
                      Vazgeç
                    </Button>
                  </div>
                </>
              )}
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
