import { DollarSign, TrendingUp, ArrowRight, Loader2, Wallet, Calendar } from "lucide-react";
import { useDashboardStats } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function FinanceSummaryWide() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();
  const { t, i18n } = useTranslation("dashboard");

  const revenue = stats?.revenue || { today: 0, thisWeek: 0, thisMonth: 0 };

  // Translations
  const getIncomeText = () => {
    const texts = { ru: "Доходы", kk: "Кірістер", en: "Income" };
    return texts[i18n.language as 'ru' | 'kk' | 'en'] || texts.ru;
  };

  const getDetailsText = () => {
    const texts = { ru: "Подробнее", kk: "Толығырақ", en: "Details" };
    return texts[i18n.language as 'ru' | 'kk' | 'en'] || texts.ru;
  };

  return (
    <div 
      className="rounded-xl bg-card border border-border p-5 cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      onClick={() => navigate("/finance")}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-foreground">{getIncomeText()}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground transition-colors">
              {getDetailsText()} <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* Main metrics grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Today */}
            <div className="rounded-xl border border-border p-4 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                <Calendar className="h-3.5 w-3.5" />
                {t("common:today")}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {revenue.today.toLocaleString()}
                <span className="text-base font-medium text-muted-foreground ml-1">₸</span>
              </div>
            </div>

            {/* Week */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("common:week")}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {revenue.thisWeek.toLocaleString()}
                <span className="text-base font-medium text-muted-foreground ml-1">₸</span>
              </div>
            </div>

            {/* Month */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                <DollarSign className="h-3.5 w-3.5" />
                {t("common:month")}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {revenue.thisMonth.toLocaleString()}
                <span className="text-base font-medium text-muted-foreground ml-1">₸</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
