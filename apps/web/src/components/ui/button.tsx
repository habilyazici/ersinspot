import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

/**
 * Düğme.
 *
 * Turuncu birincil eylem, lacivert ikincil. Marka renkleri eylem çağrılarında
 * kullanılır; durum renkleri ayrıdır (bkz. `status-badge.tsx`).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    // Simge boyutunu düğme boyutundan türet: her kullanımda elle vermeye gerek kalmasın.
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand-orange-500 text-white hover:bg-brand-orange-600 shadow-sm',
        secondary: 'bg-brand-navy-800 text-white hover:bg-brand-navy-700 shadow-sm',
        outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
        ghost: 'text-slate-700 hover:bg-slate-100',
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
        link: 'text-brand-navy-700 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm [&_svg]:size-4',
        md: 'h-11 px-5 text-sm [&_svg]:size-4',
        lg: 'h-12 px-7 text-base [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Alt bileşeni düğme gibi davrandırır; `Link` sarmalamak için. */
  asChild?: boolean;
  /** Yükleme göstergesi gösterir ve düğmeyi devre dışı bırakır. */
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, isLoading = false, children, disabled, ...props },
  ref,
) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          <span>İşleniyor…</span>
        </>
      ) : (
        children
      )}
    </Component>
  );
});
