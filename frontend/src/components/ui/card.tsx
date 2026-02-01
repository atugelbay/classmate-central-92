import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-xl text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card shadow-soft border-0 hover:shadow-soft-lg hover:-translate-y-0.5",
        gradient: "bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-0 shadow-soft hover:shadow-soft-lg",
        glass: "bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg",
        accent: "bg-card border-l-4 border-l-primary shadow-soft hover:shadow-soft-lg",
        ghost: "bg-transparent hover:bg-muted/50",
        outline: "bg-transparent border-2 border-dashed border-muted-foreground/20 hover:border-primary/30",
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
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
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
  gradient?: string;
  hover?: boolean;
}

const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  ({ className, gradient, hover = true, children, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        "rounded-3xl p-5 transition-all duration-300",
        gradient || "bg-white dark:bg-gray-900",
        hover && "hover:shadow-lg hover:scale-[1.02] cursor-pointer",
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
  color?: "violet" | "emerald" | "sky" | "amber" | "rose";
}

const colorMap = {
  violet: "from-violet-50 to-purple-100 dark:from-violet-950 dark:to-purple-900",
  emerald: "from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900",
  sky: "from-sky-50 to-blue-100 dark:from-sky-950 dark:to-blue-900",
  amber: "from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900",
  rose: "from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900",
};

const textColorMap = {
  violet: "text-violet-600 dark:text-violet-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  sky: "text-sky-600 dark:text-sky-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
};

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, icon, label, value, trend, color = "violet", ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        "rounded-2xl p-4 bg-gradient-to-br transition-all duration-200 hover:shadow-soft",
        colorMap[color],
        className
      )} 
      {...props}
    >
      <div className="flex items-center justify-between mb-2">
        {icon && (
          <div className={cn("p-2 rounded-xl bg-white/50 dark:bg-white/10", textColorMap[color])}>
            {icon}
          </div>
        )}
        {trend && (
          <span className={cn("text-xs font-medium", trend.positive ? "text-emerald-600" : "text-rose-600")}>
            {trend.positive ? "+" : "-"}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className={cn("text-2xl font-bold", textColorMap[color].replace("600", "900").replace("400", "100"))}>
        {value}
      </div>
      <div className={cn("text-xs mt-1", textColorMap[color])}>
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
