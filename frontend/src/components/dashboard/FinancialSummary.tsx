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
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
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
        <div className="space-y-3 flex-1 overflow-hidden min-h-0">
          {/* Revenue Today */}
          <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Доход сегодня</span>
              <TrendingUp className="h-3 w-3" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
            </div>
            <div className="text-xl font-bold text-primary">
              {revenue.today.toLocaleString()} ₸
            </div>
          </div>

          {/* Revenue This Week */}
          <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Доход за неделю</span>
              <TrendingUp className="h-3 w-3" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
            </div>
            <div className="text-xl font-bold text-primary">
              {revenue.thisWeek.toLocaleString()} ₸
            </div>
          </div>

          {/* Revenue This Month */}
          <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Доход за месяц</span>
              <TrendingUp className="h-3 w-3" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
            </div>
            <div className="text-xl font-bold text-primary">
              {revenue.thisMonth.toLocaleString()} ₸
            </div>
          </div>

          {/* Debts - only show if there are debts */}
          {financial.pendingDebts > 0 && (
            <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--dashboard-stat-negative-bg))' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle className="h-3 w-3" style={{ color: 'hsl(var(--dashboard-stat-negative))' }} />
                    <span className="text-xs font-medium text-muted-foreground">Должников</span>
                  </div>
                  <div className="text-base font-bold" style={{ color: 'hsl(var(--dashboard-stat-negative))' }}>
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

