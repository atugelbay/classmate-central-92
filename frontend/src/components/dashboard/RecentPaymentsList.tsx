import { ArrowRight, Loader2, CreditCard, TrendingUp, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as financeApi from "@/api/finance";
import { PaymentTransaction } from "@/types";
import { useStudents } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";
import "moment/locale/kk";
import { useQuery } from "@tanstack/react-query";

export function RecentPaymentsList() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("dashboard");
  moment.locale(i18n.language);
  
  const { data: students = [] } = useStudents();
  
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: financeApi.getAllTransactions,
  });

  const recentTransactions = Array.isArray(transactions)
    ? [...transactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8)
    : [];

  return (
    <div className="h-full rounded-2xl bg-card border border-border p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10">
            <CreditCard className="h-5 w-5 text-amber-500" />
          </div>
          <span className="font-semibold text-foreground">{t("recentPayments.title")}</span>
        </div>
        <button 
          onClick={() => navigate("/finance")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("recentPayments.viewAll")} <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="p-3 rounded-full bg-muted mb-3">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              {i18n.language === 'kk' ? 'Төлемдер жоқ' : i18n.language === 'en' ? 'No payments' : 'Нет платежей'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((transaction: PaymentTransaction) => {
              const isPositive = transaction.type === "payment";
              const student = students.find((s) => s.id === transaction.studentId);
              const date = moment(transaction.createdAt);
              
              return (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => navigate("/finance")}
                >
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${isPositive ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">
                      {student?.name || (i18n.language === 'kk' ? 'Оқушы' : i18n.language === 'en' ? 'Student' : 'Ученик')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {date.format("D MMM, HH:mm")}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className={`font-semibold text-sm whitespace-nowrap ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                    {isPositive ? "+" : "-"}{Math.abs(transaction.amount).toLocaleString()} ₸
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
