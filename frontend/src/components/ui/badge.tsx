import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 dark:from-emerald-900 dark:to-green-900 dark:text-emerald-300",
        warning: "border-transparent bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 dark:from-amber-900 dark:to-orange-900 dark:text-amber-300",
        info: "border-transparent bg-gradient-to-r from-sky-100 to-blue-100 text-sky-700 dark:from-sky-900 dark:to-blue-900 dark:text-sky-300",
      },
      rounded: {
        default: "rounded-full",
        lg: "rounded-xl",
        md: "rounded-lg",
      }
    },
    defaultVariants: {
      variant: "default",
      rounded: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, rounded, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, rounded }), className)} {...props} />;
}

export { Badge, badgeVariants };
