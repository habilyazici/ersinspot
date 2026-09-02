/**
 * Yönetim genel bakış.
 *
 * Sayfanın işi tek bir soruyu yanıtlamaktır: "bugün neye bakmam gerekiyor?"
 * Bu yüzden gösterilen şey toplam sayılar değil, İŞLEM BEKLEYEN kayıtlardır —
 * kaç sipariş verildiği değil, kaçının hazırlanmayı beklediği.
 *
 * Sayılar mevcut liste uçlarından okunur; ayrı bir "istatistik" ucu yoktur.
 * Öyle bir uç, aynı bilgiyi ikinci bir yerde hesaplamak ve iki hesabın
 * ayrışması riskini almak olurdu.
 */

import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  ClipboardList,
  Mail,
  Package,
  ShoppingBag,
  TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { REQUEST_STATUS_LABELS, SERVICE_KIND_LABELS, today } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { PageHeader, Section } from '@/components/ui/page.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatDate, formatTimeSlot } from '@/lib/format.ts';
import { useAdminProducts } from '@/features/catalog';
import { useUnreadMessageCount } from '@/features/content';
import { useAdminOrders } from '@/features/ordering';
import { useAdminRequests, useAppointmentsOnDate } from '@/features/servicing';

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  to: string;
  tone?: 'neutral' | 'attention';
}) {
  return (
    <Card as="li" interactive className="p-0">
      <Link to={to} className="flex items-center gap-4 p-4">
        <span
          className={
            tone === 'attention' && value !== undefined && value > 0
              ? 'flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-orange-50 text-brand-orange-600'
              : 'flex size-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500'
          }
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>

        <span className="min-w-0">
          <span className="block text-2xl font-bold tabular-nums text-slate-900">
            {value ?? '—'}
          </span>
          <span className="block text-sm text-slate-600">{label}</span>
        </span>
      </Link>
    </Card>
  );
}

export default function AdminDashboardPage() {
  // "İşlem bekleyen" sayımlar: liste uçlarının toplam sayısı kullanılır.
  const newOrders = useAdminOrders({ status: 'received', pageSize: 1 });
  const preparingOrders = useAdminOrders({ status: 'preparing', pageSize: 1 });
  const pendingRequests = useAdminRequests({ status: 'pending', pageSize: 5 });
  const draftProducts = useAdminProducts({ status: 'draft', pageSize: 1 });
  const unreadMessages = useUnreadMessageCount();
  const todaysAppointments = useAppointmentsOnDate(today());

  const unreadCount = unreadMessages.data;
  const appointments = todaysAppointments.data;

  /*
    Bu sayfa altı ayrı sorgu yapar. Biri düşerse sayfanın tamamını hata
    ekranına çevirmek yanlış olurdu — yüklenen kutular hâlâ işe yarar. Ama
    sessizce "—" veya "kayıt yok" göstermek de yanlış: personel bekleyen iş
    olmadığını sanır. Bu yüzden yüklenen gösterilir, düşenler için üstte bir
    uyarı çıkar.
  */
  const queries = [
    newOrders,
    preparingOrders,
    pendingRequests,
    draftProducts,
    unreadMessages,
    todaysAppointments,
  ];

  const failed = queries.filter((query) => query.isError);

  return (
    <>
      <PageHeader
        title="Genel Bakış"
        description="İşlem bekleyen kayıtlar. Sayıya tıklayarak ilgili listeye gidebilirsiniz."
      />

      {failed.length === 0 ? null : (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center gap-3 rounded-lg bg-state-danger-bg px-4 py-3 text-sm text-state-danger-fg"
        >
          <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />

          <p className="min-w-0 flex-1">
            Bazı bilgiler yüklenemedi ({failed.length}/{queries.length}). Aşağıda görünen sayılar
            eksik olabilir.
          </p>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              for (const query of failed) void query.refetch();
            }}
          >
            Tekrar dene
          </Button>
        </div>
      )}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ShoppingBag}
          label="Hazırlanmayı bekleyen sipariş"
          value={newOrders.data?.totalItems}
          to="/yonetim/siparisler?durum=received"
          tone="attention"
        />
        <StatCard
          icon={Package}
          label="Hazırlanan sipariş"
          value={preparingOrders.data?.totalItems}
          to="/yonetim/siparisler?durum=preparing"
        />
        <StatCard
          icon={ClipboardList}
          label="İncelenmeyi bekleyen talep"
          value={pendingRequests.data?.totalItems}
          to="/yonetim/talepler?durum=pending"
          tone="attention"
        />
        <StatCard
          icon={Mail}
          label="Okunmamış mesaj"
          value={unreadCount}
          to="/yonetim/mesajlar"
          tone="attention"
        />
      </ul>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Section title="Bugünün Randevuları" icon={CalendarCheck}>
          {appointments === undefined || appointments.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">Bugün için planlanmış randevu yok.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {appointments.map((appointment) => (
                <Card as="li" key={appointment.requestId} interactive className="p-0">
                  <Link
                    to={`/yonetim/talepler/${appointment.requestId}`}
                    className="flex items-center gap-3 p-4"
                  >
                    <span className="shrink-0 rounded-lg bg-brand-navy-50 px-2 py-1 text-sm font-medium tabular-nums text-brand-navy-800">
                      {formatTimeSlot({
                        startTime: appointment.startTime,
                        endTime: appointment.endTime,
                      })}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">
                        {SERVICE_KIND_LABELS[appointment.kind].label}
                      </span>
                      <span className="block font-mono text-xs text-slate-500">
                        {appointment.referenceNumber}
                      </span>
                    </span>
                  </Link>
                </Card>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Bekleyen Talepler"
          icon={ClipboardList}
          action={
            <Link
              to="/yonetim/talepler"
              className="text-sm font-medium text-brand-navy-700 hover:underline"
            >
              Tümü
            </Link>
          }
        >
          {pendingRequests.data === undefined || pendingRequests.data.items.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">İncelenmeyi bekleyen talep yok.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {pendingRequests.data.items.map((request) => (
                <Card as="li" key={request.id} interactive className="p-0">
                  <Link to={`/yonetim/talepler/${request.id}`} className="block p-4">
                    <span className="flex flex-wrap items-start justify-between gap-2">
                      <span className="font-mono text-xs text-slate-500">
                        {request.referenceNumber}
                      </span>
                      <StatusBadge meta={REQUEST_STATUS_LABELS[request.status]} />
                    </span>

                    <span className="mt-1 block truncate text-sm font-medium text-slate-900">
                      {request.title}
                    </span>

                    <span className="mt-1 block text-xs text-slate-500">
                      {formatDate(request.createdAt)}
                    </span>
                  </Link>
                </Card>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {draftProducts.data !== undefined && draftProducts.data.totalItems > 0 ? (
        <Section title="Taslak Ürünler" icon={Package} className="mt-8">
          <Card>
            <p className="text-sm text-slate-600">
              {draftProducts.data.totalItems} ürün taslak hâlde bekliyor; vitrinde görünmüyorlar.{' '}
              <Link
                to="/yonetim/urunler?durum=draft"
                className="font-medium text-brand-navy-700 hover:underline"
              >
                Taslakları gör
              </Link>
            </p>
          </Card>
        </Section>
      ) : null}

      {/* "Bekleyen iş yok" ancak veriler GERÇEKTEN yüklendiyse söylenebilir. */}
      {failed.length === 0 &&
      newOrders.data?.totalItems === 0 &&
      pendingRequests.data?.totalItems === 0 &&
      unreadCount === 0 ? (
        <EmptyState
          title="Bekleyen iş yok"
          description="Tüm siparişler ve talepler işleme alınmış durumda."
          className="mt-8"
        />
      ) : null}
    </>
  );
}
