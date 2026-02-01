import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { useAllBalances, useStudents } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";

export function DebtorsCompact() {
  const navigate = useNavigate();
  const { data: balances = [], isLoading: balancesLoading } = useAllBalances();
  const { data: students = [], isLoading: studentsLoading } = useStudents();

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
        .slice(0, 3)
    : [];

  const totalDebt = debtors.reduce((sum: number, d: any) => sum + Math.abs(d.balance), 0);

  return (
    <div 
      className="h-full rounded-2xl bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900 p-4 flex items-center gap-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
      onClick={() => navigate("/finance")}
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
        </div>
      ) : (
        <>
          {/* Icon */}
          <div className="p-2 rounded-xl bg-rose-500/20 flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="text-xs font-medium text-rose-700 dark:text-rose-300 mb-1">
              Задолженности
            </div>
            {debtors.length === 0 ? (
              <div className="text-sm text-rose-600/70 dark:text-rose-400/70">
                ✓ Нет
              </div>
            ) : (
              <div className="text-lg font-bold text-rose-700 dark:text-rose-300">
                -{totalDebt.toLocaleString()} ₸
              </div>
            )}
          </div>

          {debtors.length > 0 && (
            <ArrowRight className="h-4 w-4 text-rose-400 flex-shrink-0" />
          )}
        </>
      )}
    </div>
  );
}
