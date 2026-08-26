/**
 * Durum rozeti testleri.
 *
 * Rozet, etiketleri paylaşılan paketten alır. Eski kod tabanında 19 dosya kendi
 * `getStatus…` fonksiyonunu tanımlıyordu ve etiketler ayrışmıştı.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ORDER_STATUS_LABELS, PRODUCT_CONDITION_LABELS } from '@ersinspot/shared';
import { StatusBadge } from './status-badge.tsx';

describe('durum rozeti', () => {
  it('paylaşılan paketteki etiketi gösterir', () => {
    render(<StatusBadge meta={ORDER_STATUS_LABELS.delivered} />);
    expect(screen.getByText('Teslim Edildi')).toBeInTheDocument();
  });

  it('istendiğinde açıklamayı da gösterir', () => {
    render(<StatusBadge meta={ORDER_STATUS_LABELS.pending_payment} withDescription />);

    expect(screen.getByText('Ödeme Bekleniyor')).toBeInTheDocument();
    expect(screen.getByText(/Havale\/EFT bildiriminiz bekleniyor/)).toBeInTheDocument();
  });

  it('varsayılan olarak açıklamayı gizler', () => {
    render(<StatusBadge meta={ORDER_STATUS_LABELS.pending_payment} />);
    expect(screen.queryByText(/bildiriminiz bekleniyor/)).not.toBeInTheDocument();
  });

  it('duruma göre farklı renk sınıfı uygular', () => {
    const { container: success } = render(<StatusBadge meta={ORDER_STATUS_LABELS.delivered} />);
    const { container: danger } = render(<StatusBadge meta={ORDER_STATUS_LABELS.cancelled} />);

    expect(success.querySelector('span span')?.className).toContain('state-success');
    expect(danger.querySelector('span span')?.className).toContain('state-danger');
  });

  it('ürün kondisyonu etiketlerini de gösterir', () => {
    render(<StatusBadge meta={PRODUCT_CONDITION_LABELS.like_new} />);
    expect(screen.getByText('Az Kullanılmış')).toBeInTheDocument();
  });
});
