import { Calendar, DollarSign, BookOpen, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

interface StudentStatsProps {
  stats: StatItem[];
  className?: string;
}

export function StudentStats({ stats, className }: StudentStatsProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  stat.color || "bg-primary/10 group-hover:bg-primary/20"
                )}
              >
                {stat.icon}
              </div>
              {stat.trend && (
                <TrendingUp
                  className={cn(
                    "h-4 w-4",
                    stat.trend === "up" && "text-green-500",
                    stat.trend === "down" && "text-red-500 rotate-180",
                    stat.trend === "neutral" && "text-gray-500"
                  )}
                />
              )}
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
              {stat.subValue && (
                <div className="text-xs text-muted-foreground font-medium">{stat.subValue}</div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Pre-configured stat cards for common use cases
export function AttendanceStat({ attended, total }: { attended: number; total: number }) {
  const rate = total > 0 ? ((attended / total) * 100).toFixed(0) : 0;
  return {
    icon: <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />,
    label: "Посещаемость",
    value: `${rate}%`,
    subValue: `${attended} из ${total}`,
    trend: Number(rate) >= 80 ? ("up" as const) : ("neutral" as const),
    color: "bg-green-50 dark:bg-green-950/30",
  };
}

export function BalanceStat({ balance, currency = "₸" }: { balance: number; currency?: string }) {
  return {
    icon: <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
    label: "Баланс",
    value: `${balance.toLocaleString()} ${currency}`,
    trend: balance > 0 ? ("up" as const) : ("down" as const),
    color: "bg-purple-50 dark:bg-purple-950/30",
  };
}

export function LessonsStat({ remaining, total }: { remaining: number; total: number }) {
  return {
    icon: <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    label: "Уроки",
    value: remaining,
    subValue: `из ${total}`,
    trend: remaining > 0 ? ("up" as const) : ("down" as const),
    color: "bg-blue-50 dark:bg-blue-950/30",
  };
}

export function NextLessonStat({ date }: { date?: string }) {
  return {
    icon: <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />,
    label: "Следующий урок",
    value: date || "Нет",
    subValue: date ? "запланирован" : "уроков",
    color: "bg-orange-50 dark:bg-orange-950/30",
  };
}

