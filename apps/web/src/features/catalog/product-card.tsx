import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import type { ProductSummary } from '@ersinspot/shared';
import { PRODUCT_CONDITION_LABELS, PRODUCT_STATUS_LABELS } from '@ersinspot/shared';
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
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  const isReserved = product.status === 'reserved';

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white',
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
    </article>
  );
}
