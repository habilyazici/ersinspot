/**
 * Sayfa iskeleti: kapsayıcı, başlık ve bölüm.
 *
 * Her sayfa kendi genişliğini, dolgusunu ve başlık biçimini yazdığında sonuç
 * tutarsız olur. Denetimde on bir sayfada sekiz farklı kapsayıcı ölçüsü ve üç
 * farklı kart dolgusu bulundu: aynı işi yapan iki ekran farklı görünüyordu.
 *
 * Burada ölçüler bir kez tanımlanır. Bir sayfanın içeriği farklı olabilir,
 * çerçevesi olamaz.
 */

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

/**
 * Sayfa genişlikleri.
 *
 * İçeriğin türüne göre seçilir, göze göre değil. Aynı türdeki iki sayfa aynı
 * genişliği kullanır.
 */
const WIDTHS = {
  /** Giriş, kayıt, şifre sıfırlama — tek sütun kısa form. */
  narrow: 'max-w-md',
  /** Sipariş takip, 404, kısa metin sayfaları. */
  prose: 'max-w-2xl',
  /** Liste ve detay sayfaları. */
  content: 'max-w-4xl',
  /** İki sütunlu formlar: solda alanlar, sağda özet. */
  form: 'max-w-5xl',
  /** Vitrin: ürün listesi, anasayfa, ürün detayı. */
  wide: 'max-w-7xl',
} as const;

export interface PageContainerProps {
  width?: keyof typeof WIDTHS;
  children: ReactNode;
  className?: string;
}

export function PageContainer({ width = 'content', children, className }: PageContainerProps) {
  return (
    <div className={cn('mx-auto px-4 py-8 sm:px-6 lg:px-8', WIDTHS[width], className)}>
      {children}
    </div>
  );
}

export interface PageHeaderProps {
  title: string;
  /** Başlığın altındaki açıklama. Bağlantı içerebilir. */
  description?: ReactNode;
  /** Başlığın üstünde gösterilen ikon. Yalnızca ortalanmış başlıklarda. */
  icon?: LucideIcon;
  /**
   * Ortalanmış başlık, tek bir eylem etrafında kurulu sayfalar içindir
   * (sipariş takip gibi). Varsayılan sola yaslıdır.
   */
  align?: 'left' | 'center';
  /**
   * Başlığın altındaki kısa künye: takip numarası, tarih.
   * Tek satırda, küçük ve soluk gösterilir.
   */
  meta?: ReactNode;
  /** Sağ tarafta duran öğe — genellikle durum rozeti. */
  aside?: ReactNode;
  /** Üstte gösterilen geri dönüş bağlantısı. */
  backTo?: { to: string; label: string };
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  align = 'left',
  meta,
  aside,
  backTo,
  className,
}: PageHeaderProps) {
  const centered = align === 'center';

  return (
    <header className={cn('space-y-4', centered && 'text-center', className)}>
      {backTo === undefined ? null : (
        <Link
          to={backTo.to}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {backTo.label}
        </Link>
      )}

      <div
        className={cn(
          'flex flex-wrap items-start gap-4',
          centered ? 'justify-center' : 'justify-between',
        )}
      >
        <div className={cn('min-w-0 space-y-1', centered && 'w-full')}>
          {Icon === undefined ? null : (
            <Icon
              className={cn('size-10 text-brand-orange-500', centered && 'mx-auto')}
              aria-hidden="true"
            />
          )}

          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>

          {description === undefined ? null : (
            <div className={cn('max-w-2xl text-sm text-slate-600', centered && 'mx-auto')}>
              {description}
            </div>
          )}

          {meta === undefined ? null : (
            <div
              className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500',
                centered && 'justify-center',
              )}
            >
              {meta}
            </div>
          )}
        </div>

        {aside === undefined ? null : <div className="shrink-0">{aside}</div>}
      </div>
    </header>
  );
}

export interface SectionProps {
  title: string;
  icon?: LucideIcon;
  /** Başlığın sağındaki eylem — "Tümünü gör" gibi. */
  action?: ReactNode;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Başlıklı bölüm.
 *
 * Başlık daima `h2`: sayfa başlığı `h1` olduğu için düzey atlanmaz ve ekran
 * okuyucuda gezinme doğru çalışır.
 */
export function Section({
  title,
  icon: Icon,
  action,
  description,
  children,
  className,
}: SectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {Icon === undefined ? null : (
            <Icon className="size-4 text-slate-400" aria-hidden="true" />
          )}
          {title}
        </h2>

        {action}
      </div>

      {description === undefined ? null : <p className="text-sm text-slate-600">{description}</p>}

      {children}
    </section>
  );
}
