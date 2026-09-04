import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import type { ProductSummary } from '@ersinspot/shared';
import { PRODUCT_CONDITION_LABELS, PRODUCT_STATUS_LABELS } from '@ersinspot/shared';
import { Card } from '@/components/ui/card.tsx';
import { StatusBadge } from '@/components/ui/status-badge.tsx';
import { formatPrice } from '@/lib/format.ts';
import { cn } from '@/lib/utils.ts';

/**
 * Ürün kartı.
 *
 * Kartın tamamı bağlantıdır ama tek bir erişilebilir ada sahiptir: başlık
 * bağlantıyı taşır, kartın geri kalanı `::after` ile tıklanabilir alanı
 * genişletir. Böylece ekran okuyucu tek bir bağlantı duyurur, kart içinde
 * iç içe bağlantı oluşmaz.
 *
 * Kart SUNUM bileşenidir ve kendi başına veri çekmez. Köşedeki `action` yuvası
 * bu yüzden var: favori düğmesi `ordering` modülüne aittir ve katalog kartının
 * onu tanıması, iki özellik modülünü birbirine bağlardı. Çağıran sayfa hangi
 * eylemi koyacağına karar verir.
 */
export function ProductCard({
  product,
  action,
}: {
  product: ProductSummary;
  /** Görselin sağ üst köşesine yerleşen eylem; favori düğmesi gibi. */
  action?: ReactNode;
}) {
  const isReserved = product.status === 'reserved';

  return (
    /*
      Kart görünümü ortak `Card` bileşeninden gelir.

      Burada kenarlık, köşe yarıçapı ve zemin elle yazılıydı — yani kart
      görünümünün ikinci bir tanımıydı. Tutarlılık testi bu kalıbı arıyor ama
      yalnızca `routes/` ve `components/ui/` altını tarıyordu; özellik
      modüllerindeki kopya denetim dışında kalmıştı. Dolgu `p-0` ile kapatılır:
      görsel kartın kenarına kadar uzanır.
    */
    <Card
      as="article"
      className={cn(
        'group relative flex flex-col overflow-hidden p-0',
        'shadow-card transition-shadow hover:shadow-card-hover',
        'focus-within:ring-2 focus-within:ring-brand-orange-500 focus-within:ring-offset-2',
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {product.coverImage === null ? (
          <div className="flex h-full items-center justify-center">
            <ImageOff className="size-10 text-slate-300" aria-hidden="true" />
          </div>
        ) : (
          <img
            src={product.coverImage.url}
            alt={product.coverImage.altText === '' ? product.title : product.coverImage.altText}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {action === undefined ? null : <div className="absolute right-2 top-2">{action}</div>}

        {isReserved ? (
          <div className="absolute inset-x-0 bottom-0 bg-brand-navy-800/90 px-3 py-1.5 text-center text-xs font-medium text-white">
            {PRODUCT_STATUS_LABELS.reserved.label}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">
            {product.brand?.name ?? product.category.name}
          </span>
          <StatusBadge meta={PRODUCT_CONDITION_LABELS[product.condition]} />
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
          {/*
            Kartın tıklanabilir alanını genişleten bağlantı. `after` sözde
            öğesi kartın tamamını kaplar; ayrı bir sarmalayıcı bağlantıya
            gerek kalmaz.
          */}
          <Link
            to={`/urun/${product.slug}`}
            className="after:absolute after:inset-0 after:content-[''] hover:text-brand-orange-600"
          >
            {product.title}
          </Link>
        </h3>

        <p className="mt-auto pt-2 text-lg font-bold text-brand-orange-600">
          {formatPrice(product.price)}
        </p>
      </div>
    </Card>
  );
}
