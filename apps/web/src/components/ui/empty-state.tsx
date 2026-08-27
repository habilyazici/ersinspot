import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils.ts';

/**
 * Boş durum.
 *
 * Liste boşken ne yapılacağını söyler. Eski kod tabanında boş listeler sessizce
 * hiçbir şey göstermiyordu ve kullanıcı sayfanın yüklenmediğini sanıyordu.
 */
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /**
   * Başlığın düzeyi.
   *
   * Varsayılan `h3`: boş durum genellikle sayfa başlığının (`h1`) altındaki bir
   * bölümde görünür. Boş durumun sayfanın TEK içeriği olduğu yerlerde (404
   * sayfası gibi) `1` verilir; aksi halde ekran okuyucuda başlık düzeyi atlanmış
   * olur ve kullanıcı başlıklar arasında gezinirken sahipsiz bir `h3` bulur.
   */
  headingLevel?: 1 | 2 | 3;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  headingLevel = 3,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-16 text-center', className)}>
      {Icon === undefined ? null : <Icon className="size-12 text-slate-300" aria-hidden="true" />}

      <Heading className="text-lg font-semibold text-slate-900">{title}</Heading>

      {description === undefined ? null : (
        <p className="max-w-md text-sm text-slate-600">{description}</p>
      )}

      {action === undefined ? null : <div className="mt-2">{action}</div>}
    </div>
  );
}
