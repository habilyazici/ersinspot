/**
 * Taleplerim.
 *
 * Üç talep türü TEK listede görünür. Müşteri için bunlar "benim taleplerim"dir;
 * içeride ayrı tablolara yazılmaları onu ilgilendirmez.
 *
 * Sayfa, siparişler listesiyle aynı düzeni kullanır: aynı kart, aynı rozet,
 * aynı boş durum. İki liste farklı şeyler gösterir ama aynı şekilde okunur.
 */

import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Home, Package, Wrench } from 'lucide-react';
import { REQUEST_STATUS_LABELS, SERVICE_KIND_LABELS } from '@ersinspot/shared';
import type { ServiceKind } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { Pagination } from '@/components/ui/pagination.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatDate, formatPrice } from '@/lib/format.ts';
import { useMyRequests } from '@/features/servicing';

/** Talep türünün simgesi. Listede türü bir bakışta ayırt etmek için. */
const KIND_ICONS: Readonly<Record<ServiceKind, typeof Home>> = {
  moving: Home,
  technical_service: Wrench,
  sell_request: Package,
};

export default function MyRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('sayfa') ?? '1');

  const { data, isLoading, isError, error, refetch } = useMyRequests({ page });

  if (isLoading) return <PageSpinner label="Talepler yükleniyor" />;

  if (isError) {
    return (
      <PageContainer width="prose">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Taleplerim"
        description="Nakliye, teknik servis ve ürün satma taleplerinizin durumunu buradan izleyebilirsiniz."
      />

      {data === undefined || data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Henüz talebiniz yok"
          description="Nakliye, teknik servis veya ürün satma talebi oluşturduğunuzda burada listelenir."
          action={
            <Button asChild>
              <Link to="/nakliye">Nakliye talebi oluştur</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="mt-8 space-y-3">
            {data.items.map((request) => {
              const Icon = KIND_ICONS[request.kind];

              return (
                <Card as="li" key={request.id} interactive className="p-0">
                  <Link to={`/hesabim/taleplerim/${request.id}`} className="flex gap-4 p-4">
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
                        {SERVICE_KIND_LABELS[request.kind].label} · {formatDate(request.createdAt)}
                        {request.appointmentDate === null
                          ? ''
                          : ` · Randevu: ${formatDate(request.appointmentDate)}`}
                      </p>
                    </div>

                    {request.quotedAmount === null ? null : (
                      <p className="shrink-0 self-center font-semibold text-brand-orange-600">
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
              setSearchParams({ sayfa: String(next) });
            }}
          />
        </>
      )}
    </PageContainer>
  );
}
