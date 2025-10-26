import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Loader2,
  ArrowRight
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";

export function FinancialSummary() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const revenue = stats?.revenue || { today: 0, thisWeek: 0, thisMonth: 0 };
  const financial = stats?.financial || { totalBalance: 0, pendingDebts: 0, totalDebtAmount: 0 };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          <CardTitle>Финансовая сводка</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/finance")}
          className="gap-1"
        >
          Подробнее
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Revenue Today */}
          <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Доход сегодня</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {revenue.today.toLocaleString()} ₸
            </div>
          </div>

          {/* Revenue This Week */}
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Доход за неделю</span>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {revenue.thisWeek.toLocaleString()} ₸
            </div>
          </div>

          {/* Revenue This Month */}
          <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Доход за месяц</span>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {revenue.thisMonth.toLocaleString()} ₸
            </div>
          </div>

          {/* Total Balance */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Общий баланс</span>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className={`text-2xl font-bold ${
              financial.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {financial.totalBalance.toLocaleString()} ₸
            </div>
          </div>

          {/* Debts */}
          {financial.pendingDebts > 0 && (
            <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Должников</span>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {financial.pendingDebts}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Сумма: {financial.totalDebtAmount.toLocaleString()} ₸
                  </div>
                </div>
                <Badge variant="destructive">{financial.pendingDebts}</Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

