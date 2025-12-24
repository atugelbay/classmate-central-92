import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, DollarSign } from "lucide-react";
import * as financeApi from "@/api/finance";
import { PaymentTransaction } from "@/types";
import { useStudents } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";
import { useQuery } from "@tanstack/react-query";

moment.locale("ru");

export function RecentPayments() {
  const navigate = useNavigate();
  const { data: students = [] } = useStudents();
  
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: financeApi.getAllTransactions,
  });

  // Sort by date (newest first) and take last 4
  const recentTransactions = Array.isArray(transactions)
    ? [...transactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4)
    : [];

  const getTypeColor = (type: string) => {
    return "border";
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "payment":
        return { 
          backgroundColor: 'hsl(var(--dashboard-stat-positive-bg))',
          color: 'hsl(var(--dashboard-stat-positive))'
        };
      case "refund":
        return { 
          backgroundColor: 'hsl(var(--dashboard-stat-negative-bg))',
          color: 'hsl(var(--dashboard-stat-negative))'
        };
      case "fee":
        return { 
          backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))',
          color: 'hsl(var(--dashboard-stat-neutral))'
        };
      default:
        return { 
          backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))',
          color: 'hsl(var(--dashboard-stat-neutral))'
        };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "payment":
        return "Платёж";
      case "refund":
        return "Возврат";
      case "debt":
        return "Долг";
      default:
        return type;
    }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
          <CardTitle>Последние платежи</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/finance")}
          className="gap-1"
        >
          Все платежи
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <DollarSign className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Нет платежей</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden min-h-0 space-y-2.5">
            {recentTransactions.map((transaction: PaymentTransaction) => {
              const isPositive = transaction.type === "payment";
              const date = moment(transaction.createdAt);
              const student = students.find((s) => s.id === transaction.studentId);
              const studentName = student?.name || "Неизвестный ученик";
              
              return (
                <div
                  key={transaction.id}
                  className="rounded-lg border p-2.5 transition-all hover:shadow-md cursor-pointer"
                  onClick={() => navigate("/finance")}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-semibold text-sm truncate">
                          {studentName}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${getTypeColor(transaction.type)}`}
                          style={getTypeStyle(transaction.type)}
                        >
                          {getTypeLabel(transaction.type)}
                        </Badge>
                      </div>
                      {transaction.description && (
                        <p className="text-xs text-muted-foreground truncate mb-0.5">
                          {transaction.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {date.format("D MMM, HH:mm")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-3">
                      <div
                        className="text-base font-bold"
                        style={{ color: isPositive ? 'hsl(var(--dashboard-stat-positive))' : 'hsl(var(--dashboard-stat-negative))' }}
                      >
                        {isPositive ? "+" : "-"}
                        {Math.abs(transaction.amount).toLocaleString()} ₸
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

