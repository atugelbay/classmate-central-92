import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
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
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg">Финансовая сводка</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/finance")}
          className="gap-1 rounded-xl"
        >
          Подробнее
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="space-y-3 flex-1 overflow-hidden min-h-0">
          {/* Revenue Today */}
          <div className="rounded-xl p-4 bg-gradient-to-br from-[hsl(var(--dashboard-stat-neutral-bg))] to-[hsl(270,30%,97%)] shadow-sm transition-all hover:shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Доход сегодня</span>
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-3 w-3 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              {revenue.today.toLocaleString()} ₸
            </div>
          </div>

          {/* Revenue This Week */}
          <div className="rounded-xl p-4 bg-gradient-to-br from-[hsl(var(--dashboard-stat-neutral-bg))] to-[hsl(270,30%,97%)] shadow-sm transition-all hover:shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Доход за неделю</span>
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-3 w-3 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              {revenue.thisWeek.toLocaleString()} ₸
            </div>
          </div>

          {/* Revenue This Month */}
          <div className="rounded-xl p-4 bg-gradient-to-br from-[hsl(var(--dashboard-stat-neutral-bg))] to-[hsl(270,30%,97%)] shadow-sm transition-all hover:shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Доход за месяц</span>
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-3 w-3 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              {revenue.thisMonth.toLocaleString()} ₸
            </div>
          </div>

          {/* Debts - only show if there are debts */}
          {financial.pendingDebts > 0 && (
            <div className="rounded-xl p-4 bg-gradient-to-br from-[hsl(var(--dashboard-stat-negative-bg))] to-[hsl(0,40%,97%)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-destructive/10">
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Должников</span>
                  </div>
                  <div className="text-xl font-bold text-destructive">
                    {financial.pendingDebts}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
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

