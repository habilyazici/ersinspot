/**
 * Talep bilgileri bloğu.
 *
 * Müşteri ve personel AYNI bilgiyi görür; ayrım yalnızca sayfanın etrafındaki
 * eylemlerdedir. Blok iki sayfada ayrı yazılsaydı biri güncellenip diğeri
 * unutulduğunda müşteri ile personel farklı şeyler okurdu — hizmet talebinde
 * bu, yanlış işin yapılması demektir.
 */

import { ClipboardList, Home, Package, Wrench } from 'lucide-react';
import {
  DEVICE_TYPE_LABELS,
  HOUSE_SIZE_LABELS,
  PRODUCT_CONDITION_LABELS,
  PROBLEM_CATEGORY_LABELS,
  WARRANTY_STATUS_LABELS,
} from '@ersinspot/shared';
import type { ServiceRequest } from '@ersinspot/shared';
import { Card, DetailList } from '@/components/ui/card.tsx';
import type { DetailRow } from '@/components/ui/card.tsx';
import { Section } from '@/components/ui/page.tsx';
import { formatAddress, formatDate, formatPrice } from '@/lib/format.ts';

/** Kat ve asansör bilgisini adresle birlikte okunur hâle getirir. */
function describeLocation(location: {
  address: Parameters<typeof formatAddress>[0];
  floor: number;
  hasElevator: boolean;
}): string {
  const floor = location.floor === 0 ? 'zemin kat' : `${String(location.floor)}. kat`;
  const elevator = location.hasElevator ? 'asansörlü' : 'asansörsüz';

  return `${formatAddress(location.address)} · ${floor}, ${elevator}`;
}

/**
 * Türe özgü bilgi satırları.
 *
 * `kind` ayrımlı birleşimin ayırıcısıdır; TypeScript her dalda hangi alanların
 * mevcut olduğunu buradan bilir. Yeni bir talep türü eklendiğinde bu switch
 * derlenmez ve eksik dal derleme anında görünür.
 */
function detailRows(request: ServiceRequest): {
  icon: typeof Home;
  rows: readonly (DetailRow | null)[];
} {
  switch (request.kind) {
    case 'moving':
      return {
        icon: Home,
        rows: [
          { term: 'Ev büyüklüğü', value: HOUSE_SIZE_LABELS[request.houseSize] },
          { term: 'Çıkış adresi', value: describeLocation(request.fromLocation), stacked: true },
          { term: 'Varış adresi', value: describeLocation(request.toLocation), stacked: true },
          { term: 'Tercih edilen tarih', value: formatDate(request.preferredDate) },
          {
            /*
              Hem satır hem ADET yazılır. Tahmin adede göre hesaplanır
              (`estimateMoving`, `itemCount`); yalnızca satır sayısını
              göstermek "1 kalem" yazan bir talebin beş koltuk üzerinden
              fiyatlandığını gizliyordu.
            */
            term: 'Eşya sayısı',
            value: `${String(request.items.length)} kalem · ${String(
              request.items.reduce((total, item) => total + item.quantity, 0),
            )} adet`,
          },
          { term: 'Ambalajlama', value: request.needsPacking ? 'İsteniyor' : 'İstenmiyor' },
          { term: 'Montaj', value: request.needsAssembly ? 'İsteniyor' : 'İstenmiyor' },
          { term: 'İlk tahmin', value: formatPrice(request.estimatedTotal) },
        ],
      };

    case 'technical_service':
      return {
        icon: Wrench,
        rows: [
          {
            term: 'Cihaz',
            value:
              request.customDeviceType ??
              `${DEVICE_TYPE_LABELS[request.deviceType]} · ${request.brand}`,
          },
          request.model === null ? null : { term: 'Model', value: request.model },
          { term: 'Garanti', value: WARRANTY_STATUS_LABELS[request.warrantyStatus] },
          { term: 'Arıza türü', value: PROBLEM_CATEGORY_LABELS[request.problemCategory] },
          { term: 'Arıza açıklaması', value: request.problemDescription, stacked: true },
          { term: 'Adres', value: formatAddress(request.address), stacked: true },
          { term: 'Tercih edilen tarih', value: formatDate(request.preferredDate) },
          { term: 'Keşif ücreti', value: formatPrice(request.inspectionFee) },
          request.diagnosis === null
            ? null
            : { term: 'Teknisyen tespiti', value: request.diagnosis, stacked: true },
        ],
      };

    case 'sell_request':
      return {
        icon: Package,
        rows: [
          { term: 'Ürün', value: request.title },
          { term: 'Kategori', value: request.category.name },
          { term: 'Marka', value: request.brand },
          request.model === null ? null : { term: 'Model', value: request.model },
          { term: 'Durum', value: PRODUCT_CONDITION_LABELS[request.condition].label },
          request.purchaseYear === null
            ? null
            : { term: 'Alım yılı', value: String(request.purchaseYear) },
          { term: 'Açıklama', value: request.description, stacked: true },
          {
            term: 'Yanında gelenler',
            value:
              [
                request.hasBox ? 'kutusu' : null,
                request.hasAccessories ? 'aksesuarları' : null,
                request.hasWarranty ? 'garanti belgesi' : null,
              ]
                .filter((item): item is string => item !== null)
                .join(', ') || 'yok',
          },
          request.askingPrice === null
            ? null
            : { term: 'Beklediği fiyat', value: formatPrice(request.askingPrice) },
          {
            term: 'Teslim alma adresi',
            value: formatAddress(request.pickupAddress),
            stacked: true,
          },
        ],
      };
  }
}

export interface RequestInfoProps {
  request: ServiceRequest;
  /** Personel görünümünde iletişim bilgisi de gösterilir. */
  showContact?: boolean;
}

export function RequestInfo({ request, showContact = false }: RequestInfoProps) {
  const { icon, rows } = detailRows(request);

  return (
    <>
      <Section title="Talep Bilgileri" icon={icon}>
        <Card>
          <DetailList
            rows={[
              showContact
                ? { term: 'Müşteri', value: `${request.contactName} · ${request.contactPhone}` }
                : null,
              ...rows,
            ]}
          />
        </Card>
      </Section>

      {/* Nakliyede eşya listesi ayrı gösterilir: satır sayısı değişkendir. */}
      {request.kind !== 'moving' ? null : (
        <Section title="Taşınacak Eşyalar" icon={ClipboardList}>
          <Card>
            <ul className="space-y-1 text-sm">
              {request.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span className="text-slate-700">
                    {item.name}
                    {item.needsDisassembly ? ' (söküm gerekli)' : ''}
                    {item.note === null || item.note === undefined ? '' : ` — ${item.note}`}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-slate-900">
                    {item.quantity} adet
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}

      {request.photos.length === 0 ? null : (
        <Section title="Fotoğraflar" icon={Package}>
          <ul className="flex flex-wrap gap-3">
            {request.photos.map((photo) => (
              <li
                key={photo.url}
                className="size-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? ''}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
