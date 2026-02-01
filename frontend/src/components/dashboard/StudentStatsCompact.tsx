import { Users, TrendingUp, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";

export function StudentStatsCompact() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  const students = stats?.students || { active: 0, new: 0, frozen: 0 };
  const total = students.active + students.new + students.frozen;

  return (
    <div 
      className="h-full rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-950 dark:to-purple-900 p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] overflow-hidden"
      onClick={() => navigate("/students")}
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="p-1.5 rounded-lg bg-violet-500/20">
              <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            {students.new > 0 && (
              <div className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[10px] font-medium">+{students.new}</span>
              </div>
            )}
          </div>

          {/* Number */}
          <div>
            <div className="text-2xl font-bold text-violet-900 dark:text-violet-100 leading-none">
              {total}
            </div>
            <div className="text-[10px] text-violet-600 dark:text-violet-400">
              учеников
            </div>
          </div>
        </>
      )}
    </div>
  );
}
