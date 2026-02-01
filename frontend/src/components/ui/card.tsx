import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-xl text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        // Default - Белый фон, тонкая рамка, мягкая тень
        default: "bg-card border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
        // Gradient - Для акцентных блоков
        gradient: "bg-gradient-to-br from-primary via-primary-dark to-accent border-0 text-white",
        // Glass - Стеклянный эффект
        glass: "bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg",
        // Accent - С левой полосой
        accent: "bg-card border border-border border-l-4 border-l-primary shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        // Ghost - Прозрачная
        ghost: "bg-transparent hover:bg-muted/50",
        // Outline - Пунктирная рамка
        outline: "bg-transparent border-2 border-dashed border-muted-foreground/20 hover:border-primary/30",
        // Flat - Без тени, только рамка
        flat: "bg-card border border-border",
      },
      size: {
        default: "",
        compact: "p-3",
        comfortable: "p-8",
      },
      rounded: {
        default: "rounded-xl",
        lg: "rounded-2xl",
        xl: "rounded-3xl",
        full: "rounded-[2rem]",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
    },
  }
);

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, rounded, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(cardVariants({ variant, size, rounded }), className)} 
      {...props} 
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-base font-semibold leading-tight tracking-tight text-foreground", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

// Specialized Bento Card for dashboard widgets
interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "gradient";
  hover?: boolean;
}

const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  ({ className, variant = "default", hover = true, children, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        "rounded-2xl p-5 transition-all duration-200",
        variant === "default" 
          ? "bg-card border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)]" 
          : "bg-gradient-to-br from-primary via-primary-dark to-accent text-white",
        hover && variant === "default" && "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-pointer",
        hover && variant === "gradient" && "hover:shadow-lg cursor-pointer",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
);
BentoCard.displayName = "BentoCard";

// Stat Card for compact metrics
interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; positive: boolean };
  color?: "primary" | "success" | "info" | "warning" | "danger";
}

// Icon background colors
const iconBgMap = {
  primary: "bg-[hsl(250,84%,54%)]",
  success: "bg-[hsl(158,64%,45%)]",
  info: "bg-[hsl(217,91%,60%)]",
  warning: "bg-[hsl(38,92%,55%)]",
  danger: "bg-[hsl(0,72%,51%)]",
};

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, icon, label, value, trend, color = "primary", ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        "rounded-xl p-4 bg-card border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
        className
      )} 
      {...props}
    >
      <div className="flex items-center justify-between mb-3">
        {icon && (
          <div className={cn("p-2 rounded-lg text-white", iconBgMap[color])}>
            {icon}
          </div>
        )}
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            trend.positive 
              ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50" 
              : "text-rose-600 bg-rose-50 dark:bg-rose-950/50"
          )}>
            {trend.positive ? "+" : "-"}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground">
        {value}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  )
);
StatCard.displayName = "StatCard";

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  BentoCard,
  StatCard,
  cardVariants,
};
