import { DollarSign, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";

export function FinanceSummaryWide() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  const revenue = stats?.revenue || { today: 0, thisWeek: 0, thisMonth: 0 };

  return (
    <div 
      className="h-full rounded-3xl bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950 p-5 flex items-center cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]"
      onClick={() => navigate("/finance")}
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          {/* Icon */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg mr-5">
            <DollarSign className="h-6 w-6 text-white" />
          </div>

          {/* Main metric */}
          <div className="flex-1">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
              Доход сегодня
            </div>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {revenue.today.toLocaleString()} ₸
            </div>
          </div>

          {/* Secondary metrics */}
          <div className="hidden sm:flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Неделя</div>
              <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                {revenue.thisWeek.toLocaleString()} ₸
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Месяц</div>
              <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                {revenue.thisMonth.toLocaleString()} ₸
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="ml-4 p-2 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
            <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        </>
      )}
    </div>
  );
}
