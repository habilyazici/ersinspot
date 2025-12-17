import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        // New color variants
        teal: "bg-[var(--brand-teal-500)] text-white hover:bg-[var(--brand-teal-600)] focus-visible:ring-[var(--brand-teal-200)]",
        coral: "bg-[var(--brand-coral-500)] text-white hover:bg-[var(--brand-coral-600)] focus-visible:ring-[var(--brand-coral-200)]",
        bronze: "bg-[var(--brand-bronze-500)] text-white hover:bg-[var(--brand-bronze-600)] focus-visible:ring-[var(--brand-bronze-200)]",
        cream: "bg-[var(--brand-cream-500)] text-[var(--brand-bronze-800)] hover:bg-[var(--brand-cream-600)] border border-[var(--brand-cream-600)]",
        "teal-outline": "border-2 border-[var(--brand-teal-500)] text-[var(--brand-teal-700)] hover:bg-[var(--brand-teal-50)] hover:border-[var(--brand-teal-600)]",
        "coral-outline": "border-2 border-[var(--brand-coral-500)] text-[var(--brand-coral-700)] hover:bg-[var(--brand-coral-50)] hover:border-[var(--brand-coral-600)]",
        "bronze-outline": "border-2 border-[var(--brand-bronze-500)] text-[var(--brand-bronze-700)] hover:bg-[var(--brand-bronze-50)] hover:border-[var(--brand-bronze-600)]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };