/**
 * Tutar özeti.
 *
 * Ödeme sayfası ile sipariş detayında aynı üç satır gösterilir: ara toplam,
 * teslimat, toplam. İki sayfada elle yazıldığında birinde "Ücretsiz" vurgusu
 * varken diğerinde yoktu ve satır aralıkları farklıydı.
 *
 * Bileşen yalnızca GÖSTERİR; hesaplama paylaşılan `calculateOrderTotals`
 * fonksiyonundadır ve sunucu da onu kullanır.
 */

import { formatPrice } from '@/lib/format.ts';

export interface OrderTotalsProps {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export function OrderTotals({ subtotal, deliveryFee, total }: OrderTotalsProps) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-slate-600">Ara toplam</dt>
        <dd className="font-medium text-slate-900">{formatPrice(subtotal)}</dd>
      </div>

      <div className="flex justify-between gap-4">
        <dt className="text-slate-600">Teslimat</dt>
        <dd className="font-medium text-slate-900">
          {deliveryFee === 0 ? (
            <span className="text-brand-teal-700">Ücretsiz</span>
          ) : (
            formatPrice(deliveryFee)
          )}
        </dd>
      </div>

      <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-base">
        <dt className="font-semibold text-slate-900">Toplam</dt>
        <dd className="font-bold text-brand-orange-600">{formatPrice(total)}</dd>
      </div>
    </dl>
  );
}
