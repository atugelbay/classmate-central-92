import { Users, TrendingUp, Loader2, UserCheck, Snowflake, UserPlus } from "lucide-react";
import { useDashboardStats } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function StudentStatsCompact() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();
  const { t } = useTranslation("dashboard");

  const students = stats?.students || { active: 0, new: 0, frozen: 0 };
  const total = students.active + students.new + students.frozen;

  return (
    <div 
      className="h-full rounded-2xl bg-card border border-border p-4 flex flex-col cursor-pointer transition-all hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800"
      onClick={() => navigate("/students")}
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-violet-500">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-foreground text-sm">{t("stats.students")}</span>
            </div>
            {students.new > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">+{students.new}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="mb-3">
            <div className="text-3xl font-bold text-foreground">
              {total}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("stats.students").toLowerCase()}
            </div>
          </div>

          {/* Stats breakdown */}
          <div className="flex items-center gap-4 mt-auto">
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-muted-foreground">{students.active}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Snowflake className="h-3.5 w-3.5 text-sky-500" />
              <span className="text-xs text-muted-foreground">{students.frozen}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
