import { AlertTriangle, ArrowRight, Loader2, CheckCircle2, Users } from "lucide-react";
import { useAllBalances, useStudents } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function DebtorsCompact() {
  const navigate = useNavigate();
  const { data: balances = [], isLoading: balancesLoading } = useAllBalances();
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const { t, i18n } = useTranslation("dashboard");

  const isLoading = balancesLoading || studentsLoading;

  // Get students with negative balance
  const debtors = Array.isArray(balances) 
    ? balances
        .filter((b: any) => b.balance < 0)
        .map((b: any) => {
          const student = students.find((s: any) => s.id === b.studentId);
          return { ...b, student };
        })
        .sort((a: any, b: any) => a.balance - b.balance)
    : [];

  const totalDebt = debtors.reduce((sum: number, d: any) => sum + Math.abs(d.balance), 0);
  const debtorCount = debtors.length;

  // Translations
  const getNoDebtorsText = () => {
    const texts = { ru: "Нет должников", kk: "Борышкерлер жоқ", en: "No debtors" };
    return texts[i18n.language as 'ru' | 'kk' | 'en'] || texts.ru;
  };

  const getDebtsTitle = () => {
    const texts = { ru: "Задолженности", kk: "Борыштар", en: "Debts" };
    return texts[i18n.language as 'ru' | 'kk' | 'en'] || texts.ru;
  };

  return (
    <div 
      className="h-full rounded-2xl bg-card border border-border p-4 flex items-center gap-4 cursor-pointer transition-all hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-800"
      onClick={() => navigate("/finance")}
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
        </div>
      ) : debtors.length === 0 ? (
        <>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-foreground text-sm mb-1">
              {getDebtsTitle()}
            </div>
            <div className="text-sm text-emerald-600 dark:text-emerald-400">
              {getNoDebtorsText()}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="p-2.5 rounded-xl bg-rose-500 flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground text-sm">{getDebtsTitle()}</span>
            </div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
              -{totalDebt.toLocaleString()} ₸
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Users className="h-3 w-3" />
              {debtorCount}
            </div>
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </>
      )}
    </div>
  );
}
