import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Loader2, ArrowRight, UserCheck, Snowflake } from "lucide-react";
import { useDashboardStats } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";

export function StudentStatistics() {
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

  const students = stats?.students || { active: 0, new: 0, frozen: 0 };
  const total = students.active + students.new + students.frozen;

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
          <CardTitle>Статистика учеников</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/students")}
          className="gap-1"
        >
          Все ученики
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="space-y-3 flex-1 overflow-hidden min-h-0">
          {/* Total Count - Prominent */}
          <div className="rounded-lg border p-4" style={{ backgroundColor: 'hsl(var(--dashboard-accent-subtle))' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1.5">
                  Всего учеников
                </div>
                <div className="text-2xl font-bold text-primary">
                  {total}
                </div>
              </div>
              <Users className="h-10 w-10 text-primary opacity-20" />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-lg border p-2.5 text-center" style={{ backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))' }}>
              <UserCheck className="h-3.5 w-3.5 mx-auto mb-1.5" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
              <div className="text-lg font-bold">
                {students.active}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Активные</div>
            </div>

            <div className="rounded-lg border p-2.5 text-center" style={{ backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))' }}>
              <UserPlus className="h-3.5 w-3.5 mx-auto mb-1.5" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
              <div className="text-lg font-bold">
                {students.new}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Новые</div>
            </div>

            <div className="rounded-lg border p-2.5 text-center" style={{ backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))' }}>
              <Snowflake className="h-3.5 w-3.5 mx-auto mb-1.5" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
              <div className="text-lg font-bold">
                {students.frozen}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Заморожены</div>
            </div>
          </div>

          {/* New Students Notice - only if significant */}
          {students.new > 0 && students.new >= 5 && (
            <div className="rounded-lg border p-2.5" style={{ backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))' }}>
              <div className="flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
                <div className="text-xs">
                  <span className="font-semibold">
                    {students.new} новых
                  </span>
                  <span className="text-muted-foreground"> за месяц</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

