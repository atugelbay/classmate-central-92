import { ClipboardCheck, Loader2 } from "lucide-react";
import { useAttendanceChart } from "@/hooks/useData";

export function AttendanceCompact() {
  const { data: attendanceData = [], isLoading } = useAttendanceChart("week");

  const safeData = Array.isArray(attendanceData) ? attendanceData : [];
  const totalAttended = safeData.reduce((sum, item) => sum + item.attended, 0);
  const totalMissed = safeData.reduce((sum, item) => sum + item.missed, 0);
  const total = totalAttended + totalMissed;
  const rate = total > 0 ? Math.round((totalAttended / total) * 100) : 0;

  // Determine color based on rate
  const getColor = () => {
    if (rate >= 90) return { bg: "from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900", text: "text-emerald-600 dark:text-emerald-400", ring: "stroke-emerald-500" };
    if (rate >= 70) return { bg: "from-amber-50 to-yellow-100 dark:from-amber-950 dark:to-yellow-900", text: "text-amber-600 dark:text-amber-400", ring: "stroke-amber-500" };
    return { bg: "from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900", text: "text-rose-600 dark:text-rose-400", ring: "stroke-rose-500" };
  };

  const colors = getColor();

  return (
    <div className={`h-full rounded-2xl bg-gradient-to-br ${colors.bg} p-4 flex items-center gap-4`}>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Circular Progress */}
          <div className="relative flex-shrink-0">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                className="text-white/50 dark:text-white/10"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
                className={colors.ring}
                strokeDasharray={`${rate * 1.51} 151`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${colors.text}`}>{rate}%</span>
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <ClipboardCheck className={`h-4 w-4 ${colors.text}`} />
              <span className={`text-xs font-medium ${colors.text}`}>Посещаемость</span>
            </div>
            <div className={`text-[10px] ${colors.text} opacity-70`}>
              за неделю
            </div>
          </div>
        </>
      )}
    </div>
  );
}
