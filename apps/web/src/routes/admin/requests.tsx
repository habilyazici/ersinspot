/**
 * Yönetim — talep listesi.
 *
 * Üç talep türü tek listede süzülebilir. Personel için ayrım genellikle TÜRE
 * göre değil DURUMA göre anlamlıdır: "hangi talepler teklif bekliyor" sorusu,
 * "hangi nakliye talepleri var" sorusundan daha sık sorulur. Bu yüzden durum
 * süzgeci önce gelir.
 */

import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Home, Package, Search, Wrench } from 'lucide-react';
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  SERVICE_KINDS,
  SERVICE_KIND_LABELS,
} from '@ersinspot/shared';
import type { RequestStatus, ServiceKind } from '@ersinspot/shared';
import { Card } from '@/components/ui/card.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { PageHeader } from '@/components/ui/page.tsx';
import { FilterChips, Pagination } from '@/components/ui/pagination.tsx';
import { SearchField } from '@/components/ui/search-field.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatDate, formatPrice } from '@/lib/format.ts';
import { useAdminRequests } from '@/features/servicing';

const KIND_ICONS: Readonly<Record<ServiceKind, typeof Home>> = {
  moving: Home,
  technical_service: Wrench,
  sell_request: Package,
};

export default function AdminRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = (searchParams.get('durum') ?? undefined) as RequestStatus | undefined;
  const kind = (searchParams.get('tur') ?? undefined) as ServiceKind | undefined;
  const search = searchParams.get('ara') ?? '';
  const page = Number(searchParams.get('sayfa') ?? '1');

  const { data, isLoading, isError, error, refetch } = useAdminRequests({
    page,
    ...(status === undefined ? {} : { status }),
    ...(kind === undefined ? {} : { kind }),
    ...(search === '' ? {} : { search }),
  });

  function setFilter(key: string, value: string | undefined): void {
    const next = new URLSearchParams(searchParams);

    if (value === undefined || value === '') next.delete(key);
    else next.set(key, value);

    if (key !== 'sayfa') next.delete('sayfa');

    // Süzgeç değişimi geçmişe kayıt eklemez; geri tuşu listede değil,
    // sayfalar arasında gezinmelidir.
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <PageHeader
        title="Talepler"
        description="Nakliye, teknik servis ve ürün satma talepleri. Takip numarası veya müşteri adıyla arayabilirsiniz."
      />

      <div className="mt-6 space-y-3">
        <SearchField
          value={search}
          placeholder="Takip numarası veya müşteri adı"
          onSearch={(next) => {
            setFilter('ara', next);
          }}
          className="max-w-sm"
        />

        <FilterChips
          label="Talep durumu"
          value={status}
          onChange={(next) => {
            setFilter('durum', next);
          }}
          options={REQUEST_STATUSES.map((value) => ({
            value,
            label: REQUEST_STATUS_LABELS[value].label,
          }))}
        />

        <FilterChips
          label="Talep türü"
          allLabel="Tüm türler"
          value={kind}
          onChange={(next) => {
            setFilter('tur', next);
          }}
          options={SERVICE_KINDS.map((value) => ({
            value,
            label: SERVICE_KIND_LABELS[value].label,
          }))}
        />
      </div>

      {isLoading ? (
        <PageSpinner label="Talepler yükleniyor" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data === undefined || data.items.length === 0 ? (
        <EmptyState
          icon={search === '' ? ClipboardList : Search}
          title={search === '' ? 'Talep yok' : 'Sonuç bulunamadı'}
          description={
            search === ''
              ? 'Bu süzgeçle eşleşen talep bulunmuyor.'
              : 'Arama kriterlerinizi değiştirip tekrar deneyin.'
          }
          className="mt-4"
        />
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600">{data.totalItems} talep</p>

          <ul className="mt-3 space-y-2">
            {data.items.map((request) => {
              const Icon = KIND_ICONS[request.kind];

              return (
                <Card as="li" key={request.id} interactive className="p-0">
                  <Link to={`/yonetim/talepler/${request.id}`} className="flex gap-4 p-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-orange-50">
                      <Icon className="size-5 text-brand-orange-600" aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-mono text-xs text-slate-500">
                          {request.referenceNumber}
                        </p>
                        <StatusBadge meta={REQUEST_STATUS_LABELS[request.status]} />
                      </div>

                      <p className="mt-1 truncate text-sm font-medium text-slate-900">
                        {request.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(request.createdAt)}
                        {request.appointmentDate === null
                          ? ''
                          : ` · Randevu: ${formatDate(request.appointmentDate)}`}
                      </p>
                    </div>

                    {request.quotedAmount === null ? null : (
                      <p className="shrink-0 self-center font-semibold tabular-nums text-brand-orange-600">
                        {formatPrice(request.quotedAmount)}
                      </p>
                    )}
                  </Link>
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
