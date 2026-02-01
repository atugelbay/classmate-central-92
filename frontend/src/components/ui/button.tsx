import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Градиент сине-фиолетовый (магнит для глаз)
        default: "bg-gradient-primary text-white shadow-md hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0",
        // Destructive - Красный
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        // Outline - Контурная с серым текстом
        outline: "border border-border bg-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground",
        // Secondary - Контурная (outline стиль)
        secondary: "border border-border bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        // Ghost - Прозрачная с серым текстом
        ghost: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        // Soft - Мягкий фон
        soft: "bg-primary/10 text-primary hover:bg-primary/15",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
