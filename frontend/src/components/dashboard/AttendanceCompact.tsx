import { ClipboardCheck, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAttendanceChart } from "@/hooks/useData";
import { useTranslation } from "react-i18next";

export function AttendanceCompact() {
  const { data: attendanceData = [], isLoading } = useAttendanceChart("week");
  const { t } = useTranslation("dashboard");

  const safeData = Array.isArray(attendanceData) ? attendanceData : [];
  const totalAttended = safeData.reduce((sum, item) => sum + item.attended, 0);
  const totalMissed = safeData.reduce((sum, item) => sum + item.missed, 0);
  const total = totalAttended + totalMissed;
  const rate = total > 0 ? Math.round((totalAttended / total) * 100) : 0;

  // Determine color based on rate
  const getColor = () => {
    if (rate >= 90) return { ring: "stroke-emerald-500", accent: "emerald" };
    if (rate >= 70) return { ring: "stroke-amber-500", accent: "amber" };
    return { ring: "stroke-rose-500", accent: "rose" };
  };

  const colors = getColor();

  return (
    <div className="h-full rounded-2xl bg-card border border-border p-4 flex items-center gap-4">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Circular Progress */}
          <div className="relative flex-shrink-0">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                className="text-muted/30"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
                className={colors.ring}
                strokeDasharray={`${rate * 1.76} 176`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-foreground">{rate}%</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg bg-${colors.accent}-500/10`}>
                <ClipboardCheck className={`h-4 w-4 text-${colors.accent}-500`} />
              </div>
              <span className="font-semibold text-foreground text-sm">{t("attendance.title")}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                {totalAttended}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-rose-500" />
                {totalMissed}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
