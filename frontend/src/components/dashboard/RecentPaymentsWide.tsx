import { ArrowRight, Loader2, CreditCard } from "lucide-react";
import * as financeApi from "@/api/finance";
import { PaymentTransaction } from "@/types";
import { useStudents } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";
import { useQuery } from "@tanstack/react-query";

moment.locale("ru");

export function RecentPaymentsWide() {
  const navigate = useNavigate();
  const { data: students = [] } = useStudents();
  
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: financeApi.getAllTransactions,
  });

  const recentTransactions = Array.isArray(transactions)
    ? [...transactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    : [];

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <CreditCard className="h-4 w-4 text-amber-500" />
          </div>
          <span className="font-medium text-foreground">Последние платежи</span>
        </div>
        <button 
          onClick={() => navigate("/finance")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Все <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : recentTransactions.length === 0 ? (
        <div className="flex items-center justify-center text-muted-foreground text-sm py-4">
          Нет платежей
        </div>
      ) : (
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {recentTransactions.map((transaction: PaymentTransaction) => {
            const isPositive = transaction.type === "payment";
            const student = students.find((s) => s.id === transaction.studentId);
            const date = moment(transaction.createdAt);
            
            return (
              <div
                key={transaction.id}
                className={`flex-shrink-0 px-3 py-2 rounded-lg min-w-[120px] transition-all hover:scale-[1.02] cursor-pointer ${
                  isPositive 
                    ? "bg-emerald-500/10 hover:bg-emerald-500/15" 
                    : "bg-rose-500/10 hover:bg-rose-500/15"
                }`}
                onClick={() => navigate("/finance")}
              >
                <div className={`text-base font-semibold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                  {isPositive ? "+" : "-"}{Math.abs(transaction.amount).toLocaleString()} ₸
                </div>
                <div className="text-xs text-foreground/70 truncate">
                  {student?.name || "Ученик"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {date.format("D MMM")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
