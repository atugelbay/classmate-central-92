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
    <Card className="h-full flex flex-col overflow-hidden">
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
      <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
          {/* Revenue Today */}
          <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Доход сегодня</span>
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            </div>
            <div className="text-xl font-bold text-green-700 dark:text-green-400">
              {revenue.today.toLocaleString()} ₸
            </div>
          </div>

          {/* Revenue This Week */}
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Доход за неделю</span>
              <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
              {revenue.thisWeek.toLocaleString()} ₸
            </div>
          </div>

          {/* Revenue This Month */}
          <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Доход за месяц</span>
              <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-bold text-purple-700 dark:text-purple-400">
              {revenue.thisMonth.toLocaleString()} ₸
            </div>
          </div>

          {/* Debts - only show if there are debts */}
          {financial.pendingDebts > 0 && (
            <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-xs font-medium text-muted-foreground">Должников</span>
                  </div>
                  <div className="text-lg font-bold text-red-600">
                    {financial.pendingDebts}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {financial.totalDebtAmount.toLocaleString()} ₸
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

