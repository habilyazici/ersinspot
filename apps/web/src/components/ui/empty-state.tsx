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
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-16 text-center', className)}>
      {Icon === undefined ? null : <Icon className="size-12 text-slate-300" aria-hidden="true" />}

      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>

      {description === undefined ? null : (
        <p className="max-w-md text-sm text-slate-600">{description}</p>
      )}

      {action === undefined ? null : <div className="mt-2">{action}</div>}
    </div>
  );
}
