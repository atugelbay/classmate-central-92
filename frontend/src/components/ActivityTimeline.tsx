import { DollarSign, Calendar, CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import moment from "moment";

interface TimelineItem {
  id: string;
  date: string;
  type: "payment" | "lesson" | "refund" | "debt" | "note";
  title: string;
  description?: string;
  amount?: number;
  status?: "success" | "warning" | "error" | "info";
}

interface ActivityTimelineProps {
  items: TimelineItem[];
  maxItems?: number;
  className?: string;
}

export function ActivityTimeline({ items, maxItems = 10, className }: ActivityTimelineProps) {
  const displayItems = items.slice(0, maxItems);

  const getIcon = (type: TimelineItem["type"]) => {
    switch (type) {
      case "payment":
      case "refund":
      case "debt":
        return <DollarSign className="h-4 w-4" />;
      case "lesson":
        return <Calendar className="h-4 w-4" />;
      case "note":
        return <User className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status?: TimelineItem["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      case "info":
      default:
        return "bg-blue-500";
    }
  };

  const getTypeColor = (type: TimelineItem["type"]) => {
    switch (type) {
      case "payment":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30";
      case "refund":
      case "debt":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
      case "lesson":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30";
    }
  };

  if (displayItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Нет активности</p>
      </div>
    );
  }

  return (
    <div className={cn("relative space-y-4", className)}>
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-transparent" />

      {displayItems.map((item, index) => (
        <div
          key={item.id}
          className="relative flex gap-4 group"
          style={{
            animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
          }}
        >
          {/* Timeline dot */}
          <div className="relative z-10 flex-shrink-0">
            <div
              className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center border-4 border-background shadow-md transition-all duration-300 group-hover:scale-110",
                getTypeColor(item.type)
              )}
            >
              {getIcon(item.type)}
            </div>
            {item.status && (
              <div
                className={cn(
                  "absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-background",
                  getStatusColor(item.status)
                )}
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4 group-hover:translate-x-1 transition-transform duration-200">
            <div className="bg-card border rounded-lg p-4 shadow-sm group-hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{item.title}</h4>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  )}
                </div>
                {item.amount !== undefined && (
                  <div
                    className={cn(
                      "text-sm font-bold whitespace-nowrap",
                      item.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {item.amount > 0 ? "+" : ""}
                    {item.amount.toLocaleString()} ₸
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {moment(item.date).format("DD MMM, HH:mm")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {moment(item.date).fromNow()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

