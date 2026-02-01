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
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg">Статистика учеников</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/students")}
          className="gap-1 rounded-xl"
        >
          Все ученики
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="space-y-3 flex-1 overflow-hidden min-h-0">
          {/* Total Count - Prominent */}
          <div className="rounded-xl p-5 bg-gradient-to-br from-primary/5 via-[hsl(var(--dashboard-accent-subtle))] to-accent/5 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between relative">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Всего учеников
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                  {total}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                <Users className="h-8 w-8 text-primary/60" />
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3 text-center bg-gradient-to-br from-[hsl(158,40%,96%)] to-[hsl(158,30%,94%)] shadow-sm transition-all hover:shadow-soft">
              <div className="mx-auto mb-2 w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-success" />
              </div>
              <div className="text-xl font-bold text-foreground">
                {students.active}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Активные</div>
            </div>

            <div className="rounded-xl p-3 text-center bg-gradient-to-br from-[hsl(262,40%,96%)] to-[hsl(262,30%,94%)] shadow-sm transition-all hover:shadow-soft">
              <div className="mx-auto mb-2 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xl font-bold text-foreground">
                {students.new}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Новые</div>
            </div>

            <div className="rounded-xl p-3 text-center bg-gradient-to-br from-[hsl(200,40%,96%)] to-[hsl(200,30%,94%)] shadow-sm transition-all hover:shadow-soft">
              <div className="mx-auto mb-2 w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                <Snowflake className="h-4 w-4 text-info" />
              </div>
              <div className="text-xl font-bold text-foreground">
                {students.frozen}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Заморожены</div>
            </div>
          </div>

          {/* New Students Notice - only if significant */}
          {students.new > 0 && students.new >= 5 && (
            <div className="rounded-xl p-3 bg-gradient-to-r from-primary/5 to-accent/5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-primary">
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

