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
          <Users className="h-5 w-5 text-primary" />
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
        <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
          {/* Total Count - Prominent */}
          <div className="rounded-lg border bg-gradient-to-r from-primary/10 to-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Всего учеников
                </div>
                <div className="text-2xl font-bold text-primary">
                  {total}
                </div>
              </div>
              <Users className="h-10 w-10 text-primary/20" />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-center">
              <UserCheck className="h-4 w-4 mx-auto mb-1.5 text-green-600" />
              <div className="text-xl font-bold text-green-700 dark:text-green-400">
                {students.active}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Активные</div>
            </div>

            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
              <UserPlus className="h-4 w-4 mx-auto mb-1.5 text-blue-600" />
              <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                {students.new}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Новые</div>
            </div>

            <div className="rounded-lg border bg-slate-50 dark:bg-slate-950/20 p-3 text-center">
              <Snowflake className="h-4 w-4 mx-auto mb-1.5 text-slate-600" />
              <div className="text-xl font-bold text-slate-700 dark:text-slate-400">
                {students.frozen}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Заморожены</div>
            </div>
          </div>

          {/* New Students Notice - only if significant */}
          {students.new > 0 && students.new >= 5 && (
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-2.5">
              <div className="flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
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

